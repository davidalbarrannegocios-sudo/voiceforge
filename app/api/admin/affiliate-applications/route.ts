import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const applications = await prisma.affiliateApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}
