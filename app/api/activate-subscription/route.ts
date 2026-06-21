import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPriceId, PLAN_CREDITS, PLANS, type PlanKey } from "@/lib/stripe";
import { cookies } from "next/headers";

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
        const cookieStore = await cookies();
        cookieStore.delete("affiliateRef");
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

    // Check for affiliate discount cookie
    const cookieStore = await cookies();
    const affiliateRef = cookieStore.get("affiliateRef")?.value ?? null;
    let couponId: string | undefined;
    if (affiliateRef) {
      const coupon = await stripe.coupons.create({
        percent_off: 10,
        duration: "forever",
        name: "Descuento afiliado 10%",
        metadata: { affiliateRef },
      });
      couponId = coupon.id;
      console.log("[activate-subscription] Discount coupon created:", couponId, "for affiliateRef:", affiliateRef);
    }

    // Ensure referredBy is set before Stripe fires invoice.paid
    let effectiveReferredBy = user.referredBy;
    const refCode = cookieStore.get("referralCode")?.value;
    if (refCode && !effectiveReferredBy) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: refCode } });
      if (referrer && referrer.id !== user.id) {
        const alreadyExists = await prisma.referral.findFirst({ where: { referrerId: referrer.id, referredId: user.id } });
        if (!alreadyExists) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { referredBy: referrer.id } }),
            prisma.referral.create({ data: { referrerId: referrer.id, referredId: user.id, status: "pending" } }),
          ]);
          effectiveReferredBy = referrer.id;
          console.log("[activate-subscription] referredBy guardado antes del pago:", referrer.id);
        }
      }
    }

    // Create subscription — first payment charged immediately
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: user.id, planKey, ...(affiliateRef ? { affiliateRef } : {}) },
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
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
      cookieStore.delete("affiliateRef");

      // Referral commission on first subscription
      const finalReferredBy = effectiveReferredBy;
      if (finalReferredBy) {
        const referrer = await prisma.user.findUnique({ where: { id: finalReferredBy }, select: { referralEarned: true } });
        const alreadyRewarded = await prisma.pendingReferralReward.findFirst({ where: { referredId: user.id } });
        if (referrer && !alreadyRewarded) {
          const planPrices: Record<string, number> = { creator: 800, plus: 2600, pro: 4900, elite: 31500 };
          const commission = Math.round((planPrices[planKey] ?? 0) * 0.05);
          if (commission > 0) {
            const pendingUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await prisma.$transaction([
              prisma.pendingReferralReward.create({
                data: { referrerId: finalReferredBy, referredId: user.id, amount: commission, pendingUntil },
              }),
              prisma.user.update({
                where: { id: finalReferredBy },
                data: { referralPending: { increment: commission } },
              }),
            ]);
            console.log("[activate-subscription] referral commission pending:", { referrer: finalReferredBy, commission, pendingUntil });
          }
        }
      }
    }

    return NextResponse.json({ success: true, subscriptionId: subscription.id, status: subscription.status });
  } catch (error) {
    console.error("[activate-subscription] Error completo:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
