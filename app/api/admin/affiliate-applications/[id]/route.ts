import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json() as { status: "approved" | "rejected" };

  if (!["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  const application = await prisma.affiliateApplication.update({
    where: { id },
    data: { status: body.status },
  });

  // Email notification to applicant on approval
  if (body.status === "approved" && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from: "Elite Labs <noreply@elitelabs.es>",
      to: application.email,
      subject: "¡Tu solicitud de afiliado ha sido aprobada! — Elite Labs",
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0f; color: #e5e7eb; padding: 32px; border-radius: 12px;">
          <h2 style="color: #fff; margin-top: 0;">¡Bienvenido al programa de afiliados!</h2>
          <p>Hola ${application.name},</p>
          <p>Nos complace informarte que tu solicitud para unirte al programa de afiliados de Elite Labs ha sido <strong style="color: #4ade80;">aprobada</strong>.</p>
          <p>En breve recibirás más información con tu enlace personalizado y acceso a tu panel de seguimiento.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos respondiendo a este email.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Elite Labs · elitelabs.es</p>
        </div>
      `,
    }).catch((err) => console.error("[affiliate-applications] email error:", err));
  }

  return NextResponse.json({ ok: true, application });
}
