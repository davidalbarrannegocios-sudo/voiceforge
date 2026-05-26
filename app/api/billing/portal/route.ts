import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const clerkUser = await currentUser();
    console.log("[portal] clerkUser:", clerkUser?.id ?? "null");
    if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    console.log("[portal] stripeCustomerId:", user?.stripeCustomerId ?? "null");
    if (!user?.stripeCustomerId) return NextResponse.json({ error: "No hay cliente de Stripe" }, { status: 400 });

    const returnUrl = `${process.env.NEXT_PUBLIC_URL}/dashboard?tab=billing`;
    console.log("[portal] return_url:", returnUrl);

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    console.log("[portal] session url:", session.url);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[portal] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
