import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { ELITE_TEXT_PLANS, type EliteTextPlanKey } from "@/lib/elite-text";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { planKey } = (await req.json()) as { planKey: EliteTextPlanKey };
  if (!planKey || !(planKey in ELITE_TEXT_PLANS)) {
    return NextResponse.json({ error: "planKey inválido" }, { status: 400 });
  }

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

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: { planKey, userId: user.id, type: "elite_text" },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
      planKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
