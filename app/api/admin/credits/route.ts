import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { userId, amount, operation } = body as {
    userId: string;
    amount: number;
    operation: "add" | "subtract";
  };

  if (!userId || typeof amount !== "number" || amount <= 0)
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  if (operation !== "add" && operation !== "subtract")
    return NextResponse.json({ error: "Operación inválida" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (operation === "subtract" && user.credits < amount)
    return NextResponse.json({ error: "El usuario no tiene suficientes créditos" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: operation === "add" ? { increment: amount } : { decrement: amount } },
  });

  return NextResponse.json({ credits: updated.credits });
}
