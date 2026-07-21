import * as deepl from "deepl-node";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate, fishAudioGenerateBuffer, fishAudioClone, convertToMp3 } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { downloadRawFromR2, deleteFromR2, keyFromPublicUrl, uploadToR2 } from "@/lib/r2";
import { log } from "@/lib/logger";

async function translateWithRetry(
  translator: deepl.Translator,
  text: string,
  targetLang: deepl.TargetLanguageCode,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await translator.translateText(text, null, targetLang) as deepl.TextResult;
      return result.text.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.toLowerCase().includes("too many requests") || msg.includes("429");
      if (isRateLimit && attempt < maxRetries - 1) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.warn(`[translate-processor] DeepL rate limit, reintentando en ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (attempt === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("DeepL falló después de todos los reintentos");
}

const RETENTION_DAYS: Record<string, number> = {
  free: 3, starter: 14, creator: 14, plus: 30, pro: 60, elite: 90, enterprise: 90,
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

    // Step 4: GPT translation
    let translatedText: string;
    try {
      const langNames: Record<string, string> = {
        'EN': 'English', 'EN-US': 'English', 'EN-GB': 'English',
        'ES': 'Spanish', 'FR': 'French', 'DE': 'German',
        'PT': 'Portuguese', 'PT-BR': 'Portuguese', 'PT-PT': 'Portuguese',
        'IT': 'Italian', 'ZH': 'Chinese', 'JA': 'Japanese',
        'KO': 'Korean', 'AR': 'Arabic', 'RU': 'Russian'
      }
      const targetLangName = langNames[lang.deeplCode.toUpperCase()] || lang.name
      const gptResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a professional translator. Translate the following text to ' + targetLangName + '. Return ONLY the translated text, nothing else.' },
            { role: 'user', content: transcribedText }
          ],
          temperature: 0.1,
        })
      })
      const gptData = await gptResp.json()
      translatedText = gptData.choices[0].message.content.trim()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en traducción con GPT"
      return await fail(msg)
    }

    if (!translatedText) return await fail("GPT devolvio traduccion vacia")

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

export interface AssemblyAIUtterance {
  speaker: string;   // "A", "B", "C"...
  text: string;
  start: number;     // milliseconds
  end: number;
  confidence?: number;
}

// Kept for backwards-compat — legacy Fish ASR preview endpoint still uses this
export interface DiarizedSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export function mergeSegmentsBySpeaker(segments: DiarizedSegment[]): DiarizedSegment[] {
  if (!segments.length) return [];
  const merged: DiarizedSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.text += " " + seg.text;
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

function buildSpeakerTokenText(
  utterances: (AssemblyAIUtterance & { translatedText: string })[],
  speakerIndexMap: Record<string, number>,
): string {
  return utterances
    .filter(u => speakerIndexMap[u.speaker] !== undefined)
    .map(u => `<|speaker:${speakerIndexMap[u.speaker]}|>${u.translatedText}`)
    .join("");
}

interface MultiSpeakerParams {
  taskId: string;
  userId: string;
  fileKey: string;
  targetLang: string;
  fishKey: string;
  deeplKey: string;
  effectivePlan: string;
  lang: { name: string; deeplCode: string };
  user: { id: string; credits: number; extraCredits: number; plan: string; transcriptionUsed: number };
  utterances?: (AssemblyAIUtterance & { translatedText?: string })[];   // from AssemblyAI diarize endpoint; may include pre-translated text
  segments?: DiarizedSegment[];          // legacy fallback
  voiceAssignments?: Record<string, string>;  // speaker ID -> Fish Audio voice ID
}

export async function processMultiSpeakerTranslationInBackground(params: MultiSpeakerParams) {
  const { taskId, userId, fileKey, targetLang, deeplKey, effectivePlan, lang } = params;

  await prisma.translationTask.update({ where: { id: taskId }, data: { status: "processing" } });

  async function cleanup() {
    await deleteFromR2(fileKey).catch(e => console.error("[translate-multi] cleanup failed:", e));
  }

  async function fail(errorMessage: string) {
    await prisma.translationTask.update({ where: { id: taskId }, data: { status: "error", errorMessage } });
    await cleanup();
  }

  try {
    // Step 1: Resolve utterances — prefer AssemblyAI format, fall back to legacy DiarizedSegment
    let utterances: AssemblyAIUtterance[];

    if (params.utterances && params.utterances.length > 0) {
      utterances = params.utterances;
    } else if (params.segments && params.segments.length > 0) {
      const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const speakerMap = new Map<string, string>();
      utterances = params.segments.map(seg => {
        if (!speakerMap.has(seg.speaker)) speakerMap.set(seg.speaker, LETTERS[speakerMap.size] ?? seg.speaker);
        return { speaker: speakerMap.get(seg.speaker)!, text: seg.text, start: seg.start, end: seg.end };
      });
    } else {
      return await fail("No se proporcionaron segmentos de diarización. Usa el botón 'Analizar hablantes' primero.");
    }

    if (!utterances.length) return await fail("No se detectaron segmentos de audio");

    // Step 2: Translate all utterances — skip DeepL if frontend already translated them
    let translatedUtterances: (AssemblyAIUtterance & { translatedText: string })[];

    const preTranslated = params.utterances?.every(u => u.translatedText !== undefined && u.translatedText !== "");
    if (preTranslated) {
      translatedUtterances = (params.utterances as (AssemblyAIUtterance & { translatedText: string })[]);
    } else {
      // Filter empty segments
      const validUtterances = utterances.filter(u => u.text?.trim().length > 0);
      if (!validUtterances.length) return await fail("No hay texto válido para traducir");
      const langNames2: Record<string, string> = {
        'EN': 'English', 'EN-US': 'English', 'EN-GB': 'English',
        'ES': 'Spanish', 'FR': 'French', 'DE': 'German',
        'PT': 'Portuguese', 'PT-BR': 'Portuguese', 'IT': 'Italian',
        'ZH': 'Chinese', 'JA': 'Japanese', 'KO': 'Korean', 'AR': 'Arabic', 'RU': 'Russian'
      };
      const targetLangName2 = langNames2[lang.deeplCode.toUpperCase()] || lang.name;
      async function translateWithGPT(text: string): Promise<string> {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [
            { role: 'system', content: 'You are a professional translator. Translate to ' + targetLangName2 + '. Return ONLY the translated text.' },
            { role: 'user', content: text }
          ], temperature: 0.1 })
        });
        const d = await r.json();
        return d.choices[0].message.content.trim();
      }
      try {
        const BATCH_SIZE = 5;
        translatedUtterances = [];
        for (let i = 0; i < validUtterances.length; i += BATCH_SIZE) {
          const batch = validUtterances.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async u => ({
              ...u,
              translatedText: await translateWithGPT(u.text),
            }))
          );
          translatedUtterances.push(...results);
          if (i + BATCH_SIZE < validUtterances.length) {
            await new Promise(r => setTimeout(r, 200));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error en traducción con DeepL";
        return await fail(msg);
      }
    }

    // Step 3: Metadata for credits and history
    const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];
    const speakerCount = uniqueSpeakers.length;
    const fullTranscription = utterances.map(u => `[${u.speaker}] ${u.text}`).join("\n");
    const fullTranslation = translatedUtterances.map(u => `[${u.speaker}] ${u.translatedText}`).join("\n");

    // Step 4: Credits — multi-speaker carries higher cost (diarization + per-speaker cloning)
    const pureTranslatedLength = translatedUtterances.reduce((sum, u) => sum + u.translatedText.length, 0);
    const translateMultiplier = effectivePlan === "enterprise" ? 1.1 : 1.6;
    const charCost = Math.ceil(calculateCharCost(pureTranslatedLength) * translateMultiplier);

    const freshUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!freshUser) return await fail("Usuario no encontrado");

    const totalAvailable = freshUser.credits + freshUser.extraCredits;
    if (totalAvailable < charCost) {
      return await fail(`Créditos insuficientes. Necesitas ${charCost} créditos para ${pureTranslatedLength} caracteres.`);
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
    log("info", "credits", "multi-speaker credits deducted", { userId, chars: pureTranslatedLength, creditsUsed: charCost, plan: effectivePlan, speakerCount }, userId);

    // Step 5: Build speaker model assignments from voiceAssignments
    if (!params.voiceAssignments || Object.keys(params.voiceAssignments).length === 0) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } });
      return await fail("No se proporcionaron asignaciones de voz para los hablantes");
    }

    const speakerOrder = [...new Set(utterances.map(u => u.speaker))].sort();
    const assignedSpeakers = speakerOrder.filter(s => params.voiceAssignments![s]);

    if (assignedSpeakers.length === 0) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } });
      return await fail("No hay voces asignadas para ningún hablante");
    }

    const speakerIndexMap: Record<string, number> = Object.fromEntries(
      assignedSpeakers.map((s, i) => [s, i])
    );
    const referenceIds = assignedSpeakers.map(s => params.voiceAssignments![s]);
    console.log("[translate-multi] usando voces asignadas manualmente:", params.voiceAssignments);
    console.log("[translate-multi] reference_id array:", referenceIds);

    const ttsText = buildSpeakerTokenText(translatedUtterances, speakerIndexMap);

    // Step 6: Fish Audio TTS S2 with per-speaker reference_id array
    let audioBuffer: Buffer;
    try {
      audioBuffer = await fishAudioGenerateBuffer({
        text: ttsText,
        references: referenceIds.map(id => ({ type: "model_id" as const, value: id })),
        model: "s2-pro",
        normalize: false,
        language: targetLang.toLowerCase().slice(0, 2),
      });
    } catch (e) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } });
      const msg = e instanceof Error ? e.message : "Error al generar audio multi-hablante";
      return await fail(msg);
    }

    // Step 7: Upload to Hetzner at translations/multi/{userId}/{timestamp}.mp3
    const timestamp = Date.now();
    const key = `translations/multi/${userId}/${timestamp}.mp3`;
    const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");
    const duration_seconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;
    const r2Key = keyFromPublicUrl(audioUrl);

    const retentionDays = RETENTION_DAYS[effectivePlan] ?? 3;
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    await prisma.translationTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        creditsUsed: charCost,
        durationSeconds: duration_seconds,
        audioUrl,
        r2Key,
        expiresAt,
        transcribedText: fullTranscription,
        translatedText: fullTranslation,
        speakerMode: "multi",
        speakerCount,
      },
    });

    await cleanup();
    console.log("[translate-multi] done taskId:", taskId, "speakers:", speakerCount, "url:", audioUrl);

  } catch (e) {
    console.error("[translate-multi] ERROR:", e);
    await fail(String(e));
  }
}
