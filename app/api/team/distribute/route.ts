import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const owner = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!owner) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const team = await prisma.team.findUnique({ where: { ownerId: owner.id } });
  if (!team) return NextResponse.json({ error: "No tienes un equipo" }, { status: 404 });

  const { distributions } = await req.json() as { distributions: { memberId: string; percentage: number }[] };
  if (!Array.isArray(distributions)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const total = distributions.reduce((sum, d) => sum + (d.percentage ?? 0), 0);
  if (total > 100) {
    return NextResponse.json({ error: `Los porcentajes suman ${total}%, el máximo es 100%` }, { status: 400 });
  }

  for (const d of distributions) {
    if (d.percentage < 0 || d.percentage > 100 || !Number.isInteger(d.percentage)) {
      return NextResponse.json({ error: "Cada porcentaje debe ser un entero entre 0 y 100" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    distributions.map((d) =>
      prisma.teamMember.update({
        where: { id: d.memberId, teamId: team.id },
        data: { percentage: d.percentage },
      })
    )
  );

  const updated = await prisma.team.findUnique({
    where: { id: team.id },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ team: updated });
}
