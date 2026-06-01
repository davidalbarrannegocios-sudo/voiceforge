import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const affiliateRef = cookieStore.get("affiliateRef")?.value ?? null;
  return NextResponse.json({
    active: !!affiliateRef,
    refCode: affiliateRef,
    percent: 10,
  });
}
