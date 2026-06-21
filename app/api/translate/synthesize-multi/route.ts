import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fishAudioClone, fishAudioGenerateBuffer, convertToMp3 } from "@/lib/fishaudio";
import { downloadRawFromR2, uploadToR2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  let body: { utterances: TranslatedUtterance[]; sourceFileKey: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { utterances, sourceFileKey } = body;
  if (!utterances?.length) return NextResponse.json({ error: "utterances requeridas" }, { status: 400 });
  if (!sourceFileKey) return NextResponse.json({ error: "sourceFileKey requerido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  try {
    const ttsText = buildMultiSpeakerText(utterances);

    const rawBuffer = await downloadRawFromR2(sourceFileKey);
    const mp3Buffer = await convertToMp3(rawBuffer);

    const cloneResult = await fishAudioClone({
      audioBuffer: mp3Buffer,
      voiceName: `multi-ref-${Date.now()}`,
      model: "s2-pro",
    });

    const audioBuffer = await fishAudioGenerateBuffer({
      text: ttsText,
      referenceId: cloneResult.model_id,
      model: "s2-pro",
      normalize: false,
    });

    const key = `translations/multi/${user.id}/${Date.now()}.mp3`;
    const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");
    const duration_seconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;

    return NextResponse.json({ audioUrl, durationSeconds: duration_seconds });
  } catch (e) {
    console.error("[synthesize-multi] ERROR:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
