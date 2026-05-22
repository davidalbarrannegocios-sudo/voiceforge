import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPriceId, PLANS, type PlanKey } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { planKey } = await req.json() as { planKey: string };
  console.log("[create-subscription] Iniciando, priceId recibido:", planKey);
  console.log("[create-subscription] Variables de entorno:", {
    starter: !!process.env.STRIPE_PRICE_STARTER_MONTHLY,
    pro: !!process.env.STRIPE_PRICE_PRO_MONTHLY,
    elite: !!process.env.STRIPE_PRICE_ELITE_MONTHLY,
    stripeKey: !!process.env.STRIPE_SECRET_KEY,
  });
  if (!planKey || !(planKey in PLANS)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }
  const priceId = getPriceId(planKey as PlanKey);
  if (!priceId) {
    return NextResponse.json({ error: "Precio no configurado para este plan" }, { status: 500 });
  }

  try {
    let user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          credits: 10_000,
          plan: "free",
        },
      });
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    // Cancel any existing incomplete subscription for this customer to avoid duplicates
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 5,
    });
    for (const sub of existing.data) {
      await stripe.subscriptions.cancel(sub.id);
    }

    // Create the subscription in incomplete state
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId: user.id },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = (invoice as unknown as { payment_intent: Stripe.PaymentIntent | null })?.payment_intent;

    if (!paymentIntent?.client_secret) {
      return NextResponse.json({ error: "No se pudo crear el intento de pago" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("[create-subscription] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
