import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPercentage } from "@/lib/elite-text";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ hasPlan: false });

  const eliteText = await prisma.eliteTextPlan.findUnique({ where: { userId: user.id } });
  if (!eliteText) return NextResponse.json({ hasPlan: false });

  return NextResponse.json({
    hasPlan: true,
    plan: eliteText.plan,
    tokensUsed: eliteText.tokensUsed,
    tokensTotal: eliteText.tokensTotal,
    percentage: getTokenPercentage(eliteText.tokensUsed, eliteText.tokensTotal),
    status: eliteText.status,
    renewsAt: eliteText.renewsAt?.toISOString() ?? null,
  });
}
