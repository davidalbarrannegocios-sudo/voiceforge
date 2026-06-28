import * as deepl from "deepl-node";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate, fishAudioClone, fishAudioGenerateBuffer, fishAudioDeleteModel, convertToMp3 } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";
import { downloadRawFromR2, deleteFromR2, keyFromPublicUrl, uploadToR2 } from "@/lib/r2";
import { log } from "@/lib/logger";

const execFileAsync = promisify(execFile);

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
      const translator = new deepl.Translator(deeplKey);
      // Filter empty segments before sending to DeepL
      const validUtterances = utterances.filter(u => u.text?.trim().length > 0);
      if (!validUtterances.length) return await fail("No hay texto válido para traducir");
      try {
        const BATCH_SIZE = 10;
        translatedUtterances = [];
        for (let i = 0; i < validUtterances.length; i += BATCH_SIZE) {
          const batch = validUtterances.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async u => ({
              ...u,
              translatedText: await translateWithRetry(translator, u.text, lang.deeplCode as deepl.TargetLanguageCode),
            }))
          );
          translatedUtterances.push(...results);
          if (i + BATCH_SIZE < validUtterances.length) {
            await new Promise(r => setTimeout(r, 500));
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

    // Step 5: Download audio + convert to MP3
    const rawBuffer = await downloadRawFromR2(fileKey);
    if (rawBuffer.length > 50 * 1024 * 1024) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } });
      return await fail("El audio es demasiado largo. Por favor divide el audio en fragmentos de máximo 8 minutos.");
    }
    const mp3Buffer = await convertToMp3(rawBuffer);

    // Step 6: Clone ONE model per speaker using only that speaker's audio segments
    const MAX_REFERENCE_SECONDS = 240;
    const FALLBACK_VOICE_ID = "933563129e564b19a115bedd57b7406a";
    const sessionId = randomUUID();
    const sourceAudioPath = join(tmpdir(), `trans_${sessionId}_source.mp3`);
    const clonedSpeakers: Array<{ speaker: string; modelId: string }> = [];
    const speakerModels: Record<string, string> = {};
    const speakerOrder = [...new Set(utterances.map(u => u.speaker))].sort();

    try {
      await writeFile(sourceAudioPath, mp3Buffer);

      for (const speaker of speakerOrder) {
        const speakerSegments = translatedUtterances.filter(u => u.speaker === speaker);
        console.log("[synthesize-multi] creando modelo para speaker", speaker, "con", speakerSegments.length, "segmentos");

        const chunks: Buffer[] = [];
        let totalDuration = 0;

        for (const utt of speakerSegments) {
          if (totalDuration >= MAX_REFERENCE_SECONDS) break;
          const startSecs = utt.start / 1000;
          const endSecs = utt.end / 1000;
          const duration = endSecs - startSecs;
          if (duration < 0.5) continue;

          const chunkPath = join(tmpdir(), `trans_${sessionId}_spk${speaker}_c${chunks.length}.mp3`);
          try {
            await execFileAsync("ffmpeg", [
              "-i", sourceAudioPath,
              "-ss", String(startSecs),
              "-to", String(endSecs),
              "-c:a", "libmp3lame", "-q:a", "4",
              "-y", chunkPath,
            ]);
            const buf = await readFile(chunkPath);
            if (buf.length > 1000) { chunks.push(buf); totalDuration += duration; }
            await unlink(chunkPath).catch(() => {});
          } catch { continue; }
        }

        if (chunks.length === 0) {
          console.warn(`[translate-multi] speaker ${speaker}: sin chunks válidos, usando voz fallback`);
          speakerModels[speaker] = FALLBACK_VOICE_ID;
          continue;
        }

        let sampleBuffer: Buffer;
        if (chunks.length === 1) {
          sampleBuffer = chunks[0];
        } else {
          const chunkPaths: string[] = [];
          for (let i = 0; i < chunks.length; i++) {
            const p = join(tmpdir(), `trans_${sessionId}_spk${speaker}_m${i}.mp3`);
            await writeFile(p, chunks[i]);
            chunkPaths.push(p);
          }
          const listPath = join(tmpdir(), `trans_${sessionId}_spk${speaker}_list.txt`);
          const mergedPath = join(tmpdir(), `trans_${sessionId}_spk${speaker}_merged.mp3`);
          await writeFile(listPath, chunkPaths.map(p => `file '${p}'`).join("\n"));
          await execFileAsync("ffmpeg", ["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-y", mergedPath]);
          sampleBuffer = await readFile(mergedPath);
          await Promise.all([...chunkPaths.map(p => unlink(p).catch(() => {})), unlink(listPath).catch(() => {}), unlink(mergedPath).catch(() => {})]);
        }

        try {
          const cloneResult = await fishAudioClone({
            audioBuffer: sampleBuffer,
            voiceName: `spk-${speaker}-${taskId.slice(-6)}`,
            model: "s2-pro",
          });
          clonedSpeakers.push({ speaker, modelId: cloneResult.model_id });
          speakerModels[speaker] = cloneResult.model_id;
          console.log(`[translate-multi] speaker ${speaker} clonado → ${cloneResult.model_id} (${Math.round(totalDuration)}s)`);
        } catch (e) {
          console.warn(`[translate-multi] usando voz fallback para speaker ${speaker}:`, e);
          speakerModels[speaker] = FALLBACK_VOICE_ID;
        }
      }
    } finally {
      await unlink(sourceAudioPath).catch(() => {});
    }

    console.log("[synthesize-multi] modelos asignados:", Object.entries(speakerModels).map(([s, m]) => `${s}:${m}`));

    if (Object.keys(speakerModels).length === 0) {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } } });
      return await fail("No se pudo asignar voz a ningún hablante");
    }

    // Index map using speakerOrder — all speakers have a model (cloned or fallback)
    const assignedSpeakers = speakerOrder.filter(s => speakerModels[s]);
    const speakerIndexMap: Record<string, number> = Object.fromEntries(
      assignedSpeakers.map((s, i) => [s, i])
    );
    const referenceIds = assignedSpeakers.map(s => speakerModels[s]);
    console.log("[synthesize-multi] reference_id array:", referenceIds);

    const ttsText = buildSpeakerTokenText(translatedUtterances, speakerIndexMap);

    // Step 7: Fish Audio TTS S2 with per-speaker reference_id array
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
      await Promise.all(clonedSpeakers.map(m => fishAudioDeleteModel(m.modelId).catch(() => {})));
      const msg = e instanceof Error ? e.message : "Error al generar audio multi-hablante";
      return await fail(msg);
    }
    await Promise.all(clonedSpeakers.map(m => fishAudioDeleteModel(m.modelId).catch(() => {})));

    // Step 8: Upload to Hetzner at translations/multi/{userId}/{timestamp}.mp3
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
