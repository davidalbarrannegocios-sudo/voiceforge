import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";

const PREVIEW_TEXT = "Hola, esta es una muestra de mi voz. Espero que te guste.";
const PREVIEW_COST = calculateCharCost(PREVIEW_TEXT.length);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { voiceId } = await params;

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const charCost = PREVIEW_COST;
  const totalAvailable = user.credits + user.extraCredits;

  console.log('[voice-preview] userId:', user.id, 'chars:', PREVIEW_TEXT.length, 'disponibles:', totalAvailable);

  if (totalAvailable < charCost) {
    console.log('[voice-preview] créditos insuficientes:', totalAvailable, '<', charCost);
    return NextResponse.json(
      { error: "Créditos insuficientes", charCost, charsAvailable: totalAvailable },
      { status: 402 }
    );
  }

  const fromPlan = Math.min(user.credits, charCost);
  const fromExtra = charCost - fromPlan;

  await prisma.user.update({
    where: { id: user.id },
    data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
  });

  console.log('[voice-preview] créditos descontados:', charCost, '(plan:', fromPlan, '+ extra:', fromExtra, ')');

  const cached = await prisma.voicePreview.findUnique({ where: { voiceId } });
  if (cached) {
    return NextResponse.json({ audioUrl: cached.audioUrl, charCost });
  }

  try {
    const result = await fishAudioGenerate({
      text: PREVIEW_TEXT,
      referenceId: voiceId,
      userId: user.id,
    });

    await prisma.voicePreview.create({
      data: { voiceId, audioUrl: result.audio_url },
    });

    return NextResponse.json({ audioUrl: result.audio_url, charCost });
  } catch (err) {
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } },
    });
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/voice-preview] error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
