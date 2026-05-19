import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";

const PREVIEW_TEXT = "Hola, esta es una muestra de mi voz. Espero que te guste.";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { reference_id } = await req.json();

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  try {
    const result = await fishAudioGenerate({
      text: PREVIEW_TEXT,
      referenceId: reference_id ?? undefined,
      userId: user.id,
    });
    return NextResponse.json({ audioUrl: result.audio_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/preview-voice] error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
