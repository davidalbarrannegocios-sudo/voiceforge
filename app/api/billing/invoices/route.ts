import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeCustomerId) return NextResponse.json({ invoices: [] });

  const stripe = getStripe();
  const list = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 24 });

  const invoices = list.data.map((inv) => ({
    id: inv.id,
    date: inv.created * 1000,
    amount: inv.amount_paid / 100,
    currency: inv.currency,
    status: inv.status,
    pdfUrl: inv.invoice_pdf,
    hostedUrl: inv.hosted_invoice_url,
  }));

  return NextResponse.json({ invoices });
}
