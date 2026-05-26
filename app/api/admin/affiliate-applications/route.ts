import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const applications = await prisma.affiliateApplication.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (e) {
    console.error("[admin/affiliate-applications GET]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
