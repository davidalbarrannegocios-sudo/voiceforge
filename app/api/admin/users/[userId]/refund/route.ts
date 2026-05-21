import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;
    const { generationId, creditsToRefund } = await req.json() as {
      generationId: string;
      creditsToRefund: number;
    };

    if (!generationId || typeof creditsToRefund !== "number" || creditsToRefund <= 0)
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    const generation = await prisma.generation.findUnique({ where: { id: generationId } });
    if (!generation) return NextResponse.json({ error: "Generación no encontrada" }, { status: 404 });
    if (generation.userId !== userId) return NextResponse.json({ error: "No coincide el usuario" }, { status: 400 });
    if (generation.refunded) return NextResponse.json({ error: "Ya fue reembolsada" }, { status: 400 });

    const [updatedGen, updatedUser] = await prisma.$transaction([
      prisma.generation.update({
        where: { id: generationId },
        data: { refunded: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsToRefund } },
      }),
    ]);

    return NextResponse.json({ refunded: true, newCredits: updatedUser.credits, generationId: updatedGen.id });
  } catch (e) {
    console.error("[admin/users/refund]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
