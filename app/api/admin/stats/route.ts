import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const [totalUsers, totalGenerations, creditsAggregate, revenueAggregate] =
    await Promise.all([
      prisma.user.count(),
      prisma.generation.count(),
      prisma.generation.aggregate({ _sum: { creditsUsed: true } }),
      prisma.purchase.aggregate({ _sum: { amountCents: true } }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalGenerations,
    totalCreditsConsumed: creditsAggregate._sum.creditsUsed ?? 0,
    totalRevenueEuros: ((revenueAggregate._sum.amountCents ?? 0) / 100).toFixed(2),
  });
}
