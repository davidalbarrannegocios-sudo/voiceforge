import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function getBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${new Headers(req.headers).get("host")}`;
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No hay suscripción activa" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
