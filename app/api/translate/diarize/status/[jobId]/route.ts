import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "jobId requerido" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== dbUser.id) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  }

  if (job.status === "done") {
    try {
      const parsed = JSON.parse(job.audioUrl ?? "{}");
      return NextResponse.json({ status: "done", ...parsed });
    } catch {
      return NextResponse.json({ status: "error", error: "Error al parsear resultado" }, { status: 500 });
    }
  }

  if (job.status === "error") {
    return NextResponse.json({ status: "error", error: job.error ?? "Error desconocido" });
  }

  return NextResponse.json({ status: job.status });
}
