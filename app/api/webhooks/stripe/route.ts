import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, getPlanFromPriceId, PLAN_CREDITS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[webhook] signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const stripe = getStripe();

  // ── checkout.session.completed ────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // ── Credit pack (one-time payment) ────────────────────
    if (session.mode === "payment") {
      const userId  = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits ?? "0", 10);
      if (!userId || !credits) {
        console.error("[webhook] missing metadata in payment session", session.id);
        return NextResponse.json({ received: true });
      }

      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id;

      const expiresAt = addMonths(new Date(), 3);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { extraCredits: { increment: credits } },
        }),
        prisma.creditPack.create({
          data: { userId, credits, expiresAt, stripePaymentIntentId: paymentIntentId },
        }),
      ]);

      console.log(`[webhook] credit pack purchased: user=${userId} credits=${credits}`);
      return NextResponse.json({ received: true });
    }

    if (session.mode !== "subscription") return NextResponse.json({ received: true });

    const userId = session.metadata?.userId;
    const planKey = session.metadata?.plan;
    if (!userId || !planKey) {
      console.error("[webhook] missing metadata in session", session.id);
      return NextResponse.json({ received: true });
    }

    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
    if (!subscriptionId) {
      console.error("[webhook] no subscription ID in session", session.id);
      return NextResponse.json({ received: true });
    }

    // Retrieve subscription to get period end
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const credits = PLAN_CREDITS[planKey] ?? 0;

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planKey,
        planExpiresAt: periodEnd,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
        credits,
      },
    });

    console.log(`[webhook] subscription activated: user=${userId} plan=${planKey} credits=${credits}`);
  }

  // ── invoice.paid ──────────────────────────────────────────
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;

    // Skip first payment — handled by checkout.session.completed
    if (invoice.billing_reason === "subscription_create") {
      return NextResponse.json({ received: true });
    }

    // In Stripe v22, subscription is at invoice.parent.subscription_details.subscription
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
    if (!subscriptionId) return NextResponse.json({ received: true });

    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
    if (!user) {
      console.error("[webhook] no user for subscription", subscriptionId);
      return NextResponse.json({ received: true });
    }

    // Get updated period end from subscription
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const credits = PLAN_CREDITS[user.plan] ?? PLAN_CREDITS.free;

    await prisma.user.update({
      where: { id: user.id },
      data: { credits, planExpiresAt: periodEnd },
    });

    console.log(`[webhook] credits renewed: user=${user.id} plan=${user.plan} credits=${credits}`);
  }

  // ── customer.subscription.deleted ────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (!user) return NextResponse.json({ received: true });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: "free",
        planExpiresAt: null,
        stripeSubscriptionId: null,
        credits: 0,
      },
    });

    console.log(`[webhook] subscription cancelled: user=${user.id}`);
  }

  // ── customer.subscription.updated ────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (!user) return NextResponse.json({ received: true });

    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId) return NextResponse.json({ received: true });

    const newPlan = getPlanFromPriceId(priceId);
    if (!newPlan || newPlan === user.plan) return NextResponse.json({ received: true });

    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const credits = PLAN_CREDITS[newPlan] ?? 0;

    await prisma.user.update({
      where: { id: user.id },
      data: { plan: newPlan, planExpiresAt: periodEnd, credits },
    });

    console.log(`[webhook] plan changed: user=${user.id} plan=${newPlan}`);
  }

  // ── payment_intent.succeeded (credit pack backup) ─────────
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const userId  = pi.metadata?.userId;
    const credits = parseInt(pi.metadata?.credits ?? "0", 10);

    if (!userId || !credits) return NextResponse.json({ received: true });

    // Idempotency: skip if already credited
    const existing = await prisma.creditPack.findUnique({ where: { stripePaymentIntentId: pi.id } });
    if (existing) return NextResponse.json({ received: true });

    const expiresAt = addMonths(new Date(), 3);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { extraCredits: { increment: credits } },
      }),
      prisma.creditPack.create({
        data: { userId, credits, expiresAt, stripePaymentIntentId: pi.id },
      }),
    ]);

    console.log(`[webhook] credit pack (pi.succeeded): user=${userId} credits=${credits}`);
  }

  return NextResponse.json({ received: true });
}
