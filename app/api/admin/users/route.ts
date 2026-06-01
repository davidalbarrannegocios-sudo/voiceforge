import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        credits: true,
        plan: true,
        role: true,
        createdAt: true,
        clerkId: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        planExpiresAt: true,
        billingInterval: true,
        creditsRenewedAt: true,
        disabledUntil: true,
        _count: { select: { generations: true } },
      },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("[admin/users]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
