import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";

const PREVIEW_TEXT = "Hola, esta es una muestra de mi voz. Espero que te guste.";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { voiceId } = await params;

  const cached = await prisma.voicePreview.findUnique({ where: { voiceId } });
  if (cached) {
    return NextResponse.json({ audioUrl: cached.audioUrl });
  }

  try {
    const result = await fishAudioGenerate({
      text: PREVIEW_TEXT,
      referenceId: voiceId,
      userId: "preview",
    });

    await prisma.voicePreview.create({
      data: { voiceId, audioUrl: result.audio_url },
    });

    return NextResponse.json({ audioUrl: result.audio_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/voice-preview] error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
