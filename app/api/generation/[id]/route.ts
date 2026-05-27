import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const generation = await prisma.generation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      audioUrl: true,
      durationSeconds: true,
      error: true,
      creditsUsed: true,
      createdAt: true,
    },
  });

  if (!generation || generation.id !== id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Ensure the generation belongs to the requesting user
  const owner = await prisma.generation.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owner) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  return NextResponse.json(generation);
}
