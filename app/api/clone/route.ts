import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioClone } from "@/lib/fishaudio";
import { PLAN_VOICE_SLOTS } from "@/lib/stripe";

const CLONE_COST = 10;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  const voiceName = formData.get("voice_name") as string | null;

  if (!file) return NextResponse.json({ error: "Audio requerido" }, { status: 400 });
  if (!voiceName || voiceName.trim().length === 0)
    return NextResponse.json({ error: "Nombre de voz requerido" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { _count: { select: { clonedVoices: true } } },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Slot limit check (-1 = unlimited)
  const slotLimit = PLAN_VOICE_SLOTS[user.plan] ?? 0;
  if (slotLimit === 0) {
    return NextResponse.json(
      { error: "La clonación de voz no está disponible en el plan gratuito. Actualiza tu plan para clonar voces." },
      { status: 403 }
    );
  }
  if (slotLimit !== -1 && user._count.clonedVoices >= slotLimit) {
    return NextResponse.json(
      { error: `Has alcanzado el límite de ${slotLimit} voces clonadas de tu plan. Actualiza tu plan para clonar más voces.` },
      { status: 403 }
    );
  }

  if (user.credits < CLONE_COST) {
    return NextResponse.json(
      { error: "Créditos insuficientes. La clonación cuesta 10 créditos." },
      { status: 402 }
    );
  }

  const audioBuffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await fishAudioClone({ audioBuffer, voiceName: voiceName.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/clone] Fish Audio error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const [updatedUser, clonedVoice] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: CLONE_COST } },
    }),
    prisma.clonedVoice.create({
      data: {
        userId: user.id,
        name: voiceName.trim(),
        referenceAudioUrl: result.model_id,
      },
    }),
  ]);

  return NextResponse.json({
    voiceId: clonedVoice.id,
    name: clonedVoice.name,
    creditsRemaining: updatedUser.credits,
  });
}
