import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let code: string;
  try {
    const body = await req.json();
    code = String(body.code ?? "").toUpperCase().trim();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { hasDiscount: true, discountPercentage: true, discountLabel: true },
  });

  const discount = referrer?.hasDiscount
    ? { active: true, percent: referrer.discountPercentage, label: referrer.discountLabel }
    : { active: false, percent: 0, label: "DESCUENTO" };

  const res = NextResponse.json({ ok: true, discount });

  const maxAge = 365 * 24 * 60 * 60;
  res.cookies.set("affiliateRef", code, { httpOnly: true, maxAge, path: "/", sameSite: "lax" });
  res.cookies.set("referralCode", code, { httpOnly: true, maxAge, path: "/", sameSite: "lax" });

  return res;
}
