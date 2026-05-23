import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Check if owner first
  const team = await prisma.team.findUnique({
    where: { ownerId: user.id },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (team) return NextResponse.json({ team, memberInfo: null });

  // Check if member of someone else's team
  const membership = await prisma.teamMember.findUnique({
    where: { userId: user.id },
    include: { team: true },
  });
  if (membership) {
    return NextResponse.json({
      team: null,
      memberInfo: {
        id: membership.id,
        percentage: membership.percentage,
        creditsLastDistributed: membership.creditsLastDistributed,
        teamName: membership.team.name,
        teamId: membership.teamId,
      },
    });
  }

  return NextResponse.json({ team: null, memberInfo: null });
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
