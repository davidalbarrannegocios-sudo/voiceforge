import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCredits } from "@/lib/utils";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { text, voice_id = "default" } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const creditsNeeded = calculateCredits(text.length);

  if (user.credits < creditsNeeded) {
    return NextResponse.json(
      {
        error: "Créditos insuficientes",
        creditsNeeded,
        creditsAvailable: user.credits,
      },
      { status: 402 }
    );
  }

  // For cloned voices, referenceAudioUrl holds the Fish Audio model ID
  let referenceId: string | undefined;
  if (voice_id !== "default") {
    const clonedVoice = await prisma.clonedVoice.findFirst({
      where: { id: voice_id, userId: user.id },
    });
    if (!clonedVoice) {
      return NextResponse.json({ error: "Voz clonada no encontrada" }, { status: 404 });
    }
    referenceId = clonedVoice.referenceAudioUrl;
    console.log(`[/api/generate] using Fish Audio model: ${referenceId}`);
  }

  let result;
  try {
    result = await fishAudioGenerate({
      text: text.trim(),
      referenceId,
      userId: user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/generate] Fish Audio error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: creditsNeeded } },
    }),
    prisma.generation.create({
      data: {
        userId: user.id,
        text: text.trim(),
        voiceId: voice_id,
        audioUrl: result.audio_url,
        durationSeconds: result.duration_seconds,
        creditsUsed: creditsNeeded,
      },
    }),
  ]);

  return NextResponse.json({
    audioUrl: result.audio_url,
    durationSeconds: result.duration_seconds,
    creditsUsed: creditsNeeded,
    creditsRemaining: updatedUser.credits,
  });
}
