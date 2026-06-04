import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const LIFETIME_CLERK_ID = "cmpveay6i000syjqiz4xy6izg";
const LIFETIME_AMOUNT_CENTS = 34_000; // $340.00

export async function POST() {
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== LIFETIME_CLERK_ID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const stripe = getStripe();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: LIFETIME_AMOUNT_CENTS,
    currency: "usd",
    customer: customerId,
    description: "Elite Vitalicio — 20.000.000 créditos sin caducidad",
    metadata: {
      type: "lifetime",
      userId: user.id,
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    isRenewal: user.plan === "lifetime",
  });
}
