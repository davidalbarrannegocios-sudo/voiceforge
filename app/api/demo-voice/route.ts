import { NextResponse } from "next/server";
import { uploadToR2, getPublicUrl, r2KeyExists } from "@/lib/r2";

export const runtime = "nodejs";

const TEXTS: Record<string, string> = {
  hero: "Hola, soy una voz generada con inteligencia artificial. La calidad es excepcional y el resultado suena completamente natural.",
  features: "Bienvenidos a este episodio del podcast. Hoy vamos a hablar sobre el futuro de la inteligencia artificial y cómo está cambiando el mundo.",
};

export async function POST(req: Request) {
  const { voiceId, section = "hero" } = await req.json();
  const prefix = section === "features" ? "features" : "sample";
  const key = `demo/${prefix}-${voiceId ?? "default"}.mp3`;
  const text = TEXTS[section] ?? TEXTS.hero;

  if (await r2KeyExists(key)) {
    return NextResponse.json({ audioUrl: getPublicUrl(key) });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      format: "mp3",
      mp3_bitrate: 128,
      normalize: true,
      latency: "normal",
      ...(voiceId ? { reference_id: voiceId } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[demo-voice] Fish Audio error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 502 });
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");

  return NextResponse.json({ audioUrl });
}
