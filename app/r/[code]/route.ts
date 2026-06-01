import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = req.nextUrl.clone();
  url.pathname = "/sign-up";

  const res = NextResponse.redirect(url);
  const upperCode = code.toUpperCase();
  // For signup attribution (deleted after signup)
  res.cookies.set("referralCode", upperCode, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
  });
  // For checkout discount (persists past signup, read server-side)
  res.cookies.set("affiliateRef", upperCode, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
