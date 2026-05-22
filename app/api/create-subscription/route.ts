import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { planKey } = await req.json() as { planKey: string };
  console.log("[create-subscription] planKey:", planKey);

  if (!planKey) return NextResponse.json({ error: "planKey requerido" }, { status: 400 });

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
    console.log("[create-subscription] Usuario:", user.id);

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
    console.log("[create-subscription] Customer:", customerId);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: { planKey, userId: user.id },
    });
    console.log("[create-subscription] SetupIntent creado:", setupIntent.id);

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
      planKey,
    });
  } catch (error) {
    console.error("[create-subscription] Error completo:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
