import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json([]);

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { type, description } = await req.json() as { type: string; description: string };
  if (!type || !description?.trim()) {
    return NextResponse.json({ error: "Tipo y descripción requeridos" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        credits: 10_000,
        plan: "free",
      },
    });
  }

  const firstMessage = {
    role: "user",
    content: description.trim(),
    createdAt: new Date().toISOString(),
  };

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      type,
      description: description.trim(),
      messages: [firstMessage],
    },
  });

  if (process.env.RESEND_API_KEY) {
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    const caseId = "#" + ticket.id.slice(-6).toUpperCase();
    if (userEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + process.env.RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Elite Labs Support <soporte@elitelabs.es>",
            to: [userEmail],
            subject: "[" + caseId + "] Hemos recibido tu solicitud de soporte",
            html: "<div style='font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0d0d17;color:#e5e7eb;border-radius:16px;'><h2 style='font-size:20px;font-weight:700;color:#ffffff;margin:0 0 8px;'>Hemos recibido tu solicitud</h2><p style='color:#9ca3af;font-size:14px;margin:0 0 24px;'>Nuestro equipo revisará tu caso y te responderá en menos de 24h.</p><div style='background:#1a1a28;border-radius:12px;padding:16px 20px;margin-bottom:24px;'><p style='font-size:12px;color:#6b7280;margin:0 0 4px;'>Caso</p><p style='font-size:16px;font-weight:700;color:#ffffff;margin:0;'>" + caseId + "</p></div><a href='https://elitelabs.es/dashboard/support/" + ticket.id + "' style='display:inline-block;padding:12px 24px;background:#ffffff;color:#000000;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;'>Ver caso en el portal</a><p style='font-size:12px;color:#374151;margin-top:32px;'>Si no esperabas este mensaje puedes ignorarlo.</p></div>",
          }),
        });
      } catch (e) {
        console.error("[support] email error", e);
      }
    }
  }

  return NextResponse.json(ticket);
}
