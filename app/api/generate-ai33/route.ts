import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/plan";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
// No maxDuration — returns immediately; Algrow generation runs as fire-and-forget background task

function getExpiresAt(plan: string): Date {
  const now = new Date();
  if (plan === "free")       return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  if (plan === "starter")    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (plan === "enterprise") return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

async function algrowPoll(
  jobId: string,
  apiKey: string,
): Promise<{ audio_url: string; duration_seconds: number }> {
  const MAX_ATTEMPTS = 60;
  const POLL_INTERVAL_MS = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`https://api.algrow.online/api/job-status/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`Algrow polling error ${pollRes.status} tras ${MAX_ATTEMPTS} intentos`);
      continue;
    }

    const data = await pollRes.json() as { status: string; audio_url?: string; error?: string };

    if (data.status === "completed") {
      if (!data.audio_url) throw new Error("Algrow: job completado pero sin audio_url");
      return { audio_url: data.audio_url, duration_seconds: 0 };
    }

    if (data.status === "failed") {
      throw new Error(`Algrow: job fallido — ${data.error ?? "error desconocido"}`);
    }
    // pending | processing → keep polling
  }

  throw new Error(`Algrow: timeout tras ${MAX_ATTEMPTS} intentos (${(MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s)`);
}

interface GenerateOptions {
  model_id?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  temperature?: number;
  speaking_rate?: number;
  stealth_model?: string;
  pitch?: number;
  volume?: number;
}

async function algrowGenerate(
  voiceId: string,
  text: string,
  provider: "elevenlabs" | "stealth" | "minimax",
  apiKey: string,
  options: GenerateOptions = {},
): Promise<{ audio_url: string; duration_seconds: number }> {
  const form = new FormData();
  form.append("script", text);
  form.append("voice_id", voiceId);
  form.append("provider", provider);

  if (provider === "elevenlabs") {
    if (options.model_id != null)          form.append("model_id",          options.model_id);
    if (options.stability != null)         form.append("stability",          String(options.stability));
    if (options.similarity_boost != null)  form.append("similarity_boost",   String(options.similarity_boost));
    if (options.style != null)             form.append("style",              String(options.style));
    if (options.speed != null)             form.append("speed",              String(options.speed));
  } else if (provider === "stealth") {
    form.append("temperature",   String(options.temperature   ?? 1.1));
    form.append("speaking_rate", String(options.speaking_rate ?? 1.0));
    form.append("stealth_model", String(options.stealth_model ?? "1.5"));
  } else if (provider === "minimax") {
    if (options.speed != null) form.append("speed",  String(options.speed));
    form.append("pitch",  String(options.pitch  ?? 0));
    form.append("volume", String(options.volume ?? 1.0));
  }

  const ttsRes = await fetch("https://api.algrow.online/api/generate-simple", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    throw new Error(`Algrow error ${ttsRes.status}: ${errText}`);
  }

  const { job_id } = await ttsRes.json() as { success: boolean; job_id: string };
  if (!job_id) throw new Error("Algrow no devolvió job_id");

  return algrowPoll(job_id, apiKey);
}

async function processJobInBackground(
  jobId: string,
  userId: string,
  voiceId: string,
  voiceName: string,
  text: string,
  provider: "elevenlabs" | "stealth" | "minimax",
  apiKey: string,
  modelId: string,
  fromPlan: number,
  fromExtra: number,
  effectivePlan: string,
  options: GenerateOptions = {},
) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  try {
    const result = await algrowGenerate(voiceId, text, provider, apiKey, { ...options, model_id: modelId });
    const expiresAt = getExpiresAt(effectivePlan);

    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "done", audioUrl: result.audio_url },
      }),
      prisma.generation.create({
        data: {
          userId,
          status: "done",
          text,
          voiceId,
          voiceName,
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
          creditsUsed: fromPlan + fromExtra,
          expiresAt,
        },
      }),
    ]);

    console.log(`[generate-ai33] bg done jobId=${jobId}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[generate-ai33] bg error jobId=${jobId}:`, errMsg);

    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "error", errorMsg: errMsg },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } },
      }),
    ]);
    log("info", "credits", "credits refunded — generation error", { userId, creditsRefunded: fromPlan + fromExtra, fromPlan, fromExtra, jobId }, userId);
  }
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const {
    text, voice_id, voiceName,
    provider = "elevenlabs", model_id = "eleven_multilingual_v2",
    stability, similarity_boost, style, speed,
    temperature, speaking_rate, stealth_model,
    pitch, volume,
  } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const trimmed = text.trim();
  const voiceId = (voice_id as string | undefined) || "default";
  const resolvedVoiceName = (voiceName as string | undefined) ?? "Voz por defecto";
  const resolvedProvider = (["elevenlabs", "stealth", "minimax"].includes(provider) ? provider : "elevenlabs") as "elevenlabs" | "stealth" | "minimax";

  const apiKey = process.env.ALGROW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ALGROW_API_KEY no configurada" }, { status: 500 });

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const effectivePlan = await getEffectivePlan(user.id, user.plan);

    // Stealth 2.0 costs 2x characters
    const isStealthPro = resolvedProvider === "stealth" && stealth_model === "2.0";
    const charCost = Math.ceil(trimmed.length * 0.5 * (isStealthPro ? 2 : 1));
    const totalAvailable = user.credits + user.extraCredits;

    if (totalAvailable < charCost) {
      return NextResponse.json(
        { error: "Caracteres insuficientes", charCost, charsAvailable: totalAvailable },
        { status: 402 }
      );
    }

    const fromPlan = Math.min(user.credits, charCost);
    const fromExtra = charCost - fromPlan;

    const [, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
      }),
      prisma.generationJob.create({
        data: {
          userId: user.id,
          status: "pending",
          text: trimmed,
          voiceId,
          voiceName: resolvedVoiceName,
          creditsUsed: charCost,
          fromPlan,
          fromExtra,
          fishParams: { provider: resolvedProvider, model_id: model_id as string },
        },
      }),
    ]);

    console.log(`[generate-ai33] created jobId=${job.id} provider=${resolvedProvider} chars=${trimmed.length} voiceId=${voiceId}`);
    log("info", "credits", "credits deducted", { userId: user.id, chars: trimmed.length, creditsUsed: charCost, voiceName: resolvedVoiceName, plan: user.plan }, user.id);

    const bgOptions: GenerateOptions = { stability, similarity_boost, style, speed, temperature, speaking_rate, stealth_model, pitch, volume };

    // Fire and forget — Algrow generation runs in background; client receives jobId immediately
    processJobInBackground(
      job.id, user.id, voiceId, resolvedVoiceName, trimmed,
      resolvedProvider, apiKey, model_id as string,
      fromPlan, fromExtra, effectivePlan, bgOptions,
    ).catch((err) => console.error("[generate-ai33] unhandled bg error:", err));

    return NextResponse.json({
      jobId: job.id,
      charCost,
      charsRemaining: totalAvailable - charCost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-ai33] error:", message);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
