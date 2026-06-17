import * as deepl from "deepl-node";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate, fishAudioClone, convertToMp3 } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { downloadRawFromR2, deleteFromR2, keyFromPublicUrl } from "@/lib/r2";
import { log } from "@/lib/logger";

const RETENTION_DAYS: Record<string, number> = {
  free: 3, starter: 14, pro: 30, elite: 30, enterprise: 90,
};

interface TranslateParams {
  taskId: string;
  userId: string;
  fileKey: string;
  targetLang: string;
  referenceId?: string;
  referenceFileKey?: string;
  fishKey: string;
  deeplKey: string;
  effectivePlan: string;
  lang: { name: string; deeplCode: string };
  user: { id: string; credits: number; extraCredits: number; plan: string; transcriptionUsed: number };
}

export async function processTranslationInBackground(params: TranslateParams) {
  const { taskId, userId, fileKey, referenceId, referenceFileKey, fishKey, deeplKey, effectivePlan, lang, user } = params;

  await prisma.translationTask.update({ where: { id: taskId }, data: { status: "processing" } });

  async function cleanup() {
    await deleteFromR2(fileKey).catch(e => console.error("[translate-bg] cleanup fileKey failed:", e));
    if (referenceFileKey) await deleteFromR2(referenceFileKey).catch(e => console.error("[translate-bg] cleanup refKey failed:", e));
  }

  async function fail(errorMessage: string) {
    await prisma.translationTask.update({ where: { id: taskId }, data: { status: "error", errorMessage } });
    await cleanup();
  }

  try {
    // Step 1: clone reference if needed
    let resolvedReferenceId = referenceId;
    if (!resolvedReferenceId && referenceFileKey) {
      const refBuffer = await downloadRawFromR2(referenceFileKey);
      const cloneResult = await fishAudioClone({ audioBuffer: refBuffer, voiceName: `ref-${Date.now()}` });
      resolvedReferenceId = cloneResult.model_id;
    }

    // Step 2: Download and convert to MP3
    const rawBuffer = await downloadRawFromR2(fileKey);
    console.log("[translate-bg] downloaded bytes:", rawBuffer.length);

    const MAX_BYTES = 50 * 1024 * 1024;
    if (rawBuffer.length > MAX_BYTES) {
      return await fail("El audio es demasiado largo. Por favor divide el audio en fragmentos de máximo 8 minutos.");
    }

    const mp3Buffer = await convertToMp3(rawBuffer);
    console.log("[translate-bg] mp3 ready bytes:", mp3Buffer.length);

    // Step 3: Fish Audio ASR
    const asrForm = new FormData();
    asrForm.append("audio", new Blob([new Uint8Array(mp3Buffer)], { type: "audio/mpeg" }), "audio.mp3");
    asrForm.append("ignore_timestamps", "true");

    const asrRes = await fetch("https://api.fish.audio/v1/asr", {
      method: "POST",
      headers: { Authorization: `Bearer ${fishKey}` },
      body: asrForm,
    });

    if (!asrRes.ok) {
      const err = await asrRes.text();
      return await fail(`Error en transcripción (${asrRes.status}): ${err}`);
    }

    const transcribedText = ((await asrRes.json()).text ?? "").trim();
    if (!transcribedText) return await fail("No se detectó texto en el audio");

    console.log("[translate-bg] ASR done, chars:", transcribedText.length);

    // Step 4: DeepL translation
    let translatedText: string;
    try {
      const translator = new deepl.Translator(deeplKey);
      const result = await translator.translateText(transcribedText, null, lang.deeplCode as deepl.TargetLanguageCode) as deepl.TextResult;
      translatedText = result.text.trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en traducción con DeepL";
      return await fail(msg);
    }

    if (!translatedText) return await fail("DeepL devolvió traducción vacía");

    // Step 5: Credits
    const translateMultiplier = effectivePlan === "enterprise" ? 1.1 : 1.2;
    const charCost = Math.ceil(calculateCharCost(translatedText.length) * translateMultiplier);
    const freshUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!freshUser) return await fail("Usuario no encontrado");

    const totalAvailable = freshUser.credits + freshUser.extraCredits;
    if (totalAvailable < charCost) {
      return await fail(`Créditos insuficientes. Necesitas ${charCost} para ${translatedText.length} caracteres.`);
    }

    const fromPlan = Math.min(freshUser.credits, charCost);
    const fromExtra = charCost - fromPlan;

    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: fromPlan },
        extraCredits: { decrement: fromExtra },
        ...(effectivePlan === "free" && { transcriptionUsed: { increment: 1 } }),
      },
    });
    log("info", "credits", "credits deducted", { userId, chars: translatedText.length, creditsUsed: charCost, plan: effectivePlan }, userId);

    // Step 6: Fish Audio TTS
    let ttsResult;
    try {
      ttsResult = await fishAudioGenerate({ text: translatedText, userId, referenceId: resolvedReferenceId });
    } catch (e) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } });
      const msg = e instanceof Error ? e.message : "Error al generar audio";
      return await fail(msg);
    }

    const retentionDays = RETENTION_DAYS[effectivePlan] ?? 3;
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    const r2Key = keyFromPublicUrl(ttsResult.audio_url);

    await prisma.translationTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        creditsUsed: charCost,
        durationSeconds: ttsResult.duration_seconds,
        audioUrl: ttsResult.audio_url,
        r2Key,
        expiresAt,
        transcribedText,
        translatedText,
      },
    });

    await cleanup();
    console.log("[translate-bg] done taskId:", taskId, "audioUrl:", ttsResult.audio_url);

  } catch (e) {
    console.error("[translate-bg] ERROR:", e);
    await fail(String(e));
  }
}
