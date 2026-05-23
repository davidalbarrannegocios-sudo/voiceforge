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

  // Fetch teams for enterprise users so we can distribute credits to members
  const enterpriseIds = users.filter((u) => u.plan === "enterprise").map((u) => u.id);
  const teams = await prisma.team.findMany({
    where: { ownerId: { in: enterpriseIds } },
    include: { members: { where: { percentage: { gt: 0 } } } },
  });
  const teamsMap = new Map(teams.map((t) => [t.ownerId, t]));

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const planCredits = PLAN_CREDITS[user.plan] ?? 0;
      const team = teamsMap.get(user.id);

      if (user.plan === "enterprise" && team && team.members.length > 0) {
        const distributions = team.members.map((m) => ({
          memberId: m.id,
          userId: m.userId,
          credits: Math.floor(planCredits * m.percentage / 100),
        }));
        const totalDistributed = distributions.reduce((sum, d) => sum + d.credits, 0);
        const ownerCredits = planCredits - totalDistributed;

        return prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { credits: ownerCredits, creditsRenewedAt: now },
          }),
          ...distributions.map((d) =>
            prisma.user.update({
              where: { id: d.userId },
              data: { credits: d.credits },
            })
          ),
          // Reset creditsLastDistributed so next manual distribution diffs correctly
          ...distributions.map((d) =>
            prisma.teamMember.update({
              where: { id: d.memberId },
              data: { creditsLastDistributed: d.credits },
            })
          ),
        ]);
      }

      return prisma.user.update({
        where: { id: user.id },
        data: { credits: planCredits, creditsRenewedAt: now },
      });
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[cron/monthly-credits] renewed=${succeeded} failed=${failed} total=${users.length}`);

  return NextResponse.json({ renewed: succeeded, failed, total: users.length });
}
