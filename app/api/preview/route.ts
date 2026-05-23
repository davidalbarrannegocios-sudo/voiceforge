import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const FISH_AUDIO_BASE = "https://api.fish.audio";
const PREVIEW_TEXT = "Hola, esta es una muestra de cómo sonaré con tu configuración actual.";

// In-memory rate limit: userId → last preview timestamp
const lastPreview = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Rate limit: 1 preview per 10 seconds per user
  const now = Date.now();
  const last = lastPreview.get(user.id) ?? 0;
  const remaining = RATE_LIMIT_MS - (now - last);
  if (remaining > 0) {
    return NextResponse.json(
      { error: `Espera ${Math.ceil(remaining / 1000)}s antes de otra pre-escucha` },
      { status: 429 }
    );
  }
  lastPreview.set(user.id, now);

  const { reference_id, prosody } = await req.json() as {
    reference_id?: string;
    prosody?: { speed?: number; volume?: number; pitch?: number };
  };

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key no configurada" }, { status: 500 });

  const payload: Record<string, unknown> = {
    text: PREVIEW_TEXT,
    format: "mp3",
    mp3_bitrate: 128,
    normalize: true,
    latency: "normal",
    chunk_length: 200,
  };

  if (reference_id) payload.reference_id = reference_id;

  if (prosody && (prosody.speed !== 1 || prosody.volume !== 1 || prosody.pitch !== 0)) {
    payload.prosody = {
      speed: prosody.speed,
      volume: prosody.volume,
      pitch: prosody.pitch !== undefined && prosody.pitch !== 0
        ? `${prosody.pitch > 0 ? "+" : ""}${prosody.pitch}st`
        : undefined,
    };
  }

  const res = await fetch(`${FISH_AUDIO_BASE}/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: req.signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[preview] Fish Audio error (${res.status}):`, errText);
    return NextResponse.json({ error: "Error al generar la pre-escucha" }, { status: 502 });
  }

  const audioBuffer = await res.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
