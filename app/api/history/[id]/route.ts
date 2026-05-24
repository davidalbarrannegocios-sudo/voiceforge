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

    const generation = await prisma.generation.findUnique({ where: { id }, select: { id: true, userId: true, audioUrl: true } });
    if (!generation) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (generation.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    if (generation.audioUrl) {
      try {
        await deleteFromR2(keyFromPublicUrl(generation.audioUrl));
      } catch {
        // R2 delete failure is non-fatal — still remove the DB record
      }
    }

    await prisma.generation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[history/delete]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
