import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

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
        meta.cloned_voice_id ?? meta.voice_id ?? meta.id ?? meta.minimaxVoiceId;
      if (!voiceId) throw new Error(`Tarea completada pero sin voice_id en metadata: ${JSON.stringify(meta)}`);
      return String(voiceId);
    }

    if (taskData.status === "error" || taskData.status === "failed") {
      throw new Error(`ai33.pro: clonación fallida (status=${taskData.status})`);
    }
  }

  throw new Error("Tiempo de espera agotado tras 40 intentos de polling");
}

async function runCloneBackground(
  jobId: string,
  userId: string,
  apiKey: string,
  file: File,
  voiceName: string,
  languageTag: string,
  genderTag: string,
  needNoiseReduction: boolean,
) {
  try {
    await prisma.cloneJob.update({ where: { id: jobId }, data: { status: "processing" } });

    const upstream = new FormData();
    upstream.append("file", file);
    upstream.append("voice_name", voiceName);
    upstream.append("language_tag", languageTag);
    upstream.append("gender_tag", genderTag);
    upstream.append("need_noise_reduction", String(needNoiseReduction));

    console.log(`[clone-voice-minimax] [bg:${jobId}] uploading to ai33.pro fileSize=${file.size}`);

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
    } finally {
      clearTimeout(uploadTimeout);
    }

    const statusCode = res.status;
    const responseText = await res.text();
    console.log(`[bg:${jobId}] ai33.pro status:`, statusCode);
    console.log(`[bg:${jobId}] ai33.pro response:`, responseText.slice(0, 500));

    if (!res.ok) throw new Error(`ai33.pro error ${statusCode}: ${responseText}`);

    let data: { success?: boolean; cloned_voice_id?: number | string; task_id?: string };
    try { data = JSON.parse(responseText); }
    catch { throw new Error(`ai33.pro respuesta no-JSON: ${responseText.slice(0, 200)}`); }

    let minimaxVoiceId: string;
    if (data.cloned_voice_id != null) {
      minimaxVoiceId = String(data.cloned_voice_id);
      console.log(`[clone-voice-minimax] [bg:${jobId}] sync success voiceId=${minimaxVoiceId}`);
    } else if (data.task_id) {
      console.log(`[clone-voice-minimax] [bg:${jobId}] async path task_id=${data.task_id}`);
      minimaxVoiceId = await pollCloneTask(data.task_id, apiKey);
      console.log(`[clone-voice-minimax] [bg:${jobId}] polling done voiceId=${minimaxVoiceId}`);
    } else {
      throw new Error("ai33.pro no devolvió cloned_voice_id ni task_id");
    }

    await prisma.clonedVoice.create({
      data: {
        userId,
        name: voiceName,
        referenceAudioUrl: "",
        language: languageTag,
        gender: genderTag === "female" ? "feminine" : "masculine",
        isPublic: false,
        provider: "minimax",
        minimaxVoiceId,
      },
    });

    await prisma.cloneJob.update({
      where: { id: jobId },
      data: { status: "done", voiceId: minimaxVoiceId },
    });

    console.log(`[clone-voice-minimax] [bg:${jobId}] completed voiceId=${minimaxVoiceId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[clone-voice-minimax] [bg:${jobId}] failed:`, msg);
    await prisma.cloneJob.update({
      where: { id: jobId },
      data: { status: "error", error: msg },
    }).catch(() => {});
  }
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

  const job = await prisma.cloneJob.create({
    data: { userId: user.id, voiceName, status: "pending" },
  });

  console.log(`[clone-voice-minimax] job created jobId=${job.id} voiceName=${voiceName}`);

  // Fire and forget — Railway keeps the process alive after response
  void runCloneBackground(job.id, user.id, apiKey, file, voiceName, languageTag, genderTag, needNoiseReduction);

  return NextResponse.json({ jobId: job.id });
}
