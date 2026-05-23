import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: { memberId: string } }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const owner = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!owner) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const team = await prisma.team.findUnique({ where: { ownerId: owner.id } });
  if (!team) return NextResponse.json({ error: "No tienes un equipo" }, { status: 404 });

  const member = await prisma.teamMember.findFirst({
    where: { id: params.memberId, teamId: team.id },
  });
  if (!member) return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });

  await prisma.teamMember.delete({ where: { id: member.id } });

  return NextResponse.json({ success: true });
}
