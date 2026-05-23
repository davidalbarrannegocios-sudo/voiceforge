import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { FREE_VOICE_IDS } from "@/lib/free-voice-ids";
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

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { text, reference_id, prosody, voiceName } = await req.json();
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

    // Free plan: only allow voices from the free tier; ignore premium voice IDs
    let effectiveReferenceId: string | undefined = reference_id || undefined;
    if (effectivePlan === "free" && effectiveReferenceId && !FREE_VOICE_IDS.has(effectiveReferenceId)) {
      effectiveReferenceId = undefined;
    }

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
          voiceId: effectiveReferenceId ?? "default",
          voiceName: (voiceName as string | undefined) ?? "Voz por defecto",
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
