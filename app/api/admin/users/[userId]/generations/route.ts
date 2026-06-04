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

    const [
      generations,
      ttsSumResult,
      dialogueSumResult,
      asrSumResult,
      translationSumResult,
    ] = await Promise.all([
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
        where: { userId, NOT: { voiceName: { startsWith: "Diálogo (" } } },
        _sum: { creditsUsed: true },
      }),
      prisma.generation.aggregate({
        where: { userId, voiceName: { startsWith: "Diálogo (" } },
        _sum: { creditsUsed: true },
      }),
      prisma.transcriptionTask.aggregate({
        where: { userId },
        _sum: { creditsUsed: true },
      }),
      prisma.translationTask.aggregate({
        where: { userId },
        _sum: { creditsUsed: true },
      }),
    ]);

    const tts = ttsSumResult._sum.creditsUsed ?? 0;
    const dialogue = dialogueSumResult._sum.creditsUsed ?? 0;
    const asr = asrSumResult._sum.creditsUsed ?? 0;
    const translation = translationSumResult._sum.creditsUsed ?? 0;

    const creditsByType = {
      tts,
      dialogue,
      asr,
      translation,
      image: 0,
      total: tts + dialogue + asr + translation,
    };

    return NextResponse.json({ user, generations, creditsByType });
  } catch (e) {
    console.error("[admin/users/generations]", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
