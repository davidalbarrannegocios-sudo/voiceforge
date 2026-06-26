import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const FISH_AUDIO_BASE = "https://api.fish.audio";
const DESIGN_CREDIT_COST = 500;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const totalAvailable = user.credits + user.extraCredits;
  if (totalAvailable < DESIGN_CREDIT_COST) {
    return NextResponse.json(
      { error: "Créditos insuficientes", charCost: DESIGN_CREDIT_COST, charsAvailable: totalAvailable },
      { status: 402 }
    );
  }

  const { instruction, reference_text, language, n, speed, num_step, guidance_scale, instruct_guidance_scale, seed } = await req.json() as {
    instruction: string;
    reference_text?: string;
    language?: string;
    n?: number;
    speed?: number;
    num_step?: number;
    guidance_scale?: number;
    instruct_guidance_scale?: number;
    seed?: number;
  };

  if (!instruction || instruction.trim().length === 0) {
    return NextResponse.json({ error: "La descripción de la voz es requerida" }, { status: 400 });
  }

  const numCandidates = Math.max(1, Math.min(4, n ?? 1));

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key no configurada" }, { status: 500 });

  const fishRes = await fetch(`${FISH_AUDIO_BASE}/v1/voice-design`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: "voice-design-1",
    },
    body: JSON.stringify({
      instruction: instruction.trim(),
      ...(reference_text?.trim() ? { reference_text: reference_text.trim() } : {}),
      ...(language ? { language } : {}),
      n: numCandidates,
      ...(speed !== undefined ? { speed } : {}),
      ...(num_step !== undefined ? { num_step } : {}),
      ...(guidance_scale !== undefined ? { guidance_scale } : {}),
      ...(instruct_guidance_scale !== undefined ? { instruct_guidance_scale } : {}),
      ...(seed !== undefined ? { seed } : {}),
    }),
  });

  if (!fishRes.ok) {
    const errText = await fishRes.text();
    log("error", "voice-design", "Fish Audio error", { status: fishRes.status, error: errText }, user.id);
    return NextResponse.json(
      { error: `Error al generar voces (${fishRes.status})` },
      { status: 502 }
    );
  }

  const data = await fishRes.json() as {
    candidates: { id: string; index: number; audio_base64: string; sample_rate: number; duration_ms: number }[];
  };

  // Deduct credits after successful generation
  const fromPlan = Math.min(user.credits, DESIGN_CREDIT_COST);
  const fromExtra = DESIGN_CREDIT_COST - fromPlan;
  await prisma.user.update({
    where: { id: user.id },
    data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
  });

  log("info", "voice-design", "voice design generated", { userId: user.id, candidates: data.candidates?.length ?? 0 }, user.id);

  return NextResponse.json({ candidates: data.candidates ?? [] });
}
