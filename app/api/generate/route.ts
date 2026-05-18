import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPodGenerate } from "@/lib/runpod";
import { calculateCredits } from "@/lib/utils";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { text, voice_id = "default", exaggeration = 0.5 } = await req.json();

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

  const result = await runPodGenerate({
    type: "generate",
    text: text.trim(),
    voice_id,
    exaggeration,
    user_id: user.id,
  });

  const [updatedUser, generation] = await prisma.$transaction([
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
