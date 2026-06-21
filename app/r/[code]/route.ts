import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("ref", code.toUpperCase());

  const res = NextResponse.redirect(url);
  const upperCode = code.toUpperCase();
  const maxAge = 365 * 24 * 60 * 60;
  // For signup attribution (deleted after signup)
  res.cookies.set("referralCode", upperCode, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
  });
  // For checkout discount (persists past signup, read server-side)
  res.cookies.set("affiliateRef", upperCode, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
