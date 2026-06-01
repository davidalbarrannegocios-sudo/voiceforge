import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const c = randCode();
    const exists = await prisma.user.findUnique({ where: { referralCode: c }, select: { id: true } });
    if (!exists) return c;
  }
  throw new Error("No se pudo generar código único");
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      plan: true,
      createdAt: true,
      referralCode: true,
      affiliateType: true,
      referralBalance: true,
      referralEarned: true,
      hasDiscount: true,
      discountPercentage: true,
      discountLabel: true,
      referralsGiven: {
        select: {
          id: true, status: true, rewardChars: true, createdAt: true,
          referred: { select: { id: true, email: true, plan: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { generations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = users.map(u => ({
    id: u.id,
    email: u.email,
    plan: u.plan,
    createdAt: u.createdAt.toISOString(),
    referralCode: u.referralCode,
    affiliateType: u.affiliateType,
    referralBalance: u.referralBalance,
    referralEarned: u.referralEarned,
    hasDiscount: u.hasDiscount,
    discountPercentage: u.discountPercentage,
    discountLabel: u.discountLabel,
    inviteCount: u.referralsGiven.length,
    conversionCount: u.referralsGiven.filter(r => r.status !== "pending").length,
    creditsEarned: u.referralsGiven.reduce((acc, r) => acc + r.rewardChars, 0),
    generationCount: u._count.generations,
    referrals: u.referralsGiven.map(r => ({
      id: r.id,
      status: r.status,
      rewardChars: r.rewardChars,
      createdAt: r.createdAt.toISOString(),
      referred: { ...r.referred, createdAt: r.referred.createdAt.toISOString() },
    })),
  }));

  const cashUsers = mapped.filter(u => u.affiliateType === "cash");
  const totalInvites = mapped.reduce((s, u) => s + u.inviteCount, 0);
  const totalConversions = mapped.reduce((s, u) => s + u.conversionCount, 0);

  return NextResponse.json({
    users: mapped,
    stats: {
      totalStandard: mapped.filter(u => u.affiliateType !== "cash").length,
      totalCash: cashUsers.length,
      totalInvites,
      totalConversions,
      conversionRate: totalInvites > 0 ? Math.round((totalConversions / totalInvites) * 100) : 0,
      pendingCommission: cashUsers.reduce((s, u) => s + u.referralBalance, 0),
      paidCommission: cashUsers.reduce((s, u) => s + Math.max(0, u.referralEarned - u.referralBalance), 0),
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { action, userId } = body;

  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, referralBalance: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  switch (action) {
    case "new-code": {
      const code = await uniqueCode();
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return NextResponse.json({ ok: true, referralCode: code });
    }
    case "custom-code": {
      const { code } = body;
      if (!code || !/^[A-Z0-9]{3,12}$/i.test(code))
        return NextResponse.json({ error: "Código inválido (3-12 alfanumérico)" }, { status: 400 });
      const clean = code.toUpperCase();
      const taken = await prisma.user.findFirst({ where: { referralCode: clean, NOT: { id: userId } }, select: { id: true } });
      if (taken) return NextResponse.json({ error: "Código ya en uso" }, { status: 409 });
      await prisma.user.update({ where: { id: userId }, data: { referralCode: clean } });
      return NextResponse.json({ ok: true, referralCode: clean });
    }
    case "bonus-credits": {
      const { amount } = body;
      if (!amount || amount < 1) return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
      return NextResponse.json({ ok: true });
    }
    case "set-type": {
      const { type } = body;
      if (!["standard", "cash"].includes(type))
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      await prisma.user.update({ where: { id: userId }, data: { affiliateType: type } });
      return NextResponse.json({ ok: true });
    }
    case "mark-paid": {
      const amount = body.amount ?? user.referralBalance;
      if (amount <= 0) return NextResponse.json({ error: "Sin comisión pendiente" }, { status: 400 });
      await prisma.user.update({
        where: { id: userId },
        data: { referralBalance: { decrement: amount } },
      });
      return NextResponse.json({ ok: true });
    }
    case "set-discount": {
      const pct = Number(body.discountPercentage);
      if (body.hasDiscount && (isNaN(pct) || pct < 1 || pct > 100))
        return NextResponse.json({ error: "Porcentaje inválido (1-100)" }, { status: 400 });
      await prisma.user.update({
        where: { id: userId },
        data: {
          hasDiscount: !!body.hasDiscount,
          discountPercentage: body.hasDiscount ? pct : 10,
          discountLabel: String(body.discountLabel || "DESCUENTO").slice(0, 50),
        },
      });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  }
}
