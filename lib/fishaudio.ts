import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { uploadToR2 } from "./r2";
import { withSlot } from "./fishAudioQueue";

const FISH_AUDIO_BASE = "https://api.fish.audio";
const CHUNK_MAX = 2500;

function getApiKey(): string {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) throw new Error("FISH_AUDIO_API_KEY is not set");
  return key;
}

// Split text at sentence/paragraph boundaries, never mid-sentence.
function splitTextIntoChunks(text: string, maxChars = CHUNK_MAX): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);

    // 1. Prefer paragraph break (double newline)
    let cutAt = -1;
    const lastParagraph = slice.lastIndexOf("\n\n");
    if (lastParagraph > maxChars * 0.4) {
      cutAt = lastParagraph + 2;
    }

    // 2. Fall back to sentence-ending punctuation + space/newline
    if (cutAt === -1) {
      const sentenceEnd = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf(".\n"),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("!\n"),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("?\n"),
      );
      if (sentenceEnd > maxChars * 0.4) {
        cutAt = sentenceEnd + 2; // include the punctuation + separator
      }
    }

    // 3. No boundary found within limit — extend to the next sentence end beyond maxChars
    if (cutAt === -1) {
      const beyond = [
        remaining.indexOf(". ", maxChars),
        remaining.indexOf(".\n", maxChars),
        remaining.indexOf("! ", maxChars),
        remaining.indexOf("!\n", maxChars),
        remaining.indexOf("? ", maxChars),
        remaining.indexOf("?\n", maxChars),
      ].filter((i) => i !== -1);
      if (beyond.length > 0) {
        cutAt = Math.min(...beyond) + 2;
      }
    }

    // 4. Absolute last resort: cut at the last space (no sentence boundary anywhere)
    if (cutAt === -1) {
      const lastSpace = slice.lastIndexOf(" ");
      cutAt = lastSpace > 0 ? lastSpace + 1 : maxChars;
    }

    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks.filter((c) => c.length > 0);
}

function toFishModel(model: string): string {
  if (model === "speech-1.5") return "s1";
  return "s2-pro";
}

async function fetchChunk(
  apiKey: string,
  payload: Record<string, unknown>,
  fishModel: string,
  chunkIndex: number,
  total: number,
  externalSignal?: AbortSignal,
): Promise<Buffer> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (externalSignal?.aborted) throw new DOMException("Aborted", "AbortError");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    let res: Response;
    try {
      res = await fetch(`${FISH_AUDIO_BASE}/v1/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          model: fishModel,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const waitMs = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
      console.warn(`[FishAudio] rate limited on chunk ${chunkIndex + 1}/${total}, retrying in ${waitMs / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fish Audio TTS failed on chunk ${chunkIndex + 1}/${total} (${res.status}): ${errText}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`[FishAudio] chunk ${chunkIndex + 1}/${total} — ${buf.length} bytes`);
    return buf;
  }

  throw new Error(`Fish Audio TTS rate limited on chunk ${chunkIndex + 1}/${total} after ${MAX_ATTEMPTS} attempts`);
}


// atempo acepta [0.5, 2.0]; encadenamos filtros para valores fuera de rango
function buildAtempoFilter(speed: number): string {
  if (speed < 0.5) return `atempo=0.5,atempo=${(speed / 0.5).toFixed(4)}`;
  if (speed > 2.0) return `atempo=2.0,atempo=${(speed / 2.0).toFixed(4)}`;
  return `atempo=${speed.toFixed(4)}`;
}

async function adjustSpeed(audioBuffer: Buffer, speed: number): Promise<Buffer> {
  if (speed === 1.0) return audioBuffer;

  const id = randomUUID();
  const inputPath = join(tmpdir(), `${id}_input.mp3`);
  const outputPath = join(tmpdir(), `${id}_output.mp3`);

  await writeFile(inputPath, audioBuffer);

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        ["-i", inputPath, "-filter:a", buildAtempoFilter(speed), "-y", outputPath],
        (err) => (err ? reject(err) : resolve()),
      );
    });
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

export async function convertToMp3(inputBuffer: Buffer): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `${id}_input`);
  const outputPath = join(tmpdir(), `${id}_output.mp3`);
  await writeFile(inputPath, inputBuffer);
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        ["-i", inputPath, "-acodec", "libmp3lame", "-ab", "128k", "-ar", "44100", "-y", outputPath],
        (err) => (err ? reject(err) : resolve()),
      );
    });
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

