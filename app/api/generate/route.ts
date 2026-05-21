import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { text, reference_id } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const trimmed = text.trim();

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const charCost = calculateCharCost(trimmed.length);

    if (user.credits < charCost) {
      return NextResponse.json(
        { error: "Caracteres insuficientes", charCost, charsAvailable: user.credits },
        { status: 402 }
      );
    }

    const [, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: charCost } },
      }),
      prisma.job.create({
        data: {
          userId: user.id,
          status: "processing",
          text: trimmed,
          voiceId: reference_id ?? "default",
          creditsUsed: charCost,
        },
      }),
    ]);

    console.log(`[generate] jobId=${job.id} chars=${trimmed.length}`);

    let result;
    try {
      result = await fishAudioGenerate({
        text: trimmed,
        referenceId: reference_id || undefined,
        userId: user.id,
      });
    } catch (fishErr) {
      const errMsg = fishErr instanceof Error ? fishErr.message : String(fishErr);
      console.error(`[generate] Fish Audio failed:`, errMsg);
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { credits: { increment: charCost } } }),
        prisma.job.update({ where: { id: job.id }, data: { status: "failed", error: errMsg } }),
      ]);
      return NextResponse.json({ error: "Error al generar audio", detail: errMsg }, { status: 500 });
    }

    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: "completed",
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
        },
      }),
      prisma.generation.create({
        data: {
          userId: user.id,
          text: trimmed,
          voiceId: reference_id ?? "default",
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
          creditsUsed: charCost,
        },
      }),
    ]);

    return NextResponse.json({
      jobId: job.id,
      audioUrl: result.audio_url,
      durationSeconds: result.duration_seconds,
      charCost,
      charsRemaining: user.credits - charCost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled error:", message);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
