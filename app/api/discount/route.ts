import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const affiliateRef = cookieStore.get("affiliateRef")?.value ?? null;

  if (!affiliateRef) {
    return NextResponse.json({ active: false, percent: 0, label: "DESCUENTO", refCode: null });
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: affiliateRef },
    select: { hasDiscount: true, discountPercentage: true, discountLabel: true },
  });

  if (!referrer?.hasDiscount) {
    return NextResponse.json({ active: false, percent: 0, label: "DESCUENTO", refCode: affiliateRef });
  }

  return NextResponse.json({
    active: true,
    percent: referrer.discountPercentage,
    label: referrer.discountLabel,
    refCode: affiliateRef,
  });
}
