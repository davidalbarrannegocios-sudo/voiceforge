import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const file = formData.get("audio") as File | null;
  const voiceName = (formData.get("voice_name") as string | null)?.trim();
  const languageTag = (formData.get("language_tag") as string | null) ?? "es";
  const genderTag = (formData.get("gender_tag") as string | null) ?? "male";
  const needNoiseReduction = formData.get("need_noise_reduction") === "true";

  if (!file) return NextResponse.json({ error: "Archivo de audio requerido" }, { status: 400 });
  if (!voiceName) return NextResponse.json({ error: "Nombre de voz requerido" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Build multipart payload for ai33.pro
  const upstream = new FormData();
  upstream.append("file", file);
  upstream.append("voice_name", voiceName);
  upstream.append("language_tag", languageTag);
  upstream.append("gender_tag", genderTag);
  upstream.append("need_noise_reduction", String(needNoiseReduction));

  const res = await fetch("https://api.ai33.pro/v1m/voice/clone", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: upstream,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `ai33.pro error ${res.status}: ${text}` }, { status: res.status });
  }

  const data = (await res.json()) as { success?: boolean; cloned_voice_id?: number | string };

  if (!data.success || data.cloned_voice_id == null) {
    return NextResponse.json({ error: "ai33.pro no devolvió cloned_voice_id" }, { status: 500 });
  }

  const minimaxVoiceId = String(data.cloned_voice_id);

  await prisma.clonedVoice.create({
    data: {
      userId: user.id,
      name: voiceName,
      referenceAudioUrl: "",
      language: languageTag,
      gender: genderTag === "female" ? "feminine" : "masculine",
      isPublic: false,
      provider: "minimax",
      minimaxVoiceId,
    },
  });

  return NextResponse.json({ success: true, minimaxVoiceId });
}
