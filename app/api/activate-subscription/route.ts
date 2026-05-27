import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPriceId, PLAN_CREDITS, PLANS, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { customerId, planKey, paymentMethodId, billing = "monthly" } = await req.json() as {
    customerId: string;
    planKey: string;
    paymentMethodId: string;
    billing?: "monthly" | "annual";
  };

  console.log("[activate-subscription] customerId:", customerId, "planKey:", planKey, "pmId:", paymentMethodId);

  if (!customerId || !planKey || !paymentMethodId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  if (!(planKey in PLANS)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const priceId = getPriceId(planKey as PlanKey, billing);
  if (!priceId) {
    return NextResponse.json({ error: "Precio no configurado para este plan" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  try {
    const stripe = getStripe();

    // Attach payment method to customer and set as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    console.log("[activate-subscription] PaymentMethod adjunto y configurado como default");

    // If user already has an active subscription, update it instead of creating a duplicate
    if (user.stripeSubscriptionId) {
      const existingSub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId).catch(() => null);
      if (existingSub && existingSub.status === "active") {
        const updatedSub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: [{ id: existingSub.items.data[0].id, price: priceId }],
          default_payment_method: paymentMethodId,
          proration_behavior: "create_prorations",
        });
        const periodEnd = new Date(updatedSub.items.data[0].current_period_end * 1000);
        const interval = updatedSub.items.data[0].plan.interval;
        const billingInterval = interval === "year" ? "annual" : "monthly";
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: planKey,
            credits: PLAN_CREDITS[planKey] ?? 0,
            planExpiresAt: periodEnd,
            billingInterval,
            stripePriceId: priceId,
            creditsRenewedAt: new Date(),
          },
        });
        console.log("[activate-subscription] Suscripción actualizada (proration):", user.stripeSubscriptionId, "→", planKey);
        return NextResponse.json({ success: true, subscriptionId: user.stripeSubscriptionId, status: "active" });
      }
    }

    // Cancel any existing incomplete subscriptions to avoid duplicates
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 5,
    });
    for (const sub of existing.data) {
      await stripe.subscriptions.cancel(sub.id);
    }

    // Create subscription — first payment charged immediately
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: user.id, planKey },
    });
    console.log("[activate-subscription] Suscripción creada:", subscription.id, "status:", subscription.status);

    // Update DB immediately if active (webhook also fires, idempotent)
    if (subscription.status === "active") {
      const periodEnd = new Date(subscription.items.data[0].current_period_end * 1000);
      const interval = subscription.items.data[0].plan.interval;
      const billingInterval = interval === "year" ? "annual" : "monthly";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: planKey,
          credits: { increment: PLAN_CREDITS[planKey] ?? 0 },
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          planExpiresAt: periodEnd,
          billingInterval,
          creditsRenewedAt: new Date(),
        },
      });
      console.log("[activate-subscription] Plan actualizado en DB:", planKey, "periodEnd:", periodEnd, "interval:", billingInterval);
    }

    return NextResponse.json({ success: true, subscriptionId: subscription.id, status: subscription.status });
  } catch (error) {
    console.error("[activate-subscription] Error completo:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
