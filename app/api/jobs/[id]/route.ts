import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromR2, keyFromPublicUrl } from "@/lib/r2";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const job = await prisma.job.findUnique({ where: { id }, select: { id: true, userId: true, audioUrl: true } });
    if (!job) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (job.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    if (job.audioUrl) {
      try { await deleteFromR2(keyFromPublicUrl(job.audioUrl)); } catch { /* non-fatal */ }
      // Also remove any matching Generation record
      try {
        await prisma.generation.deleteMany({ where: { userId: user.id, audioUrl: job.audioUrl } });
      } catch { /* non-fatal */ }
    }

    await prisma.job.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[jobs/delete]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
