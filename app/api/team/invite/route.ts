import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

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

  // Send notification email to the invited user (non-blocking)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const ownerName = owner.email.split("@")[0];
    resend.emails.send({
      from: "Elite Labs <onboarding@resend.dev>",
      to: invitee.email,
      subject: `Te han añadido al equipo "${team.name}" en Elite Labs`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #e5e7eb; background: #0a0a0f; padding: 32px; border-radius: 12px;">
          <h2 style="color: #fff; margin-top: 0;">¡Bienvenido al equipo!</h2>
          <p>Hola,</p>
          <p><strong>${ownerName}</strong> te ha añadido a su equipo <strong>"${team.name}"</strong> en Elite Labs.</p>
          <p>Recibirás caracteres mensuales automáticamente según la distribución configurada por el administrador del equipo.</p>
          <a href="https://elitelabs.es/dashboard"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #3b82f6; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Acceder al dashboard
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Elite Labs · elitelabs.es</p>
        </div>
      `,
    }).catch((err) => console.error("[team/invite] email error:", err));
  }

  return NextResponse.json({ member });
}
