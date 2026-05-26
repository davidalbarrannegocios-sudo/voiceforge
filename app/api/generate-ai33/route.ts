import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 300;

function getExpiresAt(plan: string): Date {
  const now = new Date();
  if (plan === "free")       return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  if (plan === "starter")    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (plan === "enterprise") return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

async function ai33Poll(
  taskId: string,
  apiKey: string,
  signal: AbortSignal
): Promise<{ audio_url: string; duration_seconds: number }> {
  const MAX_ATTEMPTS = 60;
  const POLL_INTERVAL_MS = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new Error("Generación cancelada");

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
      headers: { "xi-api-key": apiKey },
      signal,
    });

    if (!pollRes.ok) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`ai33.pro polling error ${pollRes.status} tras ${MAX_ATTEMPTS} intentos`);
      continue;
    }

    const taskData = (await pollRes.json()) as {
      status: string;
      metadata?: { audio_url?: string; duration_seconds?: number };
    };

    if (taskData.status === "done") {
      const audioUrl = taskData.metadata?.audio_url;
      if (!audioUrl) throw new Error("ai33.pro: tarea completada pero la respuesta no incluye audio_url");
      return { audio_url: audioUrl, duration_seconds: taskData.metadata?.duration_seconds ?? 0 };
    }

    if (taskData.status === "error" || taskData.status === "failed") {
      throw new Error(`ai33.pro: la tarea falló en el servidor remoto (status=${taskData.status})`);
    }
  }

  throw new Error(`ai33.pro: timeout tras ${MAX_ATTEMPTS} intentos (${(MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s)`);
}

async function ai33Generate(
  voiceId: string,
  text: string,
  provider: "elevenlabs" | "minimax",
  apiKey: string,
  signal: AbortSignal
): Promise<{ audio_url: string; duration_seconds: number }> {
  let ttsRes: Response;

  if (provider === "minimax") {
    ttsRes = await fetch("https://api.ai33.pro/v1m/task/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({
        text,
        model: "speech-2.6-hd",
        voice_setting: { voice_id: voiceId, vol: 1, pitch: 0, speed: 1 },
      }),
      signal,
    });
  } else {
    ttsRes = await fetch(`https://api.ai33.pro/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
      signal,
    });
  }

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    throw new Error(`ai33.pro error ${ttsRes.status}: ${errText}`);
  }

  const { task_id } = (await ttsRes.json()) as { task_id: string };
  if (!task_id) throw new Error("ai33.pro no devolvió task_id");

  return ai33Poll(task_id, apiKey, signal);
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { text, voice_id, voiceName, provider = "elevenlabs" } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const trimmed = text.trim();
  const voiceId = (voice_id as string | undefined) || "default";
  const resolvedProvider = (provider === "minimax" ? "minimax" : "elevenlabs") as "elevenlabs" | "minimax";

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const effectivePlan = await getEffectivePlan(user.id, user.plan);
    const charCost = Math.ceil(trimmed.length * 0.5); // 0.5 créditos por carácter (vs 1 en EliteLabs)
    const totalAvailable = user.credits + user.extraCredits;

    if (totalAvailable < charCost) {
      return NextResponse.json(
        { error: "Caracteres insuficientes", charCost, charsAvailable: totalAvailable },
        { status: 402 }
      );
    }

    const fromPlan  = Math.min(user.credits, charCost);
    const fromExtra = charCost - fromPlan;
    const expiresAt = getExpiresAt(effectivePlan);

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
          voiceId,
          voiceName: (voiceName as string | undefined) ?? "Voz por defecto",
          creditsUsed: charCost,
          expiresAt,
        },
      }),
    ]);

    console.log(`[generate-ai33] jobId=${job.id} provider=${resolvedProvider} chars=${trimmed.length} voiceId=${voiceId}`);

    let result: { audio_url: string; duration_seconds: number };
    try {
      result = await ai33Generate(voiceId, trimmed, resolvedProvider, apiKey, req.signal);
    } catch (err) {
      const isAbort = req.signal.aborted;
      const errMsg = isAbort ? "Generación cancelada" : (err instanceof Error ? err.message : String(err));
      if (!isAbort) console.error(`[generate-ai33] failed:`, errMsg);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } },
        }),
        prisma.job.update({ where: { id: job.id }, data: { status: "failed", error: errMsg } }),
      ]);
      return NextResponse.json(
        { error: isAbort ? "Generación cancelada" : "Error al generar audio", detail: errMsg },
        { status: 500 }
      );
    }

    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: { status: "completed", audioUrl: result.audio_url, durationSeconds: result.duration_seconds },
      }),
      prisma.generation.create({
        data: {
          userId: user.id,
          text: trimmed,
          voiceId,
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
    console.error("[generate-ai33] unhandled error:", message);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
