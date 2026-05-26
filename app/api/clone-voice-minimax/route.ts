import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_POLL_ATTEMPTS = 40;
const POLL_INTERVAL_MS = 3000;

async function pollCloneTask(taskId: string, apiKey: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    let pollRes: Response;
    try {
      pollRes = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      console.warn(`[clone-voice-minimax] [polling] intento ${attempt}/${MAX_POLL_ATTEMPTS} fetch error:`, e);
      continue;
    }

    const pollText = await pollRes.text();
    let taskData: { status?: string; metadata?: Record<string, unknown> };
    try {
      taskData = JSON.parse(pollText);
    } catch {
      console.warn(`[clone-voice-minimax] [polling] intento ${attempt}/${MAX_POLL_ATTEMPTS} non-JSON: ${pollText.slice(0, 200)}`);
      continue;
    }

    console.log(`[clone-voice-minimax] [polling] intento ${attempt}/${MAX_POLL_ATTEMPTS}, status:`, taskData.status);

    if (taskData.status === "done") {
      const meta = taskData.metadata ?? {};
      const voiceId =
        meta.cloned_voice_id ??
        meta.voice_id ??
        meta.id ??
        meta.minimaxVoiceId;
      if (!voiceId) throw new Error(`Tarea completada pero sin voice_id en metadata: ${JSON.stringify(meta)}`);
      return String(voiceId);
    }

    if (taskData.status === "error" || taskData.status === "failed") {
      throw new Error(`ai33.pro: clonación fallida en servidor remoto (status=${taskData.status})`);
    }
  }

  throw new Error(`timeout_408`);
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) {
    console.error("[clone-voice-minimax] SK_AI33_KEY not configured");
    return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });
  }

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

  const upstream = new FormData();
  upstream.append("file", file);
  upstream.append("voice_name", voiceName);
  upstream.append("language_tag", languageTag);
  upstream.append("gender_tag", genderTag);
  upstream.append("need_noise_reduction", String(needNoiseReduction));

  console.log(`[clone-voice-minimax] sending to ai33.pro: voice_name=${voiceName} language=${languageTag} gender=${genderTag} noise=${needNoiseReduction} fileSize=${file.size}`);

  const controller = new AbortController();
  const uploadTimeout = setTimeout(() => controller.abort(), 120000);

  let res: Response;
  try {
    res = await fetch("https://api.ai33.pro/v1m/voice/clone", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
      signal: controller.signal,
    });
  } catch (e) {
    const isTimeout = controller.signal.aborted;
    console.error("[clone-voice-minimax] initial fetch error:", e);
    return NextResponse.json(
      { error: isTimeout ? "Tiempo de espera agotado al subir el audio. Inténtalo de nuevo." : "Error de conexión con ai33.pro" },
      { status: isTimeout ? 408 : 502 }
    );
  } finally {
    clearTimeout(uploadTimeout);
  }

  const rawText = await res.text();
  console.log(`[clone-voice-minimax] ai33.pro response status=${res.status} body=${rawText.slice(0, 500)}`);

  if (!res.ok) {
    return NextResponse.json({ error: `ai33.pro error ${res.status}: ${rawText}` }, { status: res.status });
  }

  let data: { success?: boolean; cloned_voice_id?: number | string; task_id?: string };
  try {
    data = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: `ai33.pro devolvió respuesta no-JSON (status ${res.status}): ${rawText.slice(0, 200)}` },
      { status: 500 }
    );
  }

  let minimaxVoiceId: string;

  // Sync path: api returned voice id directly
  if (data.cloned_voice_id != null) {
    minimaxVoiceId = String(data.cloned_voice_id);
    console.log(`[clone-voice-minimax] sync success, minimaxVoiceId=${minimaxVoiceId}`);

  // Async path: api returned a task id that needs polling
  } else if (data.task_id) {
    console.log(`[clone-voice-minimax] async path, polling task_id=${data.task_id}`);
    try {
      minimaxVoiceId = await pollCloneTask(data.task_id, apiKey);
      console.log(`[clone-voice-minimax] polling done, minimaxVoiceId=${minimaxVoiceId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "timeout_408") {
        return NextResponse.json(
          { error: "Tiempo de espera agotado. La clonación está tardando demasiado, inténtalo de nuevo." },
          { status: 408 }
        );
      }
      console.error("[clone-voice-minimax] polling failed:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

  } else {
    console.error("[clone-voice-minimax] unexpected response shape:", data);
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

  return NextResponse.json({ success: true, minimaxVoiceId });
}
