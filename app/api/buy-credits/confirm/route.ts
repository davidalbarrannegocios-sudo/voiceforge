import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { paymentIntentId } = await req.json() as { paymentIntentId: string };
  if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId requerido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Idempotency: if already credited, return success
  const existing = await prisma.creditPack.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  if (existing) {
    return NextResponse.json({ success: true, credits: existing.credits, alreadyCredited: true });
  }

  // Verify payment with Stripe
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "El pago no se completó correctamente" }, { status: 402 });
  }

  const credits = parseInt(paymentIntent.metadata?.credits ?? "0", 10);
  if (!credits) return NextResponse.json({ error: "Metadata de créditos no encontrada" }, { status: 400 });

  // Verify this payment belongs to this user
  if (paymentIntent.metadata?.userId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { extraCredits: { increment: credits } },
    }),
    prisma.creditPack.create({
      data: { userId: user.id, credits, expiresAt, stripePaymentIntentId: paymentIntentId },
    }),
  ]);

  console.log(`[buy-credits/confirm] user=${user.id} credits=${credits} pi=${paymentIntentId}`);

  return NextResponse.json({ success: true, credits });
}
