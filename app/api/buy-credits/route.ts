import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, CREDIT_PACKS, getPackPriceId, type PackKey } from "@/lib/stripe";

export const runtime = "nodejs";

function getBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${new Headers(req.headers).get("host")}`;
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { packKey } = await req.json() as { packKey: string };

  if (!packKey || !(packKey in CREDIT_PACKS)) {
    return NextResponse.json({ error: "Pack inválido" }, { status: 400 });
  }

  const pack = CREDIT_PACKS[packKey as PackKey];
  const priceId = getPackPriceId(packKey);
  if (!priceId) {
    return NextResponse.json({ error: "Precio no configurado para este pack" }, { status: 500 });
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

  const baseUrl = getBaseUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId: user.id, packKey, credits: pack.credits.toString() },
    success_url: `${baseUrl}/dashboard?creditsBought=${pack.credits}`,
    cancel_url: `${baseUrl}/dashboard`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
