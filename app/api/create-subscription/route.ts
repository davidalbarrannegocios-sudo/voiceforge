import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPriceId, PLANS, type PlanKey } from "@/lib/stripe";

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
    console.log("[create-subscription] Buscando usuario en DB...");
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
    console.log("[create-subscription] Usuario encontrado:", user?.id);

    const stripe = getStripe();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      console.log("[create-subscription] Creando customer en Stripe...");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }
    console.log("[create-subscription] Customer ID:", customerId);

    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 5,
    });
    for (const sub of existing.data) {
      await stripe.subscriptions.cancel(sub.id);
    }

    console.log("[create-subscription] Creando suscripción con priceId:", priceId);
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId: user.id },
    });
    console.log("[create-subscription] Suscripción creada:", subscription.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientSecret = (paymentIntent as any)?.client_secret;
    console.log("[create-subscription] clientSecret obtenido:", !!clientSecret);

    if (!clientSecret) {
      return NextResponse.json({ error: "No se pudo obtener el client secret" }, { status: 500 });
    }

    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });
  } catch (error) {
    console.error("[create-subscription] Error completo:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
