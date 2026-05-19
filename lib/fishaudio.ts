import { uploadToR2 } from "./r2";

const FISH_AUDIO_BASE = "https://api.fish.audio";

function getApiKey(): string {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) throw new Error("FISH_AUDIO_API_KEY is not set");
  return key;
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
}: {
  text: string;
  referenceId?: string;
  userId: string;
}): Promise<GenerateResult> {
  const apiKey = getApiKey();

  const payload: Record<string, unknown> = {
    text,
    format: "mp3",
    mp3_bitrate: 128,
    normalize: true,
    latency: "normal",
  };
  if (referenceId) payload.reference_id = referenceId;

  console.log(`[FishAudio] TTS request — referenceId=${referenceId ?? "none"} chars=${text.length}`);

  const res = await fetch(`${FISH_AUDIO_BASE}/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fish Audio TTS failed (${res.status}): ${errText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());

  // Estimate duration from MP3 frame size at 128 kbps CBR
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
  form.append("title", voiceName);
  form.append("visibility", "private");
  form.append("train_mode", "fast");
  form.append("voices[0].audio", new Blob([new Uint8Array(audioBuffer)]), "reference.wav");

  console.log(`[FishAudio] creating voice model "${voiceName}" (${audioBuffer.length} bytes)`);

  const res = await fetch(`${FISH_AUDIO_BASE}/model`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fish Audio clone failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data._id) {
    throw new Error(`Fish Audio did not return a model ID: ${JSON.stringify(data)}`);
  }

  console.log(`[FishAudio] voice model created: ${data._id}`);
  return { model_id: data._id };
}
