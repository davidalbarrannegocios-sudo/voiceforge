import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    email: string;
    platform: string;
    audience: string;
    paymentMethod: string;
  };

  if (!body.name || !body.email || !body.platform || !body.audience || !body.paymentMethod) {
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
  }

  const application = await prisma.affiliateApplication.create({
    data: {
      name: body.name,
      email: body.email,
      platform: body.platform,
      audience: body.audience,
      paymentMethod: body.paymentMethod,
    },
  });

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from: "Elite Labs <noreply@elitelabs.es>",
      to: adminEmail,
      subject: "Nueva solicitud de afiliado — Elite Labs",
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0f; color: #e5e7eb; padding: 32px; border-radius: 12px;">
          <h2 style="color: #fff; margin-top: 0;">Nueva solicitud de afiliado</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #9ca3af;">Nombre:</td><td style="padding: 8px 0; color: #fff;">${body.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #9ca3af;">Email:</td><td style="padding: 8px 0; color: #93c5fd;">${body.email}</td></tr>
            <tr><td style="padding: 8px 0; color: #9ca3af;">Canal/Web:</td><td style="padding: 8px 0; color: #fff;">${body.platform}</td></tr>
            <tr><td style="padding: 8px 0; color: #9ca3af;">Audiencia:</td><td style="padding: 8px 0; color: #fff;">${body.audience}</td></tr>
            <tr><td style="padding: 8px 0; color: #9ca3af;">Pago preferido:</td><td style="padding: 8px 0; color: #fff;">${body.paymentMethod}</td></tr>
          </table>
          <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">ID: ${application.id}</p>
        </div>
      `,
    }).catch((err) => console.error("[affiliate] admin email error:", err));
  }

  return NextResponse.json({ ok: true });
}
