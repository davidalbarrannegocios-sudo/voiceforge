import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

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
      select: { id: true, email: true, credits: true, plan: true, role: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const [generations, creditsAgg] = await Promise.all([
      prisma.generation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          text: true,
          voiceName: true,
          audioUrl: true,
          creditsUsed: true,
          durationSeconds: true,
          error: true,
          refunded: true,
          createdAt: true,
        },
      }),
      prisma.generation.aggregate({
        where: { userId, creditsUsed: { gt: 0 } },
        _sum: { creditsUsed: true },
        _count: { id: true },
        _avg: { creditsUsed: true },
      }),
    ]);

    const creditsStats = {
      total: creditsAgg._sum.creditsUsed ?? 0,
      count: creditsAgg._count.id ?? 0,
      avg: Math.round(creditsAgg._avg.creditsUsed ?? 0),
    };

    return NextResponse.json({ user, generations, creditsStats });
  } catch (e) {
    console.error("[admin/users/generations]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
