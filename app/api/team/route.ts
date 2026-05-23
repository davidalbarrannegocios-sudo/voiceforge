import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { ownerId: user.id },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ team: team ?? null });
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (user.plan !== "enterprise") {
    return NextResponse.json({ error: "Solo disponible en el plan Enterprise" }, { status: 403 });
  }

  const existing = await prisma.team.findUnique({ where: { ownerId: user.id } });
  if (existing) return NextResponse.json({ error: "Ya tienes un equipo creado" }, { status: 409 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const team = await prisma.team.create({
    data: { name: name.trim(), ownerId: user.id },
    include: { members: true },
  });

  return NextResponse.json({ team });
}
