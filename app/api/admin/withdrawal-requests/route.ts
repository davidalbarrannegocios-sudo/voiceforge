import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const requests = await prisma.withdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json(requests);
  } catch (e) {
    console.error("[admin/withdrawal-requests GET]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
