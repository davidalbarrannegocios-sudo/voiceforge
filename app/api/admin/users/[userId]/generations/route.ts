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
      select: { id: true, email: true, credits: true, role: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const generations = await prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        text: true,
        audioUrl: true,
        creditsUsed: true,
        durationSeconds: true,
        refunded: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user, generations });
  } catch (e) {
    console.error("[admin/users/generations]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
