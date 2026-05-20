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
    const [user, job] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId: clerkUser.id } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    if (!job) return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    if (!user || job.userId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({
      status: job.status,
      audioUrl: job.audioUrl,
      durationSeconds: job.durationSeconds,
      error: job.error,
      creditsUsed: job.creditsUsed,
      charsRemaining: user.credits,
    });
  } catch (err) {
    console.error(`[status] error jobId=${jobId}:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
