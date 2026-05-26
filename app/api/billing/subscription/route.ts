import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeSubscriptionId || !user?.stripeCustomerId) {
    return NextResponse.json({ subscription: null });
  }

  const stripe = getStripe();

  const [subscription, customer] = await Promise.all([
    stripe.subscriptions.retrieve(user.stripeSubscriptionId),
    stripe.customers.retrieve(user.stripeCustomerId) as Promise<Stripe.Customer>,
  ]);

  const defaultPaymentMethodId =
    subscription.default_payment_method ?? customer.invoice_settings?.default_payment_method ?? null;

  let paymentMethod: { brand: string; last4: string } | null = null;
  if (defaultPaymentMethodId && typeof defaultPaymentMethodId === "string") {
    const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
    if (pm.card) {
      paymentMethod = { brand: pm.card.brand, last4: pm.card.last4 };
    }
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;

  return NextResponse.json({
    subscription: {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd * 1000 : null,
      paymentMethod,
    },
  });
}

export async function PATCH(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No hay suscripción activa" }, { status: 400 });
  }

  const { action } = await req.json() as { action: "cancel" | "reactivate" };
  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: action === "cancel",
  });

  const updatedPeriodEnd = updated.items.data[0]?.current_period_end ?? null;

  return NextResponse.json({
    cancelAtPeriodEnd: updated.cancel_at_period_end,
    currentPeriodEnd: updatedPeriodEnd ? updatedPeriodEnd * 1000 : null,
  });
}
