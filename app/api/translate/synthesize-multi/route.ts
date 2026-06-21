import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { downloadRawFromR2, uploadToR2 } from "@/lib/r2";
import { convertToMp3, fishAudioClone, fishAudioGenerateBuffer } from "@/lib/fishaudio";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  // Download and convert source audio for voice cloning
  const rawBuffer = await downloadRawFromR2(sourceFileKey);
  const mp3Buffer = await convertToMp3(rawBuffer);

  // Clone original audio as multi-speaker reference
  const cloneResult = await fishAudioClone({
    audioBuffer: mp3Buffer,
    voiceName: `multi-ref-${Date.now().toString(36)}`,
    model: "s2-pro",
  });

  // Build <|speaker:N|>text format
  const ttsText = buildMultiSpeakerText(utterances);

  // Generate audio with Fish TTS S2
  const audioBuffer = await fishAudioGenerateBuffer({
    text: ttsText,
    referenceId: cloneResult.model_id,
    model: "s2-pro",
    normalize: false,
  });

  // Upload to translations/multi/{userId}/{timestamp}.mp3
  const key = `translations/multi/${userId}/${Date.now()}.mp3`;
  const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");
  const durationSeconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;

  return NextResponse.json({ audioUrl, durationSeconds, r2Key: key });
}
