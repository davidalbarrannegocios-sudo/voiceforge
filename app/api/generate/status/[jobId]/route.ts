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

  let user, job;
  try {
    [user, job] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId: clerkUser.id } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[status] DB error jobId=${jobId}:`, message);
    return NextResponse.json({ error: "DB error", detail: message }, { status: 500 });
  }

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
}
