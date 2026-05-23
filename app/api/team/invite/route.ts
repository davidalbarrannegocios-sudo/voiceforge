import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const owner = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!owner) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (owner.plan !== "enterprise") {
    return NextResponse.json({ error: "Solo disponible en el plan Enterprise" }, { status: 403 });
  }

  const team = await prisma.team.findUnique({ where: { ownerId: owner.id } });
  if (!team) return NextResponse.json({ error: "No tienes un equipo. Créalo primero." }, { status: 404 });

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "El email es obligatorio" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === owner.email.toLowerCase()) {
    return NextResponse.json({ error: "No puedes añadirte a ti mismo como miembro" }, { status: 400 });
  }

  const invitee = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (!invitee) {
    return NextResponse.json(
      { error: "Este usuario no tiene cuenta en Elite Labs todavía" },
      { status: 404 }
    );
  }

  const alreadyMember = await prisma.teamMember.findUnique({ where: { userId: invitee.id } });
  if (alreadyMember) {
    return NextResponse.json({ error: "Este usuario ya pertenece a un equipo" }, { status: 409 });
  }

  const member = await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: invitee.id,
      email: invitee.email,
      name: invitee.email.split("@")[0],
      percentage: 0,
    },
  });

  return NextResponse.json({ member });
}
