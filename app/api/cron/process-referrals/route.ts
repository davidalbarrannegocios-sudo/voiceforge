import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const rewards = await prisma.pendingReferralReward.findMany({
    where: { pendingUntil: { lte: now } },
  });

  if (rewards.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // Group by referrerId
  const byReferrer = rewards.reduce<Record<string, number>>((acc, r) => {
    acc[r.referrerId] = (acc[r.referrerId] ?? 0) + r.amount;
    return acc;
  }, {});

  await prisma.$transaction([
    prisma.pendingReferralReward.deleteMany({
      where: { id: { in: rewards.map((r) => r.id) } },
    }),
    ...Object.entries(byReferrer).map(([referrerId, amount]) =>
      prisma.user.update({
        where: { id: referrerId },
        data: {
          referralBalance: { increment: amount },
          referralEarned: { increment: amount },
          referralPending: { decrement: amount },
        },
      })
    ),
  ]);

  console.log(`[cron/process-referrals] processed=${rewards.length} referrers=${Object.keys(byReferrer).length}`);

  return NextResponse.json({ ok: true, processed: rewards.length, referrers: Object.keys(byReferrer).length });
}
