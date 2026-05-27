import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { jobId } = await params;

  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      userId: true,
      status: true,
      voiceId: true,
      voiceName: true,
      audioUrl: true,
      errorMsg: true,
      creditsUsed: true,
      createdAt: true,
    },
  });

  if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { id: true },
  });

  if (!user || user.id !== job.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    voiceId: job.voiceId,
    voiceName: job.voiceName,
    audioUrl: job.audioUrl,
    errorMsg: job.errorMsg,
    creditsUsed: job.creditsUsed,
    createdAt: job.createdAt,
  });
}
