import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "Sin cliente Stripe" }, { status: 400 });

  const { paymentMethodId } = (await req.json()) as { paymentMethodId: string };
  if (!paymentMethodId) return NextResponse.json({ error: "paymentMethodId requerido" }, { status: 400 });

  const stripe = getStripe();

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== user.stripeCustomerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  if (user.stripeSubscriptionId) {
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  return NextResponse.json({ ok: true });
}
