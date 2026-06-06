import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { PLAN_CREDITS } from "@/lib/stripe";

export const runtime = "nodejs";

const VALID_PLANS = ["free", "plus", "pro", "elite", "starter", "enterprise", "lifetime"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;
    const { plan } = await req.json() as { plan: string };

    if (!plan || !VALID_PLANS.includes(plan))
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const credits = PLAN_CREDITS[plan] ?? 0;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan, credits },
      select: { id: true, plan: true, credits: true },
    });

    return NextResponse.json({ plan: user.plan, credits: user.credits });
  } catch (e) {
    console.error("[admin/users/plan]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
