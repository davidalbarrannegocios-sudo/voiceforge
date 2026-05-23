import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_CREDITS } from "@/lib/stripe";

export const runtime = "nodejs";

const PAID_PLANS = ["starter", "pro", "elite", "enterprise"];

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Users with active annual subscriptions not yet renewed this month
  const users = await prisma.user.findMany({
    where: {
      billingInterval: "annual",
      plan: { in: PAID_PLANS },
      planExpiresAt: { gt: now },
      OR: [
        { creditsRenewedAt: null },
        { creditsRenewedAt: { lt: twentyEightDaysAgo } },
      ],
    },
  });

  const results = await Promise.allSettled(
    users.map((user) =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          credits: PLAN_CREDITS[user.plan] ?? 0,
          creditsRenewedAt: now,
        },
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[cron/monthly-credits] renewed=${succeeded} failed=${failed} total=${users.length}`);

  return NextResponse.json({ renewed: succeeded, failed, total: users.length });
}
