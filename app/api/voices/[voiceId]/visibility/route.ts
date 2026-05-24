import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { voiceId } = await params;
    const { isPublic } = (await req.json()) as { isPublic: boolean };

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const voice = await prisma.clonedVoice.findUnique({ where: { id: voiceId }, select: { userId: true } });
    if (!voice) return NextResponse.json({ error: "Voz no encontrada" }, { status: 404 });
    if (voice.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const updated = await prisma.clonedVoice.update({
      where: { id: voiceId },
      data: { isPublic },
      select: { id: true, isPublic: true },
    });

    return NextResponse.json({ success: true, isPublic: updated.isPublic });
  } catch (e) {
    console.error("[visibility]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
