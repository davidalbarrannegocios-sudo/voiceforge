import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId requerido" }, { status: 400 });

  const task = await prisma.translationTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task no encontrada" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user || user.id !== task.userId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  return NextResponse.json({
    status: task.status,
    audioUrl: task.audioUrl,
    transcribedText: task.transcribedText,
    translatedText: task.translatedText,
    durationSeconds: task.durationSeconds,
    errorMessage: task.errorMessage,
    targetLanguageName: task.targetLanguageName,
    creditsUsed: task.creditsUsed,
  });
}
