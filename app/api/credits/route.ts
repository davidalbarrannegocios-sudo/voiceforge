import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

    const res = NextResponse.json({
      characters: user.credits,
      extraCredits: user.extraCredits,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      transcriptionUsed: user.transcriptionUsed,
    });
    if (referralCookie) res.cookies.delete("referralCode");
    return res;
  }

  // Backfill referral code
  if (!user.referralCode) {
    const referralCode = await uniqueReferralCode();
    user = await prisma.user.update({ where: { id: user.id }, data: { referralCode } });
  }

  return NextResponse.json({
    characters: user.credits,
    extraCredits: user.extraCredits,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
    transcriptionUsed: user.transcriptionUsed,
  });
}
