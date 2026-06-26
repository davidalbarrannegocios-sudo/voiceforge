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

  const rawBuffer = await downloadRawFromR2(sourceFileKey);
  const mp3Buffer = await convertToMp3(rawBuffer);

  const sessionId = randomUUID();
  const sourceAudioPath = join("/tmp", `synth_${sessionId}_source.mp3`);

  // Track cloned models for cleanup in finally
  const clonedSpeakers: Array<{ speaker: string; modelId: string }> = [];

  try {
    await writeFile(sourceAudioPath, mp3Buffer);

    // One model per speaker — extract ONLY that speaker's segments
    const speakerOrder = [...new Set(utterances.map(u => u.speaker))].sort();

    for (const speaker of speakerOrder) {
      const speakerSegments = utterances.filter(u => u.speaker === speaker);
      console.log("[synthesize-multi] creando modelo para speaker", speaker, "con", speakerSegments.length, "segmentos");

      const chunks: Buffer[] = [];
      let totalDuration = 0;

      for (const utt of speakerSegments) {
        if (totalDuration >= 60) break;
        const startSecs = utt.start / 1000;
        const endSecs = utt.end / 1000;
        const duration = endSecs - startSecs;
        if (duration < 0.5) continue;

        const chunkPath = join("/tmp", `synth_${sessionId}_spk${speaker}_c${chunks.length}.mp3`);
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
        console.warn(`[synthesize-multi] speaker ${speaker}: sin chunks válidos, omitiendo`);
        continue;
      }

      let sampleBuffer: Buffer;
      if (chunks.length === 1) {
        sampleBuffer = chunks[0];
      } else {
        const chunkPaths: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const p = join("/tmp", `synth_${sessionId}_spk${speaker}_m${i}.mp3`);
          await writeFile(p, chunks[i]);
          chunkPaths.push(p);
        }
        const concatListPath = join("/tmp", `synth_${sessionId}_spk${speaker}_list.txt`);
        const concatOutPath = join("/tmp", `synth_${sessionId}_spk${speaker}_merged.mp3`);
        await writeFile(concatListPath, chunkPaths.map(p => `file '${p}'`).join("\n"));
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
        clonedSpeakers.push({ speaker, modelId: cloneResult.model_id });
        console.log(`[synthesize-multi] speaker ${speaker} clonado → ${cloneResult.model_id} (${Math.round(totalDuration)}s)`);
      } catch (e) {
        console.error(`[synthesize-multi] clone falló para speaker ${speaker}:`, e);
      }
    }

    console.log("[synthesize-multi] modelos creados:", clonedSpeakers.map(m => `${m.speaker}:${m.modelId}`));

    if (clonedSpeakers.length === 0) {
      return NextResponse.json({ error: "No se pudo clonar ninguna voz" }, { status: 500 });
    }

    // Index map is derived from clonedSpeakers order — speaker:0 → clonedSpeakers[0], etc.
    const speakerIndexMap: Record<string, number> = Object.fromEntries(
      clonedSpeakers.map((m, i) => [m.speaker, i])
    );
    const referenceIds = clonedSpeakers.map(m => m.modelId);
    console.log("[synthesize-multi] reference_id array:", referenceIds);

    // Only include utterances whose speaker was successfully cloned
    const ttsText = utterances
      .filter(u => speakerIndexMap[u.speaker] !== undefined)
      .map(u => `<|speaker:${speakerIndexMap[u.speaker]}|>${u.translatedText}`)
      .join("");

    let audioBuffer: Buffer;
    try {
      audioBuffer = await fishAudioGenerateBuffer({
        text: ttsText,
        references: referenceIds.map(id => ({ type: "model_id" as const, value: id })),
        model: "s2-pro",
        normalize: false,
      });
    } finally {
      await Promise.all(clonedSpeakers.map(m => fishAudioDeleteModel(m.modelId).catch(() => {})));
      clonedSpeakers.length = 0; // prevent double-delete in outer finally
    }

    const key = `translations/multi/${userId}/${Date.now()}.mp3`;
    const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");
    const durationSeconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;

    return NextResponse.json({ audioUrl, durationSeconds, r2Key: key });
  } finally {
    await unlink(sourceAudioPath).catch(() => {});
    // Guard: delete any models not yet cleaned up (e.g. error before TTS)
    if (clonedSpeakers.length > 0) {
      await Promise.all(clonedSpeakers.map(m => fishAudioDeleteModel(m.modelId).catch(() => {})));
    }
  }
}
