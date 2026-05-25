import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MIN_CENTS = 2000; // $20.00

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json() as { amount: number; method: "paypal" | "transfer"; details: Record<string, string> };

  if (!body.amount || isNaN(body.amount) || body.amount < 20) {
    return NextResponse.json({ error: "El importe mínimo de retiro es $20" }, { status: 400 });
  }

  if (!["paypal", "transfer"].includes(body.method)) {
    return NextResponse.json({ error: "Método de pago no válido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { affiliateApplications: { where: { status: "approved" }, take: 1 } },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (user.affiliateApplications.length === 0) {
    return NextResponse.json({ error: "Necesitas ser afiliado aprobado para retirar fondos" }, { status: 403 });
  }

  const amountCents = Math.round(body.amount * 100);

  if (user.referralBalance < amountCents) {
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  if (amountCents < MIN_CENTS) {
    return NextResponse.json({ error: "El importe mínimo de retiro es $20" }, { status: 400 });
  }

  const [withdrawal] = await prisma.$transaction([
    prisma.withdrawalRequest.create({
      data: {
        userId: user.id,
        amount: body.amount,
        method: body.method,
        details: body.details ?? {},
        status: "pending",
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { referralBalance: { decrement: amountCents } },
    }),
  ]);

  return NextResponse.json({ ok: true, withdrawal });
}
