import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { promisify } from "util";
import { uploadToR2 } from "@/lib/r2";

const execFileAsync = promisify(execFile);

// No maxDuration — returns immediately with jobId; transcription runs as background task
export const runtime = "nodejs";

// Kept for backwards compatibility — other files import this type
export interface AssemblyAIUtterance {
  speaker: string;   // "A", "B", "C"...
  text: string;
  start: number;     // milliseconds
  end: number;       // milliseconds
  confidence?: number;
}

async function processDiarizeInBackground(
  jobId: string,
  fileKey: string,
  language: string,
  apiKey: string,
  publicAudioBase: string,
) {
  await prisma.job.update({ where: { id: jobId }, data: { status: "processing" } });

  try {
    const audioUrl = `${publicAudioBase}/${fileKey}`;
    console.log(`[diarize] bg downloading audio — url=${audioUrl} lang=${language} jobId=${jobId}`);

    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`Failed to download audio (${res.status})`);
    const audioBuffer = Buffer.from(await res.arrayBuffer());
    console.log(`[diarize] bg audio ready — ${audioBuffer.length} bytes jobId=${jobId}`);

    const ext = fileKey.split(".").pop()?.toLowerCase() ?? "ogg";
    const mimeMap: Record<string, string> = {
      ogg: "audio/ogg",
      mp3: "audio/mpeg",
      mp4: "audio/mp4",
      m4a: "audio/mp4",
      wav: "audio/wav",
      webm: "audio/webm",
    };
    const mimeType = mimeMap[ext] ?? "audio/ogg";

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `audio.${ext}`);
    form.append("model", "gpt-4o-transcribe-diarize");
    form.append("response_format", "diarized_json");
    form.append("chunking_strategy", "auto");
    form.append("language", language);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min

    let data: {
      text?: string;
      segments?: Array<{
        type: string;
        text: string;
        speaker: string;
        start: number;
        end: number;
        id: string;
      }>;
    };

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI error (${response.status}): ${err}`);
      }

      data = await response.json();
    } finally {
      clearTimeout(timeoutId);
    }

    const segments = data?.segments;

    if (!segments || segments.length === 0) {
      console.warn(`[diarize] bg OpenAI devolvió segments vacío jobId=${jobId}`);
      const result = JSON.stringify({
        utterances: [{ speaker: "A", text: "", start: 0, end: 0 }],
        speakerCount: 1,
        speakersDetected: 1,
      });
      await prisma.job.update({ where: { id: jobId }, data: { status: "done", audioUrl: result } });
      return;
    }

    // Group consecutive segments from the same speaker into utterances
    const utterances: AssemblyAIUtterance[] = [];
    let current: AssemblyAIUtterance | null = null;

    for (const seg of segments) {
      const speaker = seg.speaker ?? "A";
      if (!current || current.speaker !== speaker) {
        if (current) utterances.push(current);
        current = {
          speaker,
          text: seg.text.trim(),
          start: Math.round(seg.start * 1000),
          end: Math.round(seg.end * 1000),
        };
      } else {
        current.text += " " + seg.text.trim();
        current.end = Math.round(seg.end * 1000);
      }
    }
    if (current) utterances.push(current);

    const speakerCount = new Set(utterances.map(u => u.speaker)).size;
    console.log(`[diarize] bg done — ${utterances.length} utterances, ${speakerCount} speakers jobId=${jobId}`);

    // Generate audio previews for each speaker (first 10-15 seconds)
    const speakerPreviews: Record<string, string> = {};
    const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))].sort();
    const tmpAudioPath = join("/tmp", `diarize_${jobId}_source.mp3`);

    try {
      // Download and save audio temporarily
      await writeFile(tmpAudioPath, audioBuffer);

      for (const speaker of uniqueSpeakers) {
        const speakerUtterances = utterances.filter(u => u.speaker === speaker);
        if (speakerUtterances.length === 0) continue;

        // Extract first 15 seconds of this speaker's audio
        let totalDuration = 0;
        const MAX_PREVIEW_DURATION = 15000; // 15 seconds in milliseconds
        const previewSegments: Array<{ start: number; end: number }> = [];

        for (const utt of speakerUtterances) {
          if (totalDuration >= MAX_PREVIEW_DURATION) break;
          const segmentDuration = utt.end - utt.start;
          if (segmentDuration < 500) continue; // Skip very short segments

          const remainingDuration = MAX_PREVIEW_DURATION - totalDuration;
          const useEnd = Math.min(utt.end, utt.start + remainingDuration);

          previewSegments.push({ start: utt.start, end: useEnd });
          totalDuration += (useEnd - utt.start);
        }

        if (previewSegments.length === 0) continue;

        // Extract and concatenate segments
        const segmentFiles: string[] = [];
        for (let i = 0; i < previewSegments.length; i++) {
          const seg = previewSegments[i];
          const segPath = join("/tmp", `diarize_${jobId}_${speaker}_seg${i}.mp3`);
          const startSec = seg.start / 1000;
          const endSec = seg.end / 1000;

          try {
            await execFileAsync("ffmpeg", [
              "-i", tmpAudioPath,
              "-ss", String(startSec),
              "-to", String(endSec),
              "-c:a", "libmp3lame", "-q:a", "4",
              "-y", segPath,
            ]);
            segmentFiles.push(segPath);
          } catch (e) {
            console.warn(`[diarize] failed to extract segment for speaker ${speaker}:`, e);
          }
        }

        if (segmentFiles.length === 0) continue;

        // Concatenate all segments into one preview file
        let previewBuffer: Buffer;
        if (segmentFiles.length === 1) {
          const fs = await import("fs/promises");
          previewBuffer = await fs.readFile(segmentFiles[0]);
        } else {
          const concatListPath = join("/tmp", `diarize_${jobId}_${speaker}_concat.txt`);
          const concatOutPath = join("/tmp", `diarize_${jobId}_${speaker}_preview.mp3`);
          const fs = await import("fs/promises");
          await fs.writeFile(concatListPath, segmentFiles.map(f => `file '${f}'`).join("\n"));

          await execFileAsync("ffmpeg", [
            "-f", "concat", "-safe", "0",
            "-i", concatListPath,
            "-c", "copy", "-y", concatOutPath,
          ]);

          previewBuffer = await fs.readFile(concatOutPath);
          await unlink(concatListPath).catch(() => {});
          await unlink(concatOutPath).catch(() => {});
        }

        // Upload preview to Hetzner (valid for 7 days)
        const previewKey = `translations/previews/${jobId}_speaker_${speaker}.mp3`;
        const previewUrl = await uploadToR2(previewKey, previewBuffer, "audio/mpeg");
        speakerPreviews[speaker] = previewUrl;

        // Cleanup segment files
        await Promise.all(segmentFiles.map(f => unlink(f).catch(() => {})));

        console.log(`[diarize] created preview for speaker ${speaker}: ${previewUrl}`);
      }
    } catch (e) {
      console.warn(`[diarize] failed to generate speaker previews:`, e);
    } finally {
      await unlink(tmpAudioPath).catch(() => {});
    }

    const result = JSON.stringify({ utterances, speakerCount, speakersDetected: speakerCount, speakerPreviews });
    await prisma.job.update({ where: { id: jobId }, data: { status: "done", audioUrl: result } });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[diarize] bg error jobId=${jobId}:`, errMsg);
    await prisma.job.update({ where: { id: jobId }, data: { status: "error", error: errMsg } });
  }
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[diarize] OPENAI_API_KEY no configurada");
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  const publicAudioBase = process.env.HETZNER_AUDIO_PUBLIC_URL ?? "https://elitelabs-audio.fsn1.your-objectstorage.com";

  let body: { fileKey: string; speakersExpected?: number | null; audioLanguage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  // speakersExpected kept in signature for frontend compatibility — OpenAI detects speakers automatically
  const { fileKey, speakersExpected: _speakersExpected, audioLanguage } = body;
  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

  const language = audioLanguage ?? "es";

  const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const job = await prisma.job.create({
    data: {
      userId: dbUser.id,
      status: "pending",
      text: fileKey,
      voiceId: "diarize",
      voiceName: "diarize",
      creditsUsed: 0,
    },
  });

  console.log(`[diarize] created jobId=${job.id} fileKey=${fileKey} lang=${language}`);

  processDiarizeInBackground(job.id, fileKey, language, apiKey, publicAudioBase)
    .catch(err => console.error("[diarize] unhandled bg error:", err));

  return NextResponse.json({ jobId: job.id });
}
