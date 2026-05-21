import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (purchases.length === 0) return NextResponse.json([]);

    const stripe = getStripe();

    const enriched = await Promise.all(
      purchases.map(async (p) => {
        try {
          const session = await stripe.checkout.sessions.retrieve(p.stripeSessionId, {
            expand: ["payment_intent", "payment_intent.latest_charge"],
          });

          const pi = session.payment_intent as Stripe.PaymentIntent | null;
          const charge = pi?.latest_charge as Stripe.Charge | null;
          const last4 = charge?.payment_method_details?.card?.last4 ?? null;
          const amountRefunded = charge?.amount_refunded ?? 0;

          return {
            id: p.id,
            stripeSessionId: p.stripeSessionId,
            paymentIntentId: pi?.id ?? null,
            amount: p.amountCents / 100,
            creditsPurchased: p.creditsPurchased,
            status: amountRefunded > 0 ? "refunded" : (pi?.status ?? "unknown"),
            amountRefunded: amountRefunded / 100,
            last4,
            createdAt: p.createdAt.toISOString(),
          };
        } catch {
          return {
            id: p.id,
            stripeSessionId: p.stripeSessionId,
            paymentIntentId: null,
            amount: p.amountCents / 100,
            creditsPurchased: p.creditsPurchased,
            status: "unknown",
            amountRefunded: 0,
            last4: null,
            createdAt: p.createdAt.toISOString(),
          };
        }
      })
    );

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("[admin/users/payments]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
