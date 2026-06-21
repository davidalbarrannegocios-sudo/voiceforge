import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { downloadRawFromR2 } from "@/lib/r2";
import { convertToMp3 } from "@/lib/fishaudio";
import { mergeSegmentsBySpeaker, DiarizedSegment } from "@/lib/translate-processor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey = process.env.FISH_AUDIO_API_KEY;
  if (!fishKey) return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });

  let body: { fileKey: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { fileKey } = body;
  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

  try {
    const rawBuffer = await downloadRawFromR2(fileKey);
    const mp3Buffer = await convertToMp3(rawBuffer);

    const asrForm = new FormData();
    asrForm.append("audio", new Blob([new Uint8Array(mp3Buffer)], { type: "audio/mpeg" }), "audio.mp3");
    asrForm.append("identify_speakers", "true");

    const asrRes = await fetch("https://api.fish.audio/v1/asr", {
      method: "POST",
      headers: { Authorization: `Bearer ${fishKey}` },
      body: asrForm,
    });

    if (!asrRes.ok) {
      const err = await asrRes.text();
      return NextResponse.json({ error: `Error en transcripción (${asrRes.status}): ${err}` }, { status: 500 });
    }

    const asrData = await asrRes.json();
    const rawSegments: DiarizedSegment[] = asrData.segments ?? [];
    const fullText: string = asrData.text?.trim() ?? "";

    let segments: DiarizedSegment[];
    if (rawSegments.length > 0) {
      segments = mergeSegmentsBySpeaker(rawSegments);
    } else {
      segments = fullText
        ? [{ speaker: "SPEAKER_0", text: fullText, start: 0, end: 0 }]
        : [];
    }

    const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];

    return NextResponse.json({
      segments,
      speakerCount: uniqueSpeakers.length || 1,
      fullText,
    });
  } catch (e) {
    console.error("[translate-preview] ERROR:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
