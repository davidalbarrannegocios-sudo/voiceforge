import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioClone } from "@/lib/fishaudio";
import { PLAN_VOICE_SLOTS } from "@/lib/stripe";
import { getEffectivePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 120;


export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  const voiceName = formData.get("voice_name") as string | null;
  const language = (formData.get("language") as string | null) ?? "es";
  const gender = (formData.get("gender") as string | null) ?? "masculine";
  const model = (formData.get("model") as string | null) ?? "s2-pro";
  const enhanceAudio = formData.get("enhance_audio") !== "false";
  const generateSample = formData.get("generate_sample") !== "false";

  if (!file) return NextResponse.json({ error: "Audio requerido" }, { status: 400 });
  if (!voiceName || voiceName.trim().length === 0)
    return NextResponse.json({ error: "Nombre de voz requerido" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { _count: { select: { clonedVoices: true } } },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const effectivePlan = await getEffectivePlan(user.id, user.plan);

  // Slot limit check (-1 = unlimited)
  const slotLimit = PLAN_VOICE_SLOTS[effectivePlan] ?? 0;
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


  const audioBuffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await fishAudioClone({ audioBuffer, voiceName: voiceName.trim(), model, enhanceAudio, generateSample });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/clone] Fish Audio error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const clonedVoice = await prisma.clonedVoice.create({
    data: {
      userId: user.id,
      name: voiceName.trim(),
      referenceAudioUrl: result.model_id,
      language,
      gender,
    },
  });

  return NextResponse.json({
    voiceId: clonedVoice.id,
    name: clonedVoice.name,
    creditsRemaining: user.credits,
    sampleUrl: result.sampleUrl ?? null,
  });
}
