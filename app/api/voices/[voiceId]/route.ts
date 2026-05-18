import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const { voiceId } = await params;
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const voice = await prisma.clonedVoice.findFirst({
    where: { id: voiceId, userId: user.id },
  });

  if (!voice) {
    return NextResponse.json({ error: "Voz no encontrada" }, { status: 404 });
  }

  await prisma.clonedVoice.delete({ where: { id: voice.id } });

  return NextResponse.json({ success: true });
}
