import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPodClone } from "@/lib/runpod";

const CLONE_COST = 10;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  const voiceName = formData.get("voice_name") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Audio requerido" }, { status: 400 });
  }
  if (!voiceName || voiceName.trim().length === 0) {
    return NextResponse.json({ error: "Nombre de voz requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (user.credits < CLONE_COST) {
    return NextResponse.json(
      { error: "Créditos insuficientes. La clonación cuesta 10 créditos." },
      { status: 402 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  let result;
  try {
    result = await runPodClone({
      type: "clone",
      audio_base64: audioBase64,
      voice_name: voiceName.trim(),
      user_id: user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/clone] RunPod error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const referenceAudioUrl = `${process.env.R2_PUBLIC_URL}/reference-voices/${user.id}/${result.voice_id}.wav`;

  const [updatedUser, clonedVoice] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: CLONE_COST } },
    }),
    prisma.clonedVoice.create({
      data: {
        userId: user.id,
        name: voiceName.trim(),
        referenceAudioUrl,
      },
    }),
  ]);

  return NextResponse.json({
    voiceId: clonedVoice.id,
    name: clonedVoice.name,
    creditsRemaining: updatedUser.credits,
  });
}
