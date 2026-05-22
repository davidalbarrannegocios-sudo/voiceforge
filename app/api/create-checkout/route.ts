import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, PLANS, getPriceId, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";

function getBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${new Headers(req.headers).get("host")}`;
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { plan } = await req.json() as { plan: string };

  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

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

  const baseUrl = getBaseUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPriceId(plan as PlanKey), quantity: 1 }],
    metadata: { userId: user.id, plan },
    allow_promotion_codes: true,
    success_url: `${baseUrl}/dashboard?success=1&plan=${plan}`,
    cancel_url: `${baseUrl}/pricing?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
