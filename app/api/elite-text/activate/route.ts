import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { ELITE_TEXT_PLANS, type EliteTextPlanKey } from "@/lib/elite-text";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { customerId, planKey, paymentMethodId } = (await req.json()) as {
    customerId: string;
    planKey: EliteTextPlanKey;
    paymentMethodId: string;
  };

  if (!customerId || !planKey || !paymentMethodId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  if (!(planKey in ELITE_TEXT_PLANS)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const planConfig = ELITE_TEXT_PLANS[planKey];
  const priceId = planConfig.stripePriceId;
  if (!priceId || priceId.startsWith("price_text_")) {
    return NextResponse.json({ error: "Precio de Stripe no configurado para este plan" }, { status: 500 });
  }

  try {
    const stripe = getStripe();

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Cancel existing EliteText subscription if any
    const existing = await prisma.eliteTextPlan.findUnique({ where: { userId: user.id } });
    if (existing?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(existing.stripeSubscriptionId).catch(() => {});
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: user.id, planKey, type: "elite_text" },
    });

    const renewsAt = new Date(subscription.items.data[0].current_period_end * 1000);

    await prisma.eliteTextPlan.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: planKey,
        tokensTotal: planConfig.tokens,
        tokensUsed: 0,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status === "active" ? "active" : "pending",
        renewsAt,
      },
      update: {
        plan: planKey,
        tokensTotal: planConfig.tokens,
        tokensUsed: 0,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status === "active" ? "active" : "pending",
        renewsAt,
      },
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
