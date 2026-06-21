import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCharCost } from "@/lib/utils";

import { getEffectivePlan } from "@/lib/plan";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const {
    text,
    reference_id,
    voiceName,
    prosody,
    model,
    temperature,
    topP,
    normalizeLoudness,
    normalizeText,
    mp3Bitrate,
  } = await req.json();

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

    const fromPlan = Math.min(user.credits, charCost);
    const fromExtra = charCost - fromPlan;

    const effectiveReferenceId: string | undefined = reference_id || undefined;

    const resolvedVoiceName = (voiceName as string | undefined) ?? "Voz por defecto";

    const [, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
      }),
      prisma.generationJob.create({
        data: {
          userId: user.id,
          status: "pending",
          voiceId: effectiveReferenceId ?? "default",
          voiceName: resolvedVoiceName,
          text: trimmed,
          creditsUsed: charCost,
          fromPlan,
          fromExtra,
          fishParams: {
            referenceId: effectiveReferenceId ?? null,
            prosody: prosody ?? null,
            model: model ?? "speech-1.6",
            temperature: temperature ?? null,
            topP: topP ?? null,
            normalizeLoudness: normalizeLoudness ?? null,
            normalizeText: normalizeText ?? null,
            mp3Bitrate: mp3Bitrate ?? null,
          },
        },
      }),
    ]);

    log("info", "tts-job", `created jobId=${job.id} userId=${user.id} chars=${trimmed.length}`, { jobId: job.id, userId: user.id, chars: trimmed.length, voiceName: resolvedVoiceName }, user.id);
    log("info", "credits", "credits deducted", { userId: user.id, chars: trimmed.length, creditsUsed: charCost, voiceName: resolvedVoiceName, plan: user.plan }, user.id);

    return NextResponse.json({
      jobId: job.id,
      charCost,
      charsRemaining: totalAvailable - charCost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "tts-job", "create error", { message });
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
