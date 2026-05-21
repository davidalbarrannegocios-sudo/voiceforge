import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      credits: true,
      role: true,
      createdAt: true,
      _count: { select: { generations: true } },
      purchases: { select: { amountCents: true } },
    },
  });

  return NextResponse.json(users);
}
