import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, getPlanFromPriceId, PLAN_CREDITS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { Resend } from "resend";
import { log } from "@/lib/logger";

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
    log("error", "stripe-webhook", "signature validation failed", { err: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const stripe = getStripe();

  // ── checkout.session.completed ────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      log("info", "stripe-webhook", "checkout.session.completed", { sessionId: session.id, mode: session.mode, plan: session.metadata?.plan, userId: session.metadata?.userId });

      // ── API wallet recharge ───────────────────────────────
      if (session.mode === "payment" && session.metadata?.type === "api_recharge") {
        const clerkId = session.metadata.userId;
        const bytes   = session.metadata.bytes;
        const euros   = Number(session.metadata.euros);
        const dbUser  = await prisma.user.findFirst({ where: { clerkId } });
        if (dbUser && bytes) {
          await prisma.apiWallet.upsert({
            where: { userId: dbUser.id },
            create: { userId: dbUser.id, bytes: BigInt(bytes), totalSpent: euros },
            update: {
              bytes: { increment: BigInt(bytes) },
              totalSpent: { increment: euros },
            },
          });
          log("info", "stripe-webhook", "api_recharge completed", { userId: dbUser.id, bytes, euros });
        }
        return NextResponse.json({ received: true });
      }

      // ── Credit pack (one-time payment) ────────────────────
      if (session.mode === "payment") {
        const userId  = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits ?? "0", 10);
        if (!userId || !credits) {
          log("error", "stripe-webhook", "missing metadata in payment session", { sessionId: session.id });
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

        log("info", "stripe-webhook", "credit pack purchased", { userId, credits });

        // 5% referral commission on credit pack purchase
        if (session.amount_total && session.amount_total > 0) {
          const payer = await prisma.user.findUnique({ where: { id: userId }, select: { referredBy: true } });
          if (payer?.referredBy) {
            const commission = Math.floor(session.amount_total * 0.05);
            await prisma.user.update({
              where: { id: payer.referredBy },
              data: { referralBalance: { increment: commission }, referralEarned: { increment: commission } },
            });
            log("info", "stripe-webhook", "referral commission (credit pack)", { referrer: payer.referredBy, commission });
          }
        }

        return NextResponse.json({ received: true });
      }

      if (session.mode !== "subscription") return NextResponse.json({ received: true });

      const userId = session.metadata?.userId;
      const planKey = session.metadata?.plan;
      if (!userId || !planKey) {
        log("error", "stripe-webhook", "missing metadata in session", { sessionId: session.id });
        return NextResponse.json({ received: true });
      }

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      if (!subscriptionId) {
        log("error", "stripe-webhook", "no subscription ID in session", { sessionId: session.id });
        return NextResponse.json({ received: true });
      }

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
      const credits = PLAN_CREDITS[planKey] ?? 0;
      const interval = sub.items.data[0].plan.interval;
      const billingInterval = interval === "year" ? "annual" : "monthly";

      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: planKey,
          planExpiresAt: periodEnd,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          credits,
          billingInterval,
          creditsRenewedAt: new Date(),
        },
      });

      log("info", "stripe-webhook", "subscription activated", { userId, plan: planKey, credits }, userId);

      // 5% referral commission on first subscription payment
      const subAmount = sub.items.data[0]?.plan?.amount ?? 0;
      if (subAmount > 0) {
        const subscriber = await prisma.user.findUnique({ where: { id: userId }, select: { referredBy: true } });
        if (subscriber?.referredBy) {
          const commission = Math.floor(subAmount * 0.05);
          await prisma.user.update({
            where: { id: subscriber.referredBy },
            data: { referralBalance: { increment: commission }, referralEarned: { increment: commission } },
          });
          log("info", "stripe-webhook", "referral commission (subscription)", { referrer: subscriber.referredBy, commission });
        }
      }
    } catch (error) {
      log("error", "stripe-webhook", "checkout.session.completed handler error", { error: String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json({ received: true }, { status: 200 });
    }
  }

  // ── invoice.paid ──────────────────────────────────────────
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const billingReason = invoice.billing_reason;

    // Skip first payment — handled by checkout.session.completed / activate-subscription
    if (billingReason === "subscription_create") {
      return NextResponse.json({ received: true });
    }

    // In Stripe v22, subscription is at invoice.parent.subscription_details.subscription
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
    if (!subscriptionId) return NextResponse.json({ received: true });

    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
    if (!user) {
      log("error", "stripe-webhook", "no user for subscription", { subscriptionId });
      return NextResponse.json({ received: true });
    }

    // Get updated period end from subscription
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const planCredits = PLAN_CREDITS[user.plan] ?? PLAN_CREDITS.free;

    // Enterprise monthly renewal: distribute to team members (reset, don't accumulate)
    if (billingReason === "subscription_cycle" && user.plan === "enterprise") {
      const team = await prisma.team.findUnique({
        where: { ownerId: user.id },
        include: { members: { where: { percentage: { gt: 0 } } } },
      });

      if (team && team.members.length > 0) {
        const distributions = team.members.map((m) => ({
          memberId: m.id,
          userId: m.userId,
          credits: Math.floor(planCredits * m.percentage / 100),
        }));
        const totalDistributed = distributions.reduce((sum, d) => sum + d.credits, 0);
        const ownerCredits = planCredits - totalDistributed;

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { credits: ownerCredits, planExpiresAt: periodEnd },
          }),
          ...distributions.map((d) =>
            prisma.user.update({ where: { id: d.userId }, data: { credits: d.credits } })
          ),
          ...distributions.map((d) =>
            prisma.teamMember.update({ where: { id: d.memberId }, data: { creditsLastDistributed: d.credits } })
          ),
        ]);

        log("info", "stripe-webhook", "enterprise renewal distributed", { userId: user.id, ownerCredits, members: distributions.length }, user.id);
        return NextResponse.json({ received: true });
      }
    }

    // subscription_cycle = monthly renewal → reset to plan credits (don't accumulate)
    // subscription_update = plan upgrade/downgrade → accumulate on top of remaining credits
    const creditsUpdate = billingReason === "subscription_cycle"
      ? { credits: planCredits }
      : { credits: { increment: planCredits } };

    await prisma.user.update({
      where: { id: user.id },
      data: { ...creditsUpdate, planExpiresAt: periodEnd },
    });

    log("info", "stripe-webhook", "credits updated on invoice.paid", { userId: user.id, plan: user.plan, reason: billingReason, credits: planCredits }, user.id);

    // 5% referral commission on renewal
    if (invoice.amount_paid > 0 && user.referredBy) {
      const commission = Math.floor(invoice.amount_paid * 0.05);
      await prisma.user.update({
        where: { id: user.referredBy },
        data: { referralBalance: { increment: commission }, referralEarned: { increment: commission } },
      });
      log("info", "stripe-webhook", "referral commission (renewal)", { referrer: user.referredBy, commission });
    }
  }

  // ── customer.subscription.deleted ────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (!user) return NextResponse.json({ received: true });

    // Enterprise cancellation: zero out all team member credits
    if (user.plan === "enterprise") {
      const team = await prisma.team.findUnique({
        where: { ownerId: user.id },
        include: { members: true },
      });

      if (team && team.members.length > 0) {
        await prisma.$transaction([
          ...team.members.map((m) =>
            prisma.user.update({ where: { id: m.userId }, data: { credits: 0 } })
          ),
          ...team.members.map((m) =>
            prisma.teamMember.update({ where: { id: m.id }, data: { creditsLastDistributed: 0 } })
          ),
        ]);

        // Notify members (non-blocking)
        if (process.env.RESEND_API_KEY) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          for (const member of team.members) {
            resend.emails.send({
              from: "Elite Labs <noreply@elitelabs.es>",
              to: member.email,
              subject: "Tu acceso al equipo Enterprise ha finalizado",
              html: `
                <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #e5e7eb; background: #0a0a0f; padding: 32px; border-radius: 12px;">
                  <h2 style="color: #fff; margin-top: 0;">Acceso al equipo finalizado</h2>
                  <p>Hola,</p>
                  <p>El plan Enterprise del equipo <strong>"${team.name}"</strong> ha sido cancelado.</p>
                  <p>Los créditos asignados a tu cuenta por este equipo han sido eliminados. Puedes suscribirte a un plan propio para seguir usando Elite Labs.</p>
                  <a href="https://elitelabs.es/pricing"
                     style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #ffffff; color: #000000; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Ver planes
                  </a>
                  <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Elite Labs · elitelabs.es</p>
                </div>
              `,
            }).catch((err) => log("error", "stripe-webhook", "member cancellation email error", { err: String(err) }));
          }
        }

        log("info", "stripe-webhook", "enterprise team credits zeroed", { teamId: team.id, members: team.members.length }, user.id);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: "free",
        planExpiresAt: null,
        stripeSubscriptionId: null,
        credits: 0,
      },
    });

    log("info", "stripe-webhook", "subscription cancelled", { userId: user.id }, user.id);
  }

  // ── customer.subscription.updated ────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (!user) return NextResponse.json({ received: true });

    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId) return NextResponse.json({ received: true });

    const newPlan = getPlanFromPriceId(priceId);
    if (!newPlan) return NextResponse.json({ received: true });

    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const interval = sub.items.data[0].plan.interval;
    const newBillingInterval = interval === "year" ? "annual" : "monthly";

    // Always update billingInterval and stripePriceId — catches monthly↔annual switches on same plan
    const updateData: Parameters<typeof prisma.user.update>[0]["data"] = {
      billingInterval: newBillingInterval,
      stripePriceId: priceId,
      planExpiresAt: periodEnd,
    };

    if (newPlan !== user.plan) {
      updateData.plan = newPlan;
      updateData.credits = PLAN_CREDITS[newPlan] ?? 0;
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    log("info", "stripe-webhook", "subscription updated", { userId: user.id, plan: newPlan, billing: newBillingInterval }, user.id);
  }

  // ── payment_intent.succeeded ──────────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;

    // ── API wallet recharge ──────────────────────────────────
    if (pi.metadata?.type === "api_recharge") {
      const { userId, bytes, euros } = pi.metadata;
      const dbUser = await prisma.user.findFirst({ where: { clerkId: userId } });
      if (dbUser && bytes) {
        await prisma.apiWallet.upsert({
          where: { userId: dbUser.id },
          create: { userId: dbUser.id, bytes: BigInt(bytes), totalSpent: Number(euros) },
          update: {
            bytes: { increment: BigInt(bytes) },
            totalSpent: { increment: Number(euros) },
          },
        });
        log("info", "stripe-webhook", "api_recharge via payment_intent", { userId: dbUser.id, bytes, euros });
      }
      return NextResponse.json({ received: true });
    }

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

    log("info", "stripe-webhook", "credit pack via payment_intent.succeeded", { userId, credits });
  }

  return NextResponse.json({ received: true });
}
