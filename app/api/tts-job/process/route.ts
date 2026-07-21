import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { getEffectivePlan } from "@/lib/plan";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

function getExpiresAt(plan: string): Date {
  const now = new Date();
  if (plan === "free")     return new Date(now.getTime() + 72 * 60 * 60 * 1000);        // 72h
  if (plan === "creator")  return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);   // 14d
  if (plan === "starter")  return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);   // 14d
  if (plan === "plus")     return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);   // 30d
  if (plan === "pro")      return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);   // 60d
  if (plan === "elite")    return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);   // 90d
  if (plan === "enterprise") return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90d
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId requerido" }, { status: 400 });

  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });

  // Verify ownership
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user || user.id !== job.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Idempotent: already processed
  if (job.status !== "pending") {
    return NextResponse.json({ ok: true, status: job.status });
  }

  const startTime = Date.now();

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  const params = job.fishParams as Record<string, unknown> | null ?? {};

  let result;
  try {
    result = await fishAudioGenerate({
      text: job.text,
      referenceId: (params.referenceId as string | undefined) ?? undefined,
      userId: job.userId,
      // No signal — Fish Audio must complete even if client disconnects
      prosody: (params.prosody as { speed?: number; volume?: number } | undefined) ?? undefined,
      model: typeof params.model === "string" ? params.model : "speech-1.6",
      temperature: typeof params.temperature === "number" ? params.temperature : undefined,
      topP: typeof params.topP === "number" ? params.topP : undefined,
      normalizeLoudness: typeof params.normalizeLoudness === "boolean" ? params.normalizeLoudness : undefined,
      normalizeText: typeof params.normalizeText === "boolean" ? params.normalizeText : undefined,
      mp3Bitrate: typeof params.mp3Bitrate === "number" ? params.mp3Bitrate : undefined,
    });
  } catch (fishErr) {
    const errMsg = fishErr instanceof Error ? fishErr.message : String(fishErr);
    const userMessage = errMsg.includes("VOICE_OVERLOAD")
      ? "El servicio de síntesis de voz está experimentando alta demanda en este momento. Por favor, inténtalo de nuevo en unos minutos."
      : errMsg;

    await log("error", "tts-job", `error jobId=${jobId} userId=${job.userId}`, { jobId, userId: job.userId, error: errMsg, chars: job.text.length, voiceName: job.voiceName }, job.userId);

    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "error", errorMsg: userMessage },
      }),
      prisma.user.update({
        where: { id: job.userId },
        data: {
          credits: { increment: job.fromPlan },
          extraCredits: { increment: job.fromExtra },
        },
      }),
    ]);
    log("info", "credits", "credits refunded — generation error", { userId: job.userId, creditsRefunded: job.creditsUsed, jobId: job.id }, job.userId);

    return NextResponse.json({ ok: false, error: userMessage }, { status: 500 });
  }

  const effectivePlan = await getEffectivePlan(user.id, user.plan);
  const expiresAt = getExpiresAt(effectivePlan);

  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "done", audioUrl: result.audio_url },
    }),
    prisma.generation.create({
      data: {
        userId: job.userId,
        status: "done",
        text: job.text,
        voiceId: job.voiceId,
        voiceName: job.voiceName,
        audioUrl: result.audio_url,
        durationSeconds: result.duration_seconds,
        creditsUsed: job.creditsUsed,
        expiresAt,
      },
    }),
  ]);

  await log("info", "tts-job", `done jobId=${jobId} userId=${job.userId}`, { jobId, userId: job.userId, chars: job.text.length, voiceName: job.voiceName, audioUrl: result.audio_url, durationMs: Date.now() - startTime }, job.userId);
  return NextResponse.json({ ok: true, status: "done", audioUrl: result.audio_url });
}
