import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Public endpoint — no auth required
// Sets httpOnly cookies for checkout attribution + returns discount data for client cookies
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code")?.toUpperCase().trim();

  if (!code) {
    return NextResponse.json({ hasDiscount: false });
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, hasDiscount: true, discountPercentage: true, discountLabel: true },
  });

  if (!referrer) {
    return NextResponse.json({ hasDiscount: false });
  }

  const res = NextResponse.json({
    hasDiscount: referrer.hasDiscount,
    percentage: referrer.discountPercentage,
    label: referrer.discountLabel,
  });

  // Also set httpOnly cookies for checkout + signup attribution
  const maxAge = 30 * 24 * 60 * 60;
  res.cookies.set("affiliateRef", code, { httpOnly: true, maxAge, path: "/", sameSite: "lax" });
  res.cookies.set("referralCode", code, { httpOnly: true, maxAge, path: "/", sameSite: "lax" });

  return res;
}