export interface GenerateResult {
  audio_url: string;
  duration_seconds: number;
  characters_used: number;
}

export async function fishAudioGenerate({
  text,
  referenceId,
  userId,
  signal,
  prosody,
  model = "speech-1.6",
  temperature,
  topP,
  normalizeLoudness,
  normalizeText,
  mp3Bitrate,
}: {
  text: string;
  referenceId?: string;
  userId: string;
  signal?: AbortSignal;
  prosody?: { speed?: number; volume?: number };
  model?: string;
  temperature?: number;
  topP?: number;
  normalizeLoudness?: boolean;
  normalizeText?: boolean;
  mp3Bitrate?: number;
}): Promise<GenerateResult> {
  const apiKey = getApiKey();
  const chunks = splitTextIntoChunks(text);

  console.log("[fishaudio] Iniciando generación");
  console.log("[fishaudio] prosody recibido:", JSON.stringify(prosody));
  console.log(`[FishAudio] TTS — referenceId=${referenceId ?? "none"} chars=${text.length} chunks=${chunks.length}`);
  console.log(`[chunking] Total chars: ${text.length}, chunks: ${chunks.length}, batchSize: global-queue(max 15)`);

  const audioBuffers = await Promise.all(chunks.map((_, i) => {
    // Disable text normalization when bracket/parenthesis tags are present — normalization can strip them
    const chunkHasTags = /\[[^\]]+\]|\([^)]+\)/.test(chunks[i]);
    const payload: Record<string, unknown> = {
      text: chunks[i],
      format: "mp3",
      mp3_bitrate: mp3Bitrate ?? 128,
      normalize: chunkHasTags ? false : (normalizeText ?? true),
      latency: "balanced",
      chunk_length: 200,
    };
    if (referenceId) payload.reference_id = referenceId;
    if (model === "speech-1.5") {
      if (temperature !== undefined) payload.temperature = temperature;
      if (topP !== undefined) payload.top_p = topP;
    }
    // Build prosody: normalize_loudness + optional volume (speed via ffmpeg, not sent to Fish Audio)
    const prosodyObj: Record<string, unknown> = {
      normalize_loudness: normalizeLoudness ?? true,
    };
    if (prosody?.volume !== undefined && prosody.volume !== 1) {
      prosodyObj.volume = prosody.volume;
    }
    payload.prosody = prosodyObj;
    console.log("[fishaudio] payload prosody:", JSON.stringify(payload.prosody));
    return withSlot(() => fetchChunk(apiKey, payload, toFishModel(model), i, chunks.length, signal));
  }));

  let audioBuffer = audioBuffers.length === 1 ? audioBuffers[0] : Buffer.concat(audioBuffers);

  const speed = prosody?.speed ?? 1.0;
  if (speed !== 1.0) {
    console.log(`[FishAudio] aplicando ajuste de velocidad x${speed} con ffmpeg`);
    audioBuffer = await adjustSpeed(audioBuffer, speed);
  }

  // Estimate duration from buffer size at 128 kbps CBR
  const duration_seconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;

  const key = `generated/${userId}/${Date.now()}.mp3`;
  const audio_url = await uploadToR2(key, audioBuffer, "audio/mpeg");

  console.log(`[FishAudio] uploaded ${audioBuffer.length} bytes → ${audio_url} (~${duration_seconds}s)`);

  return { audio_url, duration_seconds, characters_used: text.length };
}

export interface CloneResult {
  model_id: string;
}

export async function fishAudioClone({
  audioBuffer,
  voiceName,
}: {
  audioBuffer: Buffer;
  voiceName: string;
}): Promise<CloneResult> {
  const apiKey = getApiKey();

  const form = new FormData();
  form.append("type", "tts");
  form.append("title", voiceName);
  form.append("train_mode", "fast");
  form.append("visibility", "private");
  form.append("voices", new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" }), "reference.wav");

  console.log(`[FishAudio] creating voice model "${voiceName}" (${audioBuffer.length} bytes)`);

  const res = await fetch(`${FISH_AUDIO_BASE}/model`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fish Audio clone failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data._id) throw new Error(`Fish Audio did not return a model ID: ${JSON.stringify(data)}`);

  console.log(`[FishAudio] voice model created: ${data._id}`);
  return { model_id: data._id };
}
