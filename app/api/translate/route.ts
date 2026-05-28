import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate, fishAudioClone, convertToMp3 } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { getEffectivePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 300;

const FREE_TRANSCRIPTION_LIMIT = 2;

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
  console.log("[translate] request received");

  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey  = process.env.FISH_AUDIO_API_KEY;
  const deeplKey = process.env.DEEPL_API_KEY;
  if (!fishKey)  return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });
  if (!deeplKey) return NextResponse.json({ error: "DEEPL_API_KEY no configurada" }, { status: 500 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    console.error("[translate] failed to parse formData:", e);
    return NextResponse.json({ error: "Error al leer el formulario", details: String(e) }, { status: 400 });
  }

  const audioFile      = form.get("audio") as File | null;
  const targetLang     = (form.get("target_lang") as string) ?? "";
  const referenceId    = (form.get("reference_id") as string) || undefined;
  const referenceAudio = form.get("reference_audio") as File | null;

  console.log("[translate] form fields:", { hasAudio: !!audioFile, targetLang, hasRefId: !!referenceId, hasRefAudio: !!referenceAudio });

  if (!audioFile) return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });
  const lang = LANGUAGES[targetLang];
  if (!lang) return NextResponse.json({ error: "Idioma de destino no válido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  console.log("[translate] user found:", user.id, "plan:", user.plan, "credits:", user.credits);

  const effectivePlan = await getEffectivePlan(user.id, user.plan);

  if (effectivePlan === "free" && user.transcriptionUsed >= FREE_TRANSCRIPTION_LIMIT) {
    return NextResponse.json(
      { error: "Has usado tus 2 transcripciones/traducciones gratuitas. Suscríbete a cualquier plan de pago para uso ilimitado." },
      { status: 403 }
    );
  }

  // Create task record
  const task = await prisma.translationTask.create({
    data: {
      userId: user.id,
      fileName: audioFile.name,
      targetLanguage: targetLang,
      targetLanguageName: lang.name,
      status: "processing",
    },
  });
  console.log("[translate] task created:", task.id);

  try {
    // ── Optional: clone reference audio → get model ID ────────
    let resolvedReferenceId = referenceId;
    if (!resolvedReferenceId && referenceAudio) {
      const audioBuffer = Buffer.from(await referenceAudio.arrayBuffer());
      const cloneResult = await fishAudioClone({ audioBuffer, voiceName: `ref-${Date.now()}` });
      resolvedReferenceId = cloneResult.model_id;
    }

    // ── Step 1: Fish Audio ASR ────────────────────────────────
    console.log("[translate] step1: converting audio to mp3, size:", audioFile.size);
    const rawBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mp3Buffer = await convertToMp3(rawBuffer);
    console.log("[translate] step1: mp3 ready, bytes:", mp3Buffer.length);

    const asrForm = new FormData();
    asrForm.append("audio", new Blob([new Uint8Array(mp3Buffer)], { type: "audio/mpeg" }), "audio.mp3");
    asrForm.append("language", "es");
    asrForm.append("ignore_timestamps", "true");

    console.log("[translate] step1: calling Fish Audio ASR...");
    const asrRes = await fetch("https://api.fish.audio/v1/asr", {
      method: "POST",
      headers: { Authorization: `Bearer ${fishKey}` },
      body: asrForm,
    });

    if (!asrRes.ok) {
      const err = await asrRes.text();
      await prisma.translationTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: `Error en transcripción (${asrRes.status}): ${err}` },
      });
      return NextResponse.json({ error: `Error en transcripción (${asrRes.status}): ${err}` }, { status: 502 });
    }

    const transcribedText = ((await asrRes.json()).text ?? "").trim();
    if (!transcribedText) {
      await prisma.translationTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: "No se detectó texto en el audio" },
      });
      return NextResponse.json({ error: "No se detectó texto en el audio" }, { status: 400 });
    }

    console.log(`[translate] ASR → ${transcribedText.length} chars, target=${targetLang}`);

    // ── Step 2: DeepL translation ─────────────────────────────
    let translatedText: string;
    try {
      const translator = new deepl.Translator(deeplKey);
      const result = await translator.translateText(transcribedText, "es", lang.deeplCode) as deepl.TextResult;
      translatedText = result.text.trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en traducción con DeepL";
      await prisma.translationTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: msg },
      });
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    if (!translatedText) {
      await prisma.translationTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: "DeepL devolvió una traducción vacía" },
      });
      return NextResponse.json({ error: "DeepL devolvió una traducción vacía" }, { status: 502 });
    }

    // ── Credit check & deduction ──────────────────────────────
    const translateMultiplier = effectivePlan === "enterprise" ? 1.1 : 1.2;
    const charCost = Math.ceil(calculateCharCost(translatedText.length) * translateMultiplier);

    if (user.credits < charCost) {
      await prisma.translationTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: `Créditos insuficientes (necesitas ${charCost})` },
      });
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

    // ── Step 3: Fish Audio TTS ────────────────────────────────
    let ttsResult;
    try {
      ttsResult = await fishAudioGenerate({ text: translatedText, userId: user.id, referenceId: resolvedReferenceId });
    } catch (e) {
      await prisma.user.update({ where: { id: user.id }, data: { credits: { increment: charCost } } });
      const msg = e instanceof Error ? e.message : "Error al generar audio";
      await prisma.translationTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: msg },
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await prisma.translationTask.update({
      where: { id: task.id },
      data: {
        status: "completed",
        creditsUsed: charCost,
        durationSeconds: ttsResult.duration_seconds,
        audioUrl: ttsResult.audio_url,
        transcribedText,
        translatedText,
      },
    });

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
  } catch (e) {
    console.error("[translate] ERROR:", e);
    console.error("[translate] error message:", e instanceof Error ? e.message : String(e));
    console.error("[translate] stack:", e instanceof Error ? e.stack : "(no stack)");
    await prisma.translationTask.update({
      where: { id: task.id },
      data: { status: "error", errorMessage: String(e) },
    }).catch((dbErr) => console.error("[translate] failed to update task status:", dbErr));
    return NextResponse.json({ error: "Error interno", details: String(e) }, { status: 500 });
  }
}
