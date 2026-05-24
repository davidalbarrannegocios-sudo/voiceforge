import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToR2, r2KeyExists, getPublicUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

const FISH_AUDIO_BASE = "https://api.fish.audio";
const PREVIEW_TEXT = "Hola, esta es mi voz clonada con Elite Labs.";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { voiceId } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const voice = await prisma.clonedVoice.findUnique({
      where: { id: voiceId },
      select: { id: true, userId: true, referenceAudioUrl: true },
    });
    if (!voice) return NextResponse.json({ error: "Voz no encontrada" }, { status: 404 });
    if (voice.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const fishModelId = voice.referenceAudioUrl;
    const r2Key = `voice-previews/${fishModelId}.mp3`;

    if (await r2KeyExists(r2Key)) {
      return NextResponse.json({ url: getPublicUrl(r2Key) });
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key no configurada" }, { status: 500 });

    const res = await fetch(`${FISH_AUDIO_BASE}/v1/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: PREVIEW_TEXT,
        reference_id: fishModelId,
        format: "mp3",
        mp3_bitrate: 128,
        normalize: true,
        latency: "normal",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[voice-preview] Fish Audio error:", errText);
      return NextResponse.json({ error: "Error al generar el preview" }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    const url = await uploadToR2(r2Key, audioBuffer, "audio/mpeg");

    return NextResponse.json({ url });
  } catch (e) {
    console.error("[voice-preview]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
