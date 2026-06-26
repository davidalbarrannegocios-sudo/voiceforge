import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_VOICE_SLOTS } from "@/lib/stripe";
import { getEffectivePlan } from "@/lib/plan";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const FISH_AUDIO_BASE = "https://api.fish.audio";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { _count: { select: { clonedVoices: true } } },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const effectivePlan = await getEffectivePlan(user.id, user.plan);
  const slotLimit = PLAN_VOICE_SLOTS[effectivePlan] ?? 0;
  if (slotLimit === 0) {
    return NextResponse.json(
      { error: "La clonación de voz no está disponible en tu plan actual." },
      { status: 403 }
    );
  }
  if (slotLimit !== -1 && user._count.clonedVoices >= slotLimit) {
    return NextResponse.json(
      { error: `Has alcanzado el límite de ${slotLimit} voces de tu plan.` },
      { status: 403 }
    );
  }

  const { audio_base64, voice_name, language } = await req.json() as {
    audio_base64: string;
    voice_name: string;
    language?: string;
  };

  if (!audio_base64 || !voice_name?.trim()) {
    return NextResponse.json({ error: "audio_base64 y voice_name son requeridos" }, { status: 400 });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key no configurada" }, { status: 500 });

  // Upload audio as a Fish Audio model
  const audioBuffer = Buffer.from(audio_base64, "base64");
  const form = new FormData();
  form.append("type", "tts");
  form.append("title", voice_name.trim());
  form.append("train_mode", "fast");
  form.append("visibility", "private");
  form.append("voices", new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" }), "design.wav");

  const fishRes = await fetch(`${FISH_AUDIO_BASE}/model`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!fishRes.ok) {
    const errText = await fishRes.text();
    log("error", "voice-design", "Fish Audio model creation error", { status: fishRes.status, error: errText }, user.id);
    return NextResponse.json({ error: `Error al guardar la voz (${fishRes.status})` }, { status: 502 });
  }

  const fishData = await fishRes.json() as { _id: string };
  if (!fishData._id) {
    return NextResponse.json({ error: "Fish Audio no devolvió un model ID" }, { status: 502 });
  }

  const clonedVoice = await prisma.clonedVoice.create({
    data: {
      userId: user.id,
      name: voice_name.trim(),
      referenceAudioUrl: fishData._id,
      language: language ?? "es",
      gender: "neutral",
      provider: "fish_audio",
    },
  });

  log("info", "voice-design", "voice design saved as model", { userId: user.id, voiceId: clonedVoice.id, fishModelId: fishData._id }, user.id);

  return NextResponse.json({ voiceId: clonedVoice.id, name: clonedVoice.name });
}
