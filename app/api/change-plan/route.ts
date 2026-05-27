import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPriceId, PLAN_CREDITS, PLANS, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ hasActiveSub: false });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ hasActiveSub: false });

  return NextResponse.json({
    hasActiveSub: !!user.stripeSubscriptionId && user.plan !== "free",
    currentPlan: user.plan,
    billingInterval: user.billingInterval ?? "monthly",
  });
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { planKey, billing = "monthly" } = await req.json() as { planKey: string; billing?: "monthly" | "annual" };

  if (!(planKey in PLANS)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const priceId = getPriceId(planKey as PlanKey, billing);
  if (!priceId) {
    return NextResponse.json({ error: "Precio no configurado para este plan" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ redirect: `/checkout/${planKey}?billing=${billing}` });
  }

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    if (sub.status !== "active") {
      return NextResponse.json({ redirect: `/checkout/${planKey}?billing=${billing}` });
    }

    const updatedSub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: sub.items.data[0].id, price: priceId }],
      proration_behavior: "create_prorations",
    });

    const periodEnd = new Date(updatedSub.items.data[0].current_period_end * 1000);
    const interval = updatedSub.items.data[0].plan.interval;
    const billingInterval = interval === "year" ? "annual" : "monthly";
    const credits = PLAN_CREDITS[planKey] ?? 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: planKey,
        credits,
        planExpiresAt: periodEnd,
        billingInterval,
        creditsRenewedAt: new Date(),
      },
    });

    console.log(`[change-plan] plan changed: user=${user.id} newPlan=${planKey} billing=${billing}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[change-plan] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
