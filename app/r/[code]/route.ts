import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = req.nextUrl.clone();
  url.pathname = "/sign-up";

  const res = NextResponse.redirect(url);
  res.cookies.set("referralCode", code.toUpperCase(), {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
