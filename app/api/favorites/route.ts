import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const favorites = await prisma.favoriteVoice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(favorites);
  } catch (err) {
    console.error("[favorites GET] error:", err);
    return NextResponse.json({ error: "Error al obtener favoritos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { voiceId?: unknown; voiceName?: unknown; coverImage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const { voiceId, voiceName, coverImage } = body;
  if (!voiceId || !voiceName) {
    return NextResponse.json({ error: "voiceId y voiceName son requeridos" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const existing = await prisma.favoriteVoice.findUnique({
      where: { userId_voiceId: { userId: user.id, voiceId: String(voiceId) } },
    });

    if (existing) {
      await prisma.favoriteVoice.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", voiceId });
    }

    await prisma.favoriteVoice.create({
      data: {
        userId: user.id,
        voiceId: String(voiceId),
        voiceName: String(voiceName),
        coverImage: coverImage != null ? String(coverImage) : null,
      },
    });

    return NextResponse.json({ action: "added", voiceId });
  } catch (err) {
    console.error("[favorites POST] error:", err);
    return NextResponse.json({ error: "Error al actualizar favoritos" }, { status: 500 });
  }
}
