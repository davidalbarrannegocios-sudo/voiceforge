import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCharCost } from "@/lib/utils";
import { getEffectivePlan } from "@/lib/plan";
import { convertToMp3 } from "@/lib/fishaudio";

export const runtime = "nodejs";
export const maxDuration = 120;

const FREE_TRANSCRIPTION_LIMIT = 2;

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ tasks: [] });

  const tasks = await prisma.transcriptionTask.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey = process.env.FISH_AUDIO_API_KEY;
  if (!fishKey) return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });

  const form = await req.formData();
  const audioFile = form.get("audio") as File | null;
  const language = (form.get("language") as string) ?? "es";
  const speakers = (form.get("speakers") as string) ?? "auto";

  if (!audioFile) return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const effectivePlan = await getEffectivePlan(user.id, user.plan);

  if (effectivePlan === "free" && user.transcriptionUsed >= FREE_TRANSCRIPTION_LIMIT) {
    return NextResponse.json(
      { error: "Has agotado tus transcripciones gratuitas. Suscríbete para uso ilimitado." },
      { status: 403 }
    );
  }

  // Create task record as "processing"
  const task = await prisma.transcriptionTask.create({
    data: {
      userId: user.id,
      fileName: audioFile.name,
      status: "processing",
      speakers,
    },
  });

  try {
    const rawBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mp3Buffer = await convertToMp3(rawBuffer);

    const asrForm = new FormData();
    asrForm.append("audio", new Blob([new Uint8Array(mp3Buffer)], { type: "audio/mpeg" }), "audio.mp3");
    asrForm.append("language", language);
    asrForm.append("ignore_timestamps", "false");
    if (speakers !== "auto") {
      asrForm.append("speaker_count", speakers);
    }

    const asrRes = await fetch("https://api.fish.audio/v1/asr", {
      method: "POST",
      headers: { Authorization: `Bearer ${fishKey}` },
      body: asrForm,
    });

    if (!asrRes.ok) {
      const err = await asrRes.text();
      await prisma.transcriptionTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: `Error Fish Audio (${asrRes.status}): ${err}` },
      });
      return NextResponse.json({ error: `Error en transcripción: ${err}`, taskId: task.id }, { status: 502 });
    }

    const asrData = await asrRes.json() as { text?: string; duration?: number };
    const transcribedText = (asrData.text ?? "").trim();

    if (!transcribedText) {
      await prisma.transcriptionTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: "No se detectó texto en el audio" },
      });
      return NextResponse.json({ error: "No se detectó texto en el audio", taskId: task.id }, { status: 400 });
    }

    const charCost = calculateCharCost(transcribedText.length);
    const totalAvailable = user.credits + user.extraCredits;

    if (totalAvailable < charCost) {
      await prisma.transcriptionTask.update({
        where: { id: task.id },
        data: { status: "error", errorMessage: `Créditos insuficientes (necesitas ${charCost})` },
      });
      return NextResponse.json(
        { error: `Créditos insuficientes. Necesitas ${charCost}.`, taskId: task.id },
        { status: 402 }
      );
    }

    const fromPlan  = Math.min(user.credits, charCost);
    const fromExtra = charCost - fromPlan;

    const [updatedTask] = await prisma.$transaction([
      prisma.transcriptionTask.update({
        where: { id: task.id },
        data: {
          status: "completed",
          transcriptionText: transcribedText,
          creditsUsed: charCost,
          durationSeconds: asrData.duration ?? null,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          credits: { decrement: fromPlan },
          extraCredits: { decrement: fromExtra },
          ...(effectivePlan === "free" && { transcriptionUsed: { increment: 1 } }),
        },
      }),
    ]);

    return NextResponse.json({ task: updatedTask });
  } catch (e) {
    console.error("[transcription-tasks/post]", e);
    await prisma.transcriptionTask.update({
      where: { id: task.id },
      data: { status: "error", errorMessage: "Error interno del servidor" },
    });
    return NextResponse.json({ error: "Error interno", taskId: task.id }, { status: 500 });
  }
}
