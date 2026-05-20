import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { text, reference_id } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const isCloned = reference_id
    ? !!(await prisma.clonedVoice.findFirst({ where: { userId: user.id, referenceAudioUrl: reference_id } }))
    : false;
  const charCost = calculateCharCost(text.trim().length);

  if (user.credits < charCost) {
    return NextResponse.json(
      { error: "Caracteres insuficientes", charCost, charsAvailable: user.credits },
      { status: 402 }
    );
  }

  console.log(`[/api/generate] reference_id=${reference_id ?? "default"} chars=${text.trim().length}`);

  let result;
  try {
    result = await fishAudioGenerate({
      text: text.trim(),
      referenceId: reference_id ?? undefined,
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
      data: { credits: { decrement: charCost } },
    }),
    prisma.generation.create({
      data: {
        userId: user.id,
        text: text.trim(),
        voiceId: reference_id ?? "default",
        audioUrl: result.audio_url,
        durationSeconds: result.duration_seconds,
        creditsUsed: charCost,
      },
    }),
  ]);

  return NextResponse.json({
    audioUrl: result.audio_url,
    durationSeconds: result.duration_seconds,
    charsUsed: charCost,
    charsRemaining: updatedUser.credits,
  });
}
