import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { plan } = await req.json();

  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const selectedPlan = PLANS[plan as PlanKey];

  let user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        credits: 0,
      },
    });
  }

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: selectedPlan.price * 100,
    currency: "usd",
    metadata: {
      userId: user.id,
      characters: String(selectedPlan.characters),
      plan,
      source: "elements",
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
