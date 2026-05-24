import { uploadToR2 } from "./r2";

const FISH_AUDIO_BASE = "https://api.fish.audio";
const CHUNK_MAX = 2000;

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

    // 3. Last resort: cut at the last space
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

async function fetchChunk(
  apiKey: string,
  payload: Record<string, unknown>,
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

function getBatchSize(totalChars: number): number {
  if (totalChars <= 10_000) return 3;
  if (totalChars <= 25_000) return 6;
  if (totalChars <= 50_000) return 8;
  return 12;
}

async function processInBatches(chunks: string[], fetchFn: (index: number) => Promise<Buffer>, batchSize: number): Promise<Buffer[]> {
  const results: Buffer[] = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((_, j) => fetchFn(i + j))
    );
    results.push(...batchResults);
  }
  return results;
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
}: {
  text: string;
  referenceId?: string;
  userId: string;
  signal?: AbortSignal;
  prosody?: { speed?: number; volume?: number; pitch?: number };
  model?: string;
}): Promise<GenerateResult> {
  const apiKey = getApiKey();
  const chunks = splitTextIntoChunks(text);

  console.log("[fishaudio] Iniciando generación");
  console.log("[fishaudio] prosody recibido:", JSON.stringify(prosody));
  console.log(`[FishAudio] TTS — referenceId=${referenceId ?? "none"} chars=${text.length} chunks=${chunks.length}`);

  const batchSize = getBatchSize(text.length);
  console.log(`[FishAudio] batchSize=${batchSize} for ${text.length} chars`);

  const audioBuffers = await processInBatches(chunks, (i) => {
    const payload: Record<string, unknown> = {
      text: chunks[i],
      model,
      format: "mp3",
      mp3_bitrate: 128,
      normalize: true,
      latency: "balanced",
      chunk_length: 200,
    };
    if (referenceId) payload.reference_id = referenceId;
    if (prosody && (prosody.speed !== 1 || prosody.volume !== 1 || prosody.pitch !== 0)) {
      payload.prosody = {
        speed: prosody.speed,
        volume: prosody.volume,
        pitch: prosody.pitch !== undefined && prosody.pitch !== 0
          ? `${prosody.pitch > 0 ? "+" : ""}${prosody.pitch}st`
          : undefined,
      };
    }
    console.log("[fishaudio] payload prosody:", JSON.stringify(payload.prosody));
    return fetchChunk(apiKey, payload, i, chunks.length, signal);
  }, batchSize);

  const audioBuffer = audioBuffers.length === 1 ? audioBuffers[0] : Buffer.concat(audioBuffers);

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
