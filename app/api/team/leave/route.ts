import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const membership = await prisma.teamMember.findUnique({
    where: { userId: user.id },
    include: { team: { include: { owner: true } } },
  });
  if (!membership) return NextResponse.json({ error: "No eres miembro de ningún equipo" }, { status: 404 });

  const creditsToReturn = membership.creditsLastDistributed;
  const creditsToDeduct = Math.min(user.credits, creditsToReturn);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { credits: { decrement: creditsToDeduct } } }),
    ...(creditsToDeduct > 0
      ? [prisma.user.update({ where: { id: membership.team.ownerId }, data: { credits: { increment: creditsToDeduct } } })]
      : []),
    prisma.teamMember.delete({ where: { id: membership.id } }),
  ]);

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const ownerEmail = membership.team.owner.email;
    const memberName = membership.name ?? membership.email;
    resend.emails.send({
      from: "Elite Labs <noreply@elitelabs.es>",
      to: ownerEmail,
      subject: `${memberName} ha abandonado tu equipo "${membership.team.name}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #e5e7eb; background: #0a0a0f; padding: 32px; border-radius: 12px;">
          <h2 style="color: #fff; margin-top: 0;">Un miembro ha abandonado el equipo</h2>
          <p>Hola,</p>
          <p><strong>${memberName}</strong> ha abandonado tu equipo <strong>"${membership.team.name}"</strong>.</p>
          ${creditsToDeduct > 0 ? `<p>Se han devuelto <strong>${creditsToDeduct.toLocaleString("es-ES")} créditos</strong> a tu cuenta.</p>` : ""}
          <a href="https://elitelabs.es/dashboard"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #ffffff; color: #000000; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Gestionar equipo
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Elite Labs · elitelabs.es</p>
        </div>
      `,
    }).catch((err) => console.error("[team/leave] email error:", err));
  }

  console.log(`[team/leave] user=${user.id} team=${membership.teamId} returnedCredits=${creditsToDeduct}`);
  return NextResponse.json({ ok: true });
}
