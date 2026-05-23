import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ENTERPRISE_CREDITS = 5_000_000;

export async function PUT(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const owner = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!owner) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { ownerId: owner.id },
    include: { members: true },
  });
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

  const memberMap = new Map(team.members.map((m) => [m.id, m]));

  // Calculate diffs: positive = credits flow to member (away from owner), negative = return to owner
  type Diff = { memberId: string; userId: string; newCredits: number; diff: number };
  const diffs: Diff[] = distributions.map((d) => {
    const member = memberMap.get(d.memberId)!;
    const newCredits = Math.floor(ENTERPRISE_CREDITS * d.percentage / 100);
    const diff = newCredits - (member?.creditsLastDistributed ?? 0);
    return { memberId: d.memberId, userId: member.userId, newCredits, diff };
  }).filter((d) => memberMap.has(d.memberId));

  const ownerDelta = -diffs.reduce((sum, d) => sum + d.diff, 0);

  await prisma.$transaction([
    // Update each member's percentage and creditsLastDistributed
    ...distributions
      .filter((d) => memberMap.has(d.memberId))
      .map((d) => {
        const newCredits = Math.floor(ENTERPRISE_CREDITS * d.percentage / 100);
        return prisma.teamMember.update({
          where: { id: d.memberId, teamId: team.id },
          data: { percentage: d.percentage, creditsLastDistributed: newCredits },
        });
      }),
    // Adjust each member's credits by the diff
    ...diffs
      .filter((d) => d.diff !== 0)
      .map((d) =>
        prisma.user.update({
          where: { id: d.userId },
          data: { credits: { increment: d.diff } },
        })
      ),
    // Adjust owner's credits by the net delta
    ...(ownerDelta !== 0
      ? [prisma.user.update({
          where: { id: owner.id },
          data: { credits: { increment: ownerDelta } },
        })]
      : []),
  ]);

  const updated = await prisma.team.findUnique({
    where: { id: team.id },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ team: updated });
}
