import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const task = await prisma.transcriptionTask.findUnique({ where: { id } });
  if (!task || task.userId !== user.id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ task });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const task = await prisma.transcriptionTask.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!task || task.userId !== user.id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.transcriptionTask.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
