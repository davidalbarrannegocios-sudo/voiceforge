import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { downloadRawFromR2, uploadToR2 } from "@/lib/r2";
import { convertToMp3, fishAudioClone, fishAudioDeleteModel, fishAudioGenerateBuffer } from "@/lib/fishaudio";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

interface TranslatedUtterance extends AssemblyAIUtterance {
  translatedText: string;
}

function buildMultiSpeakerText(utterances: TranslatedUtterance[]): string {
  const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
  const speakerIndex: Record<string, number> = Object.fromEntries(speakers.map((s, i) => [s, i]));
  return utterances.map(u => `<|speaker:${speakerIndex[u.speaker]}|>${u.translatedText}`).join("");
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { utterances: TranslatedUtterance[]; sourceFileKey: string; userId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { utterances, sourceFileKey, userId } = body;
  if (!utterances?.length) return NextResponse.json({ error: "utterances requerido" }, { status: 400 });
  if (!sourceFileKey) return NextResponse.json({ error: "sourceFileKey requerido" }, { status: 400 });

  // Download and convert source audio to MP3 once
  const rawBuffer = await downloadRawFromR2(sourceFileKey);
  const mp3Buffer = await convertToMp3(rawBuffer);

  const sessionId = randomUUID();
  const sourceAudioPath = join("/tmp", `synth_${sessionId}_source.mp3`);

  try {
    await writeFile(sourceAudioPath, mp3Buffer);

    const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
    const speakerVoiceIds: Record<string, string> = {};

    for (const speaker of speakers) {
      const speakerUtterances = utterances.filter(u => u.speaker === speaker);
      const chunks: Buffer[] = [];
      let totalDuration = 0;

      for (const utt of speakerUtterances) {
        if (totalDuration >= 60) break;
        const startSecs = utt.start / 1000;
        const endSecs = utt.end / 1000;
        const duration = endSecs - startSecs;
        if (duration < 0.5) continue;

        const chunkPath = join("/tmp", `synth_${sessionId}_spk${speaker}_chunk${chunks.length}.mp3`);
        try {
          await execFileAsync("ffmpeg", [
            "-i", sourceAudioPath,
            "-ss", String(startSecs),
            "-to", String(endSecs),
            "-c:a", "libmp3lame", "-q:a", "4",
            "-y", chunkPath,
          ]);
          const buf = await readFile(chunkPath);
          if (buf.length > 1000) {
            chunks.push(buf);
            totalDuration += duration;
          }
          await unlink(chunkPath).catch(() => {});
        } catch { continue; }
      }

      if (chunks.length === 0) {
        console.warn(`[synthesize-multi] No chunks for speaker ${speaker}, skipping clone`);
        continue;
      }

      let sampleBuffer: Buffer;
      if (chunks.length === 1) {
        sampleBuffer = chunks[0];
      } else {
        const concatListPath = join("/tmp", `synth_${sessionId}_spk${speaker}_list.txt`);
        const concatOutPath = join("/tmp", `synth_${sessionId}_spk${speaker}_sample.mp3`);
        const chunkPaths: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const p = join("/tmp", `synth_${sessionId}_spk${speaker}_c${i}.mp3`);
          await writeFile(p, chunks[i]);
          chunkPaths.push(p);
        }

        const concatContent = chunkPaths.map(p => `file '${p}'`).join("\n");
        await writeFile(concatListPath, concatContent);

        await execFileAsync("ffmpeg", [
          "-f", "concat", "-safe", "0",
          "-i", concatListPath,
          "-c", "copy", "-y", concatOutPath,
        ]);

        sampleBuffer = await readFile(concatOutPath);

        await Promise.all([
          ...chunkPaths.map(p => unlink(p).catch(() => {})),
          unlink(concatListPath).catch(() => {}),
          unlink(concatOutPath).catch(() => {}),
        ]);
      }

      try {
        const cloneResult = await fishAudioClone({
          audioBuffer: sampleBuffer,
          voiceName: `spk-${speaker}-${Date.now().toString(36)}`,
          model: "s2-pro",
        });
        speakerVoiceIds[speaker] = cloneResult.model_id;
        console.log(`[synthesize-multi] Cloned speaker ${speaker} → ${cloneResult.model_id} (${Math.round(totalDuration)}s sample)`);
      } catch (e) {
        console.error(`[synthesize-multi] Clone failed for speaker ${speaker}:`, e);
      }
    }

    if (Object.keys(speakerVoiceIds).length === 0) {
      return NextResponse.json({ error: "No se pudo clonar ninguna voz" }, { status: 500 });
    }

    // Build references array in speaker-index order (speaker:0 → first reference, etc.)
    const speakerOrder = [...new Set(utterances.map(u => u.speaker))].sort();
    const references = speakerOrder
      .filter(s => speakerVoiceIds[s])
      .map(s => ({ type: "model_id" as const, value: speakerVoiceIds[s] }));

    const ttsText = buildMultiSpeakerText(utterances);

    let audioBuffer: Buffer;
    try {
      audioBuffer = await fishAudioGenerateBuffer({
        text: ttsText,
        references,
        model: "s2-pro",
        normalize: false,
      });
    } finally {
      // Delete all cloned speaker models regardless of TTS success/failure
      await Promise.all(
        Object.values(speakerVoiceIds).map(id => fishAudioDeleteModel(id).catch(() => {}))
      );
    }

    const key = `translations/multi/${userId}/${Date.now()}.mp3`;
    const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");
    const durationSeconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;

    return NextResponse.json({ audioUrl, durationSeconds, r2Key: key });
  } finally {
    await unlink(sourceAudioPath).catch(() => {});
  }
}
