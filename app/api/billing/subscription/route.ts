import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeSubscriptionId || !user?.stripeCustomerId) {
    return NextResponse.json({ subscription: null });
  }

  const stripe = getStripe();

  const [subscription, customer] = await Promise.all([
    stripe.subscriptions.retrieve(user.stripeSubscriptionId),
    stripe.customers.retrieve(user.stripeCustomerId) as Promise<Stripe.Customer>,
  ]);

  const defaultPaymentMethodId =
    subscription.default_payment_method ?? customer.invoice_settings?.default_payment_method ?? null;

  let paymentMethod: { brand: string; last4: string } | null = null;
  if (defaultPaymentMethodId && typeof defaultPaymentMethodId === "string") {
    const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
    if (pm.card) {
      paymentMethod = { brand: pm.card.brand, last4: pm.card.last4 };
    }
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;

  return NextResponse.json({
    subscription: {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd * 1000 : null,
      paymentMethod,
    },
  });
}

export async function PATCH(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No hay suscripción activa" }, { status: 400 });
  }

  const { action } = await req.json() as { action: "cancel" | "reactivate" };
  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: action === "cancel",
  });

  const updatedPeriodEnd = updated.items.data[0]?.current_period_end ?? null;

  // Email de cancelación
  if (action === "cancel" && process.env.RESEND_API_KEY && user.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const planName = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);
    const expiryDate = updatedPeriodEnd
      ? new Date(updatedPeriodEnd * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
      : "";
    resend.emails.send({
      from: "Elite Labs <noreply@elitelabs.es>",
      to: user.email,
      subject: "Lamentamos verte partir 👋",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #e5e7eb; background: #0a0a0f; padding: 40px 32px; border-radius: 12px;">
          <h2 style="color: #fff; margin-top: 0; font-size: 22px;">Lamentamos verte partir 👋</h2>
          <p style="color: #9ca3af; line-height: 1.7;">
            Tal como solicitaste, hemos programado la cancelación de tu suscripción al plan <strong style="color: #e5e7eb;">${planName}</strong>.
            Podrás seguir disfrutando de todos tus beneficios hasta el <strong style="color: #e5e7eb;">${expiryDate}</strong>.
          </p>
          <p style="color: #9ca3af; line-height: 1.7;">
            Sabemos que el tiempo es valioso y que las circunstancias cambian. Si en algún momento decides volver, estaremos aquí con las puertas abiertas y con mejoras que seguro te van a gustar.
          </p>
          <div style="margin: 32px 0; padding: 20px 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;">¿Te lo has pensado mejor?</p>
            <p style="margin: 0 0 16px 0; color: #d1d5db; font-size: 14px; line-height: 1.6;">Puedes reactivar tu suscripción en cualquier momento antes del ${expiryDate}. Todos tus datos, voces clonadas e historial estarán esperándote.</p>
            <a href="https://elitelabs.es/dashboard?tab=billing"
               style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #000000; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
              Reactivar suscripción →
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            Si tienes alguna duda escríbenos a
            <a href="mailto:soporte@elitelabs.es" style="color: #a78bfa;">soporte@elitelabs.es</a>
          </p>
          <p style="margin-top: 32px; font-size: 12px; color: #4b5563;">Elite Labs · elitelabs.es</p>
        </div>
      `,
    }).catch(console.error);
  }

  return NextResponse.json({
    cancelAtPeriodEnd: updated.cancel_at_period_end,
    currentPeriodEnd: updatedPeriodEnd ? updatedPeriodEnd * 1000 : null,
  });
}
