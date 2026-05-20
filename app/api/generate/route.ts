import { currentUser } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { text, reference_id } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const charCost = calculateCharCost(text.trim().length);

  if (user.credits < charCost) {
    return NextResponse.json(
      { error: "Caracteres insuficientes", charCost, charsAvailable: user.credits },
      { status: 402 }
    );
  }

  // Deduct credits and create job atomically
  const [, job] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: charCost } },
    }),
    prisma.job.create({
      data: {
        userId: user.id,
        status: "pending",
        text: text.trim(),
        voiceId: reference_id ?? "default",
        creditsUsed: charCost,
      },
    }),
  ]);

  // Process audio after response is sent
  after(async () => {
    try {
      await prisma.job.update({ where: { id: job.id }, data: { status: "processing" } });

      const result = await fishAudioGenerate({
        text: text.trim(),
        referenceId: reference_id ?? undefined,
        userId: user.id,
      });

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
            text: text.trim(),
            voiceId: reference_id ?? "default",
            audioUrl: result.audio_url,
            durationSeconds: result.duration_seconds,
            creditsUsed: charCost,
          },
        }),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Job] Failed — jobId=${job.id} userId=${user.id} chars=${text.trim().length} error=${message}`);
      await prisma.$transaction([
        prisma.job.update({
          where: { id: job.id },
          data: { status: "failed", error: message },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: charCost } },
        }),
      ]);
    }
  });

  return NextResponse.json({ jobId: job.id, charCost, charsRemaining: user.credits - charCost });
}
