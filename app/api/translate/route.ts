import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { getEffectivePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 300;

const FREE_TRANSCRIPTION_LIMIT = 2;

// Internal code → DeepL TargetLanguageCode + display name
const LANGUAGES: Record<string, { name: string; deeplCode: deepl.TargetLanguageCode }> = {
  en:  { name: "Inglés",    deeplCode: "en-US" },
  zh:  { name: "Chino",     deeplCode: "zh-HANS" },
  de:  { name: "Alemán",    deeplCode: "de" },
  ja:  { name: "Japonés",   deeplCode: "ja" },
  fr:  { name: "Francés",   deeplCode: "fr" },
  es:  { name: "Español",   deeplCode: "es" },
  ko:  { name: "Coreano",   deeplCode: "ko" },
  ar:  { name: "Árabe",     deeplCode: "ar" },
  ru:  { name: "Ruso",      deeplCode: "ru" },
  pt:  { name: "Portugués", deeplCode: "pt-BR" },
};

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey  = process.env.FISH_AUDIO_API_KEY;
  const deeplKey = process.env.DEEPL_API_KEY;
  if (!fishKey)  return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });
  if (!deeplKey) return NextResponse.json({ error: "DEEPL_API_KEY no configurada" }, { status: 500 });

  const form = await req.formData();
  const audioFile  = form.get("audio") as File | null;
  const targetLang = (form.get("target_lang") as string) ?? "";
  const referenceId = (form.get("reference_id") as string) || undefined;

  if (!audioFile) return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });
  const lang = LANGUAGES[targetLang];
  if (!lang) return NextResponse.json({ error: "Idioma de destino no válido" }, { status: 400 });

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

  // ── Step 1: Fish Audio ASR — transcribe audio ─────────────────
  const asrForm = new FormData();
  asrForm.append("audio", audioFile);
  asrForm.append("language", "es");
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

  console.log(`[translate] ASR → ${transcribedText.length} chars, target=${targetLang}`);

  // ── Step 2: DeepL — translate ES → target language (direct) ──
  let translatedText: string;
  try {
    const translator = new deepl.Translator(deeplKey);
    const result = await translator.translateText(transcribedText, "es", lang.deeplCode) as deepl.TextResult;
    translatedText = result.text.trim();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en traducción con DeepL" },
      { status: 502 },
    );
  }

  if (!translatedText) {
    return NextResponse.json({ error: "DeepL devolvió una traducción vacía" }, { status: 502 });
  }

  // ── Credit check & deduction (enterprise: x1.1, others: x1.2) ──
  const translateMultiplier = effectivePlan === "enterprise" ? 1.1 : 1.2;
  const charCost = Math.ceil(calculateCharCost(translatedText.length) * translateMultiplier);
  if (user.credits < charCost) {
    return NextResponse.json(
      { error: `Créditos insuficientes. Necesitas ${charCost} para ${translatedText.length} caracteres.`, charCost, charsAvailable: user.credits },
      { status: 402 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      credits: { decrement: charCost },
      ...(effectivePlan === "free" && { transcriptionUsed: { increment: 1 } }),
    },
  });

  // ── Step 3: Fish Audio TTS — generate translated audio ────────
  let ttsResult;
  try {
    ttsResult = await fishAudioGenerate({ text: translatedText, userId: user.id, referenceId });
  } catch (e) {
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: charCost } },
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar audio" },
      { status: 500 },
    );
  }

  console.log(`[translate] done → ${ttsResult.audio_url} (${ttsResult.duration_seconds}s, ${charCost} credits)`);

  return NextResponse.json({
    audioUrl: ttsResult.audio_url,
    durationSeconds: ttsResult.duration_seconds,
    transcribedText,
    translatedText,
    targetLanguageName: lang.name,
    charCost,
    charsRemaining: user.credits - charCost,
  });
}
