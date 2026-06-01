import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: {
      referralsGiven: { orderBy: { createdAt: "desc" } },
      affiliateApplications: { where: { status: "approved" }, take: 1 },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const pendingReward = user.referralsGiven
    .filter((r) => r.status === "rewarded")
    .reduce((sum, r) => sum + r.rewardChars, 0);

  const totalEarned = user.referralsGiven
    .filter((r) => r.status === "rewarded" || r.status === "claimed")
    .reduce((sum, r) => sum + r.rewardChars, 0);

  const canWithdraw = user.affiliateApplications.length > 0;

  const allReferrals = user.referralsGiven;

  return NextResponse.json({
    referralCode: user.referralCode,
    referrals: allReferrals,
    pendingReward,
    totalEarned,
    referralBalance: user.referralBalance,
    referralEarned: user.referralEarned,
    referralCount: allReferrals.length,
    referredSignupsCount: allReferrals.length,
    referredConversionsCount: allReferrals.filter((r) => r.status !== "pending").length,
    referralCompleted: allReferrals.filter((r) => r.status !== "pending").length,
    canWithdraw,
  });
}
