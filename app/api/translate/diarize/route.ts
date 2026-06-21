import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — Deepgram is synchronous, no polling needed

// Kept for backwards compatibility — other files import this type
export interface AssemblyAIUtterance {
  speaker: string;   // "A", "B", "C"...
  text: string;
  start: number;     // milliseconds
  end: number;       // milliseconds
  confidence?: number;
}

async function convertToWav(audioUrl: string): Promise<Buffer> {
  const id = randomUUID();
  const tmpInput = join(tmpdir(), `diarize_${id}_input`);
  const tmpOutput = join(tmpdir(), `diarize_${id}_output.wav`);

  try {
    // Download audio from Hetzner
    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`Failed to download audio (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(tmpInput, buffer);

    // Convert to 16kHz mono WAV — best format for speech recognition
    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        ["-i", tmpInput, "-ar", "16000", "-ac", "1", "-f", "wav", "-y", tmpOutput],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    return await readFile(tmpOutput);
  } finally {
    if (existsSync(tmpInput)) await unlink(tmpInput).catch(() => {});
    if (existsSync(tmpOutput)) await unlink(tmpOutput).catch(() => {});
  }
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error("[diarize] DEEPGRAM_API_KEY no configurada");
    return NextResponse.json({ error: "DEEPGRAM_API_KEY no configurada" }, { status: 500 });
  }

  const publicAudioBase = process.env.HETZNER_AUDIO_PUBLIC_URL ?? "https://elitelabs-audio.fsn1.your-objectstorage.com";

  let body: { fileKey: string; speakersExpected?: number | null; audioLanguage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { fileKey, speakersExpected, audioLanguage } = body;
  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

  const audioUrl = `${publicAudioBase}/${fileKey}`;
  const language = audioLanguage ?? "es";

  console.log(`[diarize] converting to WAV — url=${audioUrl} lang=${language} speakersExpected=${speakersExpected ?? "auto"}`);

  // Convert to WAV first — Deepgram handles ogg/opus from WhatsApp poorly as-is
  let wavBuffer: Buffer;
  try {
    wavBuffer = await convertToWav(audioUrl);
    console.log(`[diarize] WAV ready — ${wavBuffer.length} bytes`);
  } catch (e) {
    console.error("[diarize] WAV conversion failed:", e);
    return NextResponse.json({ error: `Error al convertir audio: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  const params = new URLSearchParams({
    model: "nova-2",   // better diarization support than nova-3
    diarize: "true",
    punctuate: "true",
    language,
  });

  if (speakersExpected && speakersExpected >= 2) {
    params.append("diarize_version", "3");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  let data: {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          words?: Array<{ word: string; speaker: number; start: number; end: number }>;
        }>;
      }>;
    };
  };

  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: new Uint8Array(wavBuffer),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[diarize] Deepgram error (${response.status}): ${err}`);
      return NextResponse.json({ error: `Deepgram error (${response.status}): ${err}` }, { status: 502 });
    }

    data = await response.json();
  } catch (e) {
    clearTimeout(timeoutId);
    if ((e as Error).name === "AbortError") {
      return NextResponse.json({ error: "Deepgram tardó demasiado. Intenta con un audio más corto." }, { status: 504 });
    }
    throw e;
  }
  clearTimeout(timeoutId);

  const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words;

  if (!words || words.length === 0) {
    console.warn("[diarize] Deepgram devolvió words vacío:", JSON.stringify(data?.results?.channels?.[0]?.alternatives?.[0]));
    return NextResponse.json({
      utterances: [{ speaker: "A", text: "", start: 0, end: 0 }],
      speakerCount: 1,
      speakersDetected: 1,
    });
  }

  // Group consecutive words from the same speaker into utterances
  const utterances: AssemblyAIUtterance[] = [];
  let current: AssemblyAIUtterance | null = null;

  for (const word of words) {
    const speakerLetter = String.fromCharCode(65 + (word.speaker ?? 0)); // 0→A, 1→B, 2→C
    if (!current || current.speaker !== speakerLetter) {
      if (current) utterances.push(current);
      current = {
        speaker: speakerLetter,
        text: word.word,
        start: Math.round(word.start * 1000),
        end: Math.round(word.end * 1000),
      };
    } else {
      current.text += " " + word.word;
      current.end = Math.round(word.end * 1000);
    }
  }
  if (current) utterances.push(current);

  const speakerCount = new Set(utterances.map(u => u.speaker)).size;

  console.log(`[diarize] done — ${utterances.length} utterances, ${speakerCount} speakers`);

  return NextResponse.json({ utterances, speakerCount, speakersDetected: speakerCount });
}
