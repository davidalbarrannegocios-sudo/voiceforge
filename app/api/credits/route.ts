import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { cookies } from "next/headers";
import { getEffectivePlan } from "@/lib/plan";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return generateReferralCode();
}

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });

  if (!user) {
    const cookieStore = await cookies();
    const referralCookie = cookieStore.get("referralCode")?.value;

    let referrerId: string | undefined;
    if (referralCookie) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referralCookie } });
      if (referrer) referrerId = referrer.id;
    }

    const referralCode = await uniqueReferralCode();

    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        credits: 10_000,
        plan: "free",
        referralCode,
        referredBy: referrerId,
      },
    });

    if (referrerId) {
      await prisma.referral.create({
        data: { referrerId, referredId: user.id, status: "pending" },
      });
    }

    const renewal = await computeRenewal(user);
    const res = NextResponse.json({
      characters: user.credits,
      extraCredits: user.extraCredits,
      plan: user.plan,
      effectivePlan: user.plan, // new users can't be team members yet
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      transcriptionUsed: user.transcriptionUsed,
      ...renewal,
    });
    if (referralCookie) res.cookies.delete("referralCode");
    return res;
  }

  // Backfill referral code
  if (!user.referralCode) {
    const referralCode = await uniqueReferralCode();
    user = await prisma.user.update({ where: { id: user.id }, data: { referralCode } });
  }

  // Lazy backfill: paid plan but planExpiresAt missing → fetch from Stripe and save
  if (user.plan !== "free" && !user.planExpiresAt && user.stripeSubscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
      const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { planExpiresAt: periodEnd },
      });
      console.log(`[credits] backfilled planExpiresAt for user=${user.id}: ${periodEnd.toISOString()}`);
    } catch (err) {
      console.error("[credits] failed to backfill planExpiresAt:", err);
    }
  }

  const [renewal, effectivePlan] = await Promise.all([
    computeRenewal(user),
    getEffectivePlan(user.id, user.plan),
  ]);

  return NextResponse.json({
    characters: user.credits,
    extraCredits: user.extraCredits,
    plan: user.plan,
    effectivePlan,
    planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
    transcriptionUsed: user.transcriptionUsed,
    ...renewal,
  });
}

async function computeRenewal(user: { plan: string; planExpiresAt: Date | null; createdAt: Date }) {
  let nextRenewalDate: string | null = null;
  let daysUntilRenewal: number | null = null;

  if (user.plan !== "free" && user.planExpiresAt) {
    nextRenewalDate = user.planExpiresAt.toISOString();
  } else if (user.plan === "free") {
    // Free plan: renewal on same day-of-month as createdAt, next upcoming occurrence
    const now = new Date();
    const created = new Date(user.createdAt);
    const renewal = new Date(now.getFullYear(), now.getMonth(), created.getDate());
    if (renewal <= now) renewal.setMonth(renewal.getMonth() + 1);
    nextRenewalDate = renewal.toISOString();
  }

  if (nextRenewalDate) {
    const ms = new Date(nextRenewalDate).getTime() - Date.now();
    daysUntilRenewal = Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  return { nextRenewalDate, daysUntilRenewal };
}
