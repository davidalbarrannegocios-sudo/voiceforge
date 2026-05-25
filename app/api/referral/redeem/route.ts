import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLANS, CREDIT_PACKS } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const body = await req.json() as {
    type: "plan" | "chars" | "cash";
    planKey?: string;
    packKey?: string;
    paymentMethod?: string;
  };

  if (body.type === "plan") {
    const plan = PLANS[body.planKey as keyof typeof PLANS];
    if (!plan) return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    const costCents = plan.price * 100;
    if (user.referralBalance < costCents) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 402 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        referralBalance: { decrement: costCents },
        credits: { increment: plan.characters },
      },
    });
    return NextResponse.json({ ok: true, addedChars: plan.characters });
  }

  if (body.type === "chars") {
    const pack = CREDIT_PACKS[body.packKey as keyof typeof CREDIT_PACKS];
    if (!pack) return NextResponse.json({ error: "Pack no válido" }, { status: 400 });
    const costCents = pack.price * 100;
    if (user.referralBalance < costCents) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 402 });
    }
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          referralBalance: { decrement: costCents },
          extraCredits: { increment: pack.credits },
        },
      }),
      prisma.creditPack.create({
        data: { userId: user.id, credits: pack.credits, expiresAt },
      }),
    ]);
    return NextResponse.json({ ok: true, addedChars: pack.credits });
  }

  if (body.type === "cash") {
    if (!body.paymentMethod) return NextResponse.json({ error: "Método de pago requerido" }, { status: 400 });
    if (user.referralBalance < 1000) {
      return NextResponse.json({ error: "Se requiere un mínimo de $10 para solicitar pago en efectivo" }, { status: 402 });
    }
    const amount = user.referralBalance;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { referralBalance: 0 },
      }),
      prisma.payoutRequest.create({
        data: { userId: user.id, amountCents: amount, method: body.paymentMethod },
      }),
    ]);
    return NextResponse.json({ ok: true, requestedCents: amount });
  }

  return NextResponse.json({ error: "Tipo de canje no válido" }, { status: 400 });
}
