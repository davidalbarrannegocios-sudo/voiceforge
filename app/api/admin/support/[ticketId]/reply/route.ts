import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

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
    });

    return NextResponse.json(ticket);
  } catch (e) {
    console.error("[admin/support/reply]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
