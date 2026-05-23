import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const favorites = await prisma.favoriteVoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favorites);
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { voiceId, voiceName, coverImage } = await req.json();
  if (!voiceId || !voiceName) {
    return NextResponse.json({ error: "voiceId y voiceName son requeridos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const existing = await prisma.favoriteVoice.findUnique({
    where: { userId_voiceId: { userId: user.id, voiceId } },
  });

  if (existing) {
    await prisma.favoriteVoice.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed", voiceId });
  }

  await prisma.favoriteVoice.create({
    data: { userId: user.id, voiceId, voiceName, coverImage: coverImage ?? null },
  });

  return NextResponse.json({ action: "added", voiceId });
}
