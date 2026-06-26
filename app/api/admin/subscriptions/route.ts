import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const users = await prisma.user.findMany({
      where: {
        plan: {
          notIn: ["free"],
        },
      },
      orderBy: {
        planExpiresAt: "desc",
      },
      select: {
        id: true,
        email: true,
        plan: true,
        planExpiresAt: true,
        billingInterval: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (e) {
    console.error("[admin/subscriptions]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
