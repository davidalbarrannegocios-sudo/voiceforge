import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, CREDIT_PACKS, type PackKey } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { packKey } = await req.json() as { packKey: string };

  if (!packKey || !(packKey in CREDIT_PACKS)) {
    return NextResponse.json({ error: "Pack inválido" }, { status: 400 });
  }

  const pack = CREDIT_PACKS[packKey as PackKey];

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
    amount: pack.price * 100,
    currency: "usd",
    customer: customerId,
    metadata: { userId: user.id, packKey, credits: pack.credits.toString() },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    credits: pack.credits,
    price: pack.price,
    label: pack.label,
  });
}
