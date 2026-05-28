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
  if (!user?.stripeCustomerId) return NextResponse.json({ paymentMethods: [] });

  const stripe = getStripe();

  const [customer, list] = await Promise.all([
    stripe.customers.retrieve(user.stripeCustomerId) as Promise<Stripe.Customer>,
    stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card" }),
  ]);

  const defaultPmId =
    (customer.invoice_settings?.default_payment_method as string | null) ?? null;

  const paymentMethods = list.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? "unknown",
    last4: pm.card?.last4 ?? "????",
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
    isDefault: pm.id === defaultPmId,
  }));

  return NextResponse.json({ paymentMethods });
}
