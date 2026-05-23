import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

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

export async function DELETE() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { ownerId: user.id },
    include: { members: { include: { user: { select: { credits: true } } } } },
  });
  if (!team) return NextResponse.json({ error: "No tienes un equipo" }, { status: 404 });

  const totalToReturn = team.members.reduce((sum, m) => sum + m.creditsLastDistributed, 0);

  await prisma.$transaction([
    ...(totalToReturn > 0
      ? [prisma.user.update({ where: { id: user.id }, data: { credits: { increment: totalToReturn } } })]
      : []),
    // Deduct distributed credits from each member (floor at 0)
    ...team.members
      .filter((m) => m.creditsLastDistributed > 0)
      .map((m) => {
        const deduct = Math.min(m.user.credits, m.creditsLastDistributed);
        return prisma.user.update({ where: { id: m.userId }, data: { credits: { decrement: deduct } } });
      }),
    prisma.team.delete({ where: { id: team.id } }),
  ]);

  if (process.env.RESEND_API_KEY && team.members.length > 0) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const member of team.members) {
      resend.emails.send({
        from: "Elite Labs <noreply@elitelabs.es>",
        to: member.email,
        subject: `El equipo "${team.name}" ha sido eliminado`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #e5e7eb; background: #0a0a0f; padding: 32px; border-radius: 12px;">
            <h2 style="color: #fff; margin-top: 0;">Equipo eliminado</h2>
            <p>Hola,</p>
            <p>El administrador ha eliminado el equipo <strong>"${team.name}"</strong>. Los créditos asignados a tu cuenta han sido devueltos al administrador.</p>
            <p>Puedes suscribirte a un plan propio para seguir usando Elite Labs.</p>
            <a href="https://elitelabs.es/pricing"
               style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #3b82f6; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Ver planes
            </a>
            <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Elite Labs · elitelabs.es</p>
          </div>
        `,
      }).catch((err) => console.error("[team/delete] email error:", err));
    }
  }

  console.log(`[team/delete] team=${team.id} members=${team.members.length} returnedCredits=${totalToReturn}`);
  return NextResponse.json({ ok: true });
}
