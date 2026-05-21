import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;
    const { purchaseId } = await req.json() as { purchaseId: string };

    if (!purchaseId)
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
    if (purchase.userId !== userId)
      return NextResponse.json({ error: "No coincide el usuario" }, { status: 400 });

    const stripe = getStripe();

    // Get the payment intent from the checkout session
    const session = await stripe.checkout.sessions.retrieve(purchase.stripeSessionId, {
      expand: ["payment_intent", "payment_intent.latest_charge"],
    });
    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (!pi) return NextResponse.json({ error: "Payment intent no encontrado" }, { status: 400 });

    // Check if already refunded via the latest charge
    const charge = pi.latest_charge as Stripe.Charge | null;
    if (charge?.amount_refunded && charge.amount_refunded > 0)
      return NextResponse.json({ error: "Este pago ya fue reembolsado" }, { status: 400 });

    // Issue Stripe refund
    const refund = await stripe.refunds.create({ payment_intent: pi.id });

    // Deduct credits from user (floor at 0)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const newCredits = Math.max(0, (user?.credits ?? 0) - purchase.creditsPurchased);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: newCredits },
    });

    return NextResponse.json({
      refundId: refund.id,
      status: refund.status,
      newCredits: updated.credits,
      creditsDeducted: purchase.creditsPurchased,
    });
  } catch (e) {
    console.error("[admin/users/refund-payment]", e);
    const msg = e instanceof Error ? e.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
