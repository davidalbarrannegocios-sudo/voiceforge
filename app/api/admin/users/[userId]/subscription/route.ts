import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ noSubscription: true });
    }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    const item = sub.items.data[0];
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null;
    const cancelAt = sub.cancel_at
      ? new Date(sub.cancel_at * 1000).toISOString()
      : null;

    return NextResponse.json({
      subscriptionId: sub.id,
      customerId: user.stripeCustomerId,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: periodEnd,
      cancelAt,
      interval: item?.plan?.interval ?? null,
    });
  } catch (e) {
    console.error("[admin/subscription]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
