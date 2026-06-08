import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const month = req.nextUrl.searchParams.get("month");
    const dateFilter = month
      ? {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        }
      : undefined;

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    let prevMonthFilter: { gte: Date; lt: Date } | undefined;
    if (dateFilter) {
      const prevStart = new Date(dateFilter.gte);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevMonthFilter = { gte: prevStart, lt: dateFilter.gte };
    }

    const [
      totalUsers, totalGenerations, creditsAggregate,
      starterCount, proCount, eliteCount, enterpriseCount,
      totalVisits, visitsToday, prevMonthVisits,
    ] = await Promise.all([
      prisma.user.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
      prisma.generation.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
      prisma.generation.aggregate({ _sum: { creditsUsed: true }, where: dateFilter ? { createdAt: dateFilter } : undefined }),
      prisma.user.count({ where: { plan: "starter", ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
      prisma.user.count({ where: { plan: "pro", ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
      prisma.user.count({ where: { plan: "elite", ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
      prisma.user.count({ where: { plan: "enterprise", ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
      prisma.pageVisit.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
      prisma.pageVisit.count({ where: { createdAt: { gte: todayStart } } }),
      prevMonthFilter
        ? prisma.pageVisit.count({ where: { createdAt: prevMonthFilter } })
        : Promise.resolve(0),
    ]);

    const mrr = starterCount * 7 + proCount * 13 + eliteCount * 25 + enterpriseCount * 110;

    // Build visitsByDay array
    const visitsByDay: { date: string; count: number }[] = [];
    if (dateFilter) {
      const visitsInPeriod = await prisma.pageVisit.findMany({
        where: { createdAt: dateFilter },
        select: { createdAt: true },
      });
      const byDay: Record<string, number> = {};
      for (const v of visitsInPeriod) {
        const day = v.createdAt.toISOString().slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
      }
      const cursor = new Date(dateFilter.gte);
      const end = new Date(Math.min(dateFilter.lt.getTime(), Date.now()));
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        visitsByDay.push({ date: key, count: byDay[key] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const now = new Date();
      const since = new Date(now);
      since.setDate(since.getDate() - 29);
      const recentVisits = await prisma.pageVisit.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      });
      const byDay: Record<string, number> = {};
      for (const v of recentVisits) {
        const day = v.createdAt.toISOString().slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
      }
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        visitsByDay.push({ date: key, count: byDay[key] || 0 });
      }
    }

    return NextResponse.json({
      totalUsers,
      totalGenerations,
      totalCreditsConsumed: creditsAggregate._sum.creditsUsed ?? 0,
      totalRevenueDollars: mrr.toFixed(2),
      totalVisits,
      visitsToday,
      visitsByDay,
      prevMonthVisits,
    });
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
