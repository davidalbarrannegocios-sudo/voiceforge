import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pmId: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "Sin cliente Stripe" }, { status: 400 });

  const { pmId } = await params;
  const stripe = getStripe();

  const pm = await stripe.paymentMethods.retrieve(pmId);
  if (pm.customer !== user.stripeCustomerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await stripe.paymentMethods.detach(pmId);
  return NextResponse.json({ ok: true });
}
