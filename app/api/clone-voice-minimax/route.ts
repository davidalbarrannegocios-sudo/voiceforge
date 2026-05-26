import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_POLL_ATTEMPTS = 60; // 60 × 3s = 3 min
const POLL_INTERVAL_MS = 3000;

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

  const file = formData.get("file") as File | null;
  const voiceName = (formData.get("voice_name") as string | null)?.trim();
  const languageTag = (formData.get("language_tag") as string | null) ?? "es";
  const genderTag = (formData.get("gender_tag") as string | null) ?? "male";
  const needNoiseReduction = formData.get("need_noise_reduction") === "true";

  if (!file) return NextResponse.json({ error: "Archivo de audio requerido" }, { status: 400 });
  if (!voiceName) return NextResponse.json({ error: "Nombre de voz requerido" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const proxyFd = new FormData();
  proxyFd.append("file", file);
  proxyFd.append("voice_name", voiceName);
  proxyFd.append("language_tag", languageTag);
  proxyFd.append("gender_tag", genderTag);
  proxyFd.append("need_noise_reduction", String(needNoiseReduction));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 280000);

  let cloneData: { cloned_voice_id?: number | string; task_id?: string; detail?: string };
  try {
    const res = await fetch("https://api.ai33.pro/v1m/voice/clone", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: proxyFd,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const raw = await res.text();
    console.log("[clone-minimax] ai33.pro status:", res.status, raw.slice(0, 200));

    try { cloneData = JSON.parse(raw); } catch { cloneData = {}; }

    if (!res.ok) {
      return NextResponse.json(
        { error: cloneData.detail || `ai33.pro error ${res.status}: ${raw.slice(0, 200)}` },
        { status: 500 }
      );
    }
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[clone-minimax] upload error:", msg);
    return NextResponse.json({ error: `Error subiendo a ai33.pro: ${msg}` }, { status: 500 });
  }

  let minimaxVoiceId = "";

  if (cloneData.cloned_voice_id != null) {
    minimaxVoiceId = String(cloneData.cloned_voice_id);
    console.log("[clone-minimax] sync voiceId:", minimaxVoiceId);
  } else if (cloneData.task_id) {
    console.log("[clone-minimax] polling task_id:", cloneData.task_id);
    let resolved = false;
    for (let i = 1; i <= MAX_POLL_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const pollRes = await fetch(`https://api.ai33.pro/v1/task/${cloneData.task_id}`, {
          headers: { "xi-api-key": apiKey },
          signal: AbortSignal.timeout(15000),
        });
        const pollData = await pollRes.json() as { status?: string; metadata?: Record<string, unknown> };
        console.log(`[clone-minimax] poll ${i}/${MAX_POLL_ATTEMPTS} status:`, pollData.status);
        if (pollData.status === "done") {
          const meta = pollData.metadata ?? {};
          const vid = meta.cloned_voice_id ?? meta.voice_id ?? meta.id ?? meta.minimaxVoiceId;
          if (!vid) return NextResponse.json({ error: "Clonación completada pero sin voice_id" }, { status: 500 });
          minimaxVoiceId = String(vid);
          resolved = true;
          break;
        }
        if (pollData.status === "error" || pollData.status === "failed") {
          return NextResponse.json({ error: "ai33.pro: clonación fallida en el servidor" }, { status: 500 });
        }
      } catch (e) {
        console.warn(`[clone-minimax] poll ${i} error:`, e instanceof Error ? e.message : e);
      }
    }
    if (!resolved) return NextResponse.json({ error: "Tiempo agotado esperando la clonación (3 min)" }, { status: 504 });
  } else {
    return NextResponse.json({ error: "ai33.pro no devolvió cloned_voice_id ni task_id" }, { status: 500 });
  }

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

  console.log("[clone-minimax] done voiceId:", minimaxVoiceId);
  return NextResponse.json({ ok: true, minimaxVoiceId });
}
