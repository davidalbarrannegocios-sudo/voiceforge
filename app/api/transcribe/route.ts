import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCharCost } from "@/lib/utils";
import { getEffectivePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 120;

const SUPPORTED_LANGS = ["es", "en", "ja", "ko", "zh"];
const FREE_TRANSCRIPTION_LIMIT = 2;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey = process.env.FISH_AUDIO_API_KEY;
  if (!fishKey) return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });

  const form = await req.formData();
  const audioFile = form.get("audio") as File | null;
  const language = (form.get("language") as string) ?? "es";

  if (!audioFile) return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });
  if (!SUPPORTED_LANGS.includes(language)) return NextResponse.json({ error: "Idioma no soportado" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const effectivePlan = await getEffectivePlan(user.id, user.plan);

  // Free plan limit check
  if (effectivePlan === "free" && user.transcriptionUsed >= FREE_TRANSCRIPTION_LIMIT) {
    return NextResponse.json(
      { error: "Has usado tus 2 transcripciones/traducciones gratuitas. Suscríbete a cualquier plan de pago para uso ilimitado." },
      { status: 403 }
    );
  }

  // Fish Audio ASR
  const asrForm = new FormData();
  asrForm.append("audio", audioFile);
  asrForm.append("language", language);
  asrForm.append("ignore_timestamps", "true");

  const asrRes = await fetch("https://api.fish.audio/v1/asr", {
    method: "POST",
    headers: { Authorization: `Bearer ${fishKey}` },
    body: asrForm,
  });

  if (!asrRes.ok) {
    const err = await asrRes.text();
    return NextResponse.json({ error: `Error en transcripción (${asrRes.status}): ${err}` }, { status: 502 });
  }

  const transcribedText = ((await asrRes.json()).text ?? "").trim();
  if (!transcribedText) {
    return NextResponse.json({ error: "No se detectó texto en el audio" }, { status: 400 });
  }

  console.log(`[transcribe] ASR → ${transcribedText.length} chars, lang=${language}`);

  // Credit check & deduction
  const charCost = calculateCharCost(transcribedText.length);
  const totalAvailable = user.credits + user.extraCredits;
  if (totalAvailable < charCost) {
    return NextResponse.json(
      { error: `Créditos insuficientes. Necesitas ${charCost} para ${transcribedText.length} caracteres.`, charCost, charsAvailable: totalAvailable },
      { status: 402 }
    );
  }

  const fromPlan  = Math.min(user.credits, charCost);
  const fromExtra = charCost - fromPlan;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      credits: { decrement: fromPlan },
      extraCredits: { decrement: fromExtra },
      ...(effectivePlan === "free" && { transcriptionUsed: { increment: 1 } }),
    },
  });

  return NextResponse.json({
    transcribedText,
    charCost,
    charsRemaining: updated.credits + updated.extraCredits,
    transcriptionUsed: updated.transcriptionUsed,
  });
}
