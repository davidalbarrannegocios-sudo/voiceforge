import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const characters = parseInt(session.metadata?.characters ?? "0");
    const amountCents = session.amount_total ?? 0;

    if (!userId || !characters) {
      console.error("Webhook: missing metadata in session", session.id);
      return NextResponse.json({ received: true });
    }

    // Buscar usuario por ID interno; si no existe (edge case) buscar por clerkId
    // del customer_email como fallback
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      console.error("Webhook: user not found for id", userId);
      // Responder 200 para que Stripe no reintente — registrar el incidente
      return NextResponse.json({ received: true, warning: "user_not_found" });
    }

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: characters } },
        }),
        prisma.purchase.create({
          data: {
            userId: user.id,
            stripeSessionId: session.id,
            creditsPurchased: characters,
            amountCents,
          },
        }),
      ]);
    } catch (err) {
      console.error("Webhook: DB transaction failed", err);
      // Devolver 500 para que Stripe reintente
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
