import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { ticketId } = await params;
    const { reply, close } = await req.json() as { reply?: string; close?: boolean };

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(reply !== undefined && { adminReply: reply.trim() }),
        ...(close === true && { status: "closed" }),
      },
      include: { user: { select: { email: true } } },
    });

    // Send email notification when a reply is provided
    if (reply?.trim() && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const typeLabel: Record<string, string> = {
        general: "Ayuda general", technical: "Problema técnico",
        billing: "Facturación", refund: "Reembolso", other: "Otro",
      };
      const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Respuesta a tu ticket</title></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">Elite Labs</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3">Hemos respondido a tu solicitud de soporte</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666666">Categoría: ${typeLabel[ticket.type] ?? ticket.type}</p>
            <!-- Reply box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin-bottom:28px">
              <tr>
                <td style="padding:20px 22px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#555555">Respuesta del equipo</p>
                  <p style="margin:0;font-size:14px;color:#cccccc;line-height:1.7;white-space:pre-wrap">${reply.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                </td>
              </tr>
            </table>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#ffffff;border-radius:10px">
                  <a href="https://www.elitelabs.es/dashboard/support" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:700;color:#000000;text-decoration:none">Ver mi ticket →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0;font-size:12px;color:#444444">Elite Labs · <a href="https://www.elitelabs.es" style="color:#555555;text-decoration:none">elitelabs.es</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await resend.emails.send({
        from: "Elite Labs <soporte@elitelabs.es>",
        to: ticket.user.email,
        subject: "Tu ticket de soporte ha recibido una respuesta — Elite Labs",
        html,
      }).catch(err => console.error("[support/reply] email error:", err));
    }

    return NextResponse.json(ticket);
  } catch (e) {
    console.error("[admin/support/reply]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
