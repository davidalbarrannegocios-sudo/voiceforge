import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

function getExpiresAt(plan: string): Date {
  const now = new Date();
  if (plan === "free")       return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  if (plan === "starter")    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (plan === "enterprise") return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

async function getRandomPublicVoiceId(): Promise<string | undefined> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return undefined;
  try {
    const res = await fetch(
      "https://api.fish.audio/model?page_size=20&page_number=1&sort_by=task_count&language=es",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const voices: { _id: string }[] = data.items ?? [];
    if (voices.length === 0) return undefined;
    return voices[Math.floor(Math.random() * voices.length)]._id;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { text, reference_id, prosody } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const trimmed = text.trim();

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const charCost = calculateCharCost(trimmed.length);
    const totalAvailable = user.credits + user.extraCredits;

    if (totalAvailable < charCost) {
      return NextResponse.json(
        { error: "Caracteres insuficientes", charCost, charsAvailable: totalAvailable },
        { status: 402 }
      );
    }

    // Plan credits consumed first, extra credits as overflow
    const fromPlan  = Math.min(user.credits, charCost);
    const fromExtra = charCost - fromPlan;

    // Free plan: ignore requested voice, use a random public voice
    let effectiveReferenceId: string | undefined = reference_id || undefined;
    if (user.plan === "free") {
      effectiveReferenceId = await getRandomPublicVoiceId();
    }

    const expiresAt = getExpiresAt(user.plan);

    const [, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
      }),
      prisma.job.create({
        data: {
          userId: user.id,
          status: "processing",
          text: trimmed,
          voiceId: effectiveReferenceId ?? "default",
          creditsUsed: charCost,
          expiresAt,
        },
      }),
    ]);

    console.log(`[generate] jobId=${job.id} chars=${trimmed.length} plan=${user.plan}`);

    let result;
    try {
      result = await fishAudioGenerate({
        text: trimmed,
        referenceId: effectiveReferenceId,
        userId: user.id,
        signal: req.signal,
        prosody: prosody ?? undefined,
      });
    } catch (fishErr) {
      const isAbort = req.signal.aborted;
      const errMsg = isAbort ? "Generación cancelada" : (fishErr instanceof Error ? fishErr.message : String(fishErr));
      if (isAbort) {
        console.log(`[generate] client disconnected — refunding jobId=${job.id}`);
      } else {
        console.error(`[generate] Fish Audio failed:`, errMsg);
      }
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } }),
        prisma.job.update({ where: { id: job.id }, data: { status: "failed", error: errMsg } }),
      ]);
      return NextResponse.json({ error: isAbort ? "Generación cancelada" : "Error al generar audio", detail: errMsg }, { status: 500 });
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
          voiceId: effectiveReferenceId ?? "default",
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
          creditsUsed: charCost,
          expiresAt,
        },
      }),
    ]);

    return NextResponse.json({
      jobId: job.id,
      audioUrl: result.audio_url,
      durationSeconds: result.duration_seconds,
      charCost,
      charsRemaining: totalAvailable - charCost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled error:", message);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
