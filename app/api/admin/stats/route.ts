import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalUsers, totalGenerations, creditsAggregate, starterCount, proCount, eliteCount, enterpriseCount, totalVisits, visitsToday] =
      await Promise.all([
        prisma.user.count(),
        prisma.generation.count(),
        prisma.generation.aggregate({ _sum: { creditsUsed: true } }),
        prisma.user.count({ where: { plan: "starter" } }),
        prisma.user.count({ where: { plan: "pro" } }),
        prisma.user.count({ where: { plan: "elite" } }),
        prisma.user.count({ where: { plan: "enterprise" } }),
        prisma.pageVisit.count(),
        prisma.pageVisit.count({ where: { createdAt: { gte: todayStart } } }),
      ]);

    const mrr = starterCount * 7 + proCount * 13 + eliteCount * 25 + enterpriseCount * 110;

    return NextResponse.json({
      totalUsers,
      totalGenerations,
      totalCreditsConsumed: creditsAggregate._sum.creditsUsed ?? 0,
      totalRevenueDollars: mrr.toFixed(2),
      totalVisits,
      visitsToday,
    });
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
