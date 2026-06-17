import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
    const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 200);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          credits: true,
          extraCredits: true,
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
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error("[admin/users]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
