import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe";

function getBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${new Headers(req.headers).get("host")}`;
}

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

  const baseUrl = getBaseUrl(req);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
    metadata: {
      userId: user.id,
      credits: String(selectedPlan.credits),
      plan,
    },
    success_url: `${baseUrl}/dashboard?success=1&credits=${selectedPlan.credits}`,
    cancel_url: `${baseUrl}/pricing?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
