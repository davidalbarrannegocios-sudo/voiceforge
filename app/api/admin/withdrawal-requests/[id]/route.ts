import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json() as { status: "paid" | "rejected" };

    if (!["paid", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    const existing = await prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Solo se pueden actualizar solicitudes pendientes" }, { status: 400 });
    }

    if (body.status === "rejected") {
      const amountCents = Math.round(existing.amount * 100);
      await prisma.$transaction([
        prisma.withdrawalRequest.update({
          where: { id },
          data: { status: "rejected" },
        }),
        prisma.user.update({
          where: { id: existing.userId },
          data: { referralBalance: { increment: amountCents } },
        }),
      ]);
    } else {
      await prisma.withdrawalRequest.update({
        where: { id },
        data: { status: "paid", paidAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/withdrawal-requests PATCH]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
