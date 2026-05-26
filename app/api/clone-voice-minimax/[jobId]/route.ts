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

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const job = await prisma.cloneJob.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== user.id) {
      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      status: job.status,
      voiceId: job.voiceId,
      voiceName: job.voiceName,
      error: job.error,
    });
  } catch (e) {
    console.error("[clone-voice-minimax/jobId GET]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
