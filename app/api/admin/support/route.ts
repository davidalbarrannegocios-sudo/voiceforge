import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, plan: true } },
      },
    });

    return NextResponse.json(tickets);
  } catch (e) {
    console.error("[admin/support]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
