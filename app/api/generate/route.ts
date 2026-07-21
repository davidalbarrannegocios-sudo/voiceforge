import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { log } from "@/lib/logger";

import { getEffectivePlan } from "@/lib/plan";

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

  const { text, reference_id, prosody, voiceName, model, temperature, topP, normalizeLoudness, normalizeText, mp3Bitrate } = await req.json();
  console.log("[generate] prosody del request:", JSON.stringify(prosody));

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const trimmed = text.trim();

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const effectivePlan = await getEffectivePlan(user.id, user.plan);

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

    // Free plan: only allow voices from the free tier
    const effectiveReferenceId: string | undefined = reference_id || undefined;

    const expiresAt = getExpiresAt(effectivePlan);
    const resolvedVoiceName = (voiceName as string | undefined) ?? "Voz por defecto";

    // ── Step 1: deduct credits + create records atomically BEFORE Fish Audio ──
    const [, generation, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
      }),
      prisma.generation.create({
        data: {
          userId: user.id,
          status: "processing",
          text: trimmed,
          voiceId: effectiveReferenceId ?? "default",
          voiceName: resolvedVoiceName,
          creditsUsed: charCost,
          expiresAt,
        },
      }),
      prisma.job.create({
        data: {
          userId: user.id,
          status: "processing",
          text: trimmed,
          voiceId: effectiveReferenceId ?? "default",
          voiceName: resolvedVoiceName,
          creditsUsed: charCost,
          expiresAt,
        },
      }),
    ]);

    console.log(`[generate] generationId=${generation.id} jobId=${job.id} chars=${trimmed.length} plan=${user.plan}`);
    log("info", "credits", "credits deducted", { userId: user.id, chars: trimmed.length, creditsUsed: charCost, voiceName: resolvedVoiceName, plan: user.plan }, user.id);

    // ── Step 2: call Fish Audio (no client signal — completes even if client disconnects) ──
    let result;
    try {
      result = await fishAudioGenerate({
        text: trimmed,
        referenceId: effectiveReferenceId,
        userId: user.id,
        // Intentionally no req.signal: Fish Audio must finish even if client navigates away.
        // The generation record in DB will be updated to status="done" regardless.
        prosody: prosody ?? undefined,
        model: typeof model === "string" ? model : undefined,
        temperature: typeof temperature === "number" ? temperature : undefined,
        topP: typeof topP === "number" ? topP : undefined,
        normalizeLoudness: typeof normalizeLoudness === "boolean" ? normalizeLoudness : undefined,
        normalizeText: typeof normalizeText === "boolean" ? normalizeText : undefined,
        mp3Bitrate: typeof mp3Bitrate === "number" ? mp3Bitrate : undefined,
      });
    } catch (fishErr) {
      const errMsg = fishErr instanceof Error ? fishErr.message : String(fishErr);
      console.error(`[generate] Fish Audio error:`, {
        message: errMsg,
        voiceId: effectiveReferenceId ?? "default",
        textLength: trimmed.length,
        userId: user.id,
        generationId: generation.id,
      });

      // ── Refund credits + mark as error ──
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } },
        }),
        prisma.generation.update({
          where: { id: generation.id },
          data: { status: "error", error: errMsg },
        }),
        prisma.job.update({
          where: { id: job.id },
          data: { status: "failed", error: errMsg },
        }),
      ]);

      log("info", "credits", "credits refunded — generation error", { userId: user.id, creditsRefunded: charCost, fromPlan, fromExtra }, user.id);
      return NextResponse.json({
        error: "Error al generar el audio. Tus créditos han sido devueltos automáticamente.",
        detail: errMsg,
      }, { status: 500 });
    }

    // ── Step 3: Fish Audio succeeded — update both records ───────────────────
    await prisma.$transaction([
      prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "done",
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
        },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: "completed",
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
        },
      }),
    ]);

    return NextResponse.json({
      generationId: generation.id,
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
