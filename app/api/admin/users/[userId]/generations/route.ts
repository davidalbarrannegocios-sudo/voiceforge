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

    const [generations, ttsCredits, transcriptionCredits, translationCredits, imageCredits] =
      await Promise.all([
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
        }),
        prisma.transcriptionTask.aggregate({
          where: { userId },
          _sum: { creditsUsed: true },
          _count: { id: true },
        }),
        prisma.translationTask.aggregate({
          where: { userId },
          _sum: { creditsUsed: true },
          _count: { id: true },
        }),
        prisma.sharedImage.aggregate({
          where: { userId },
          _sum: { creditsUsed: true },
          _count: { id: true },
        }),
      ]);

    const tts          = ttsCredits._sum.creditsUsed ?? 0;
    const transcription = transcriptionCredits._sum.creditsUsed ?? 0;
    const translation  = translationCredits._sum.creditsUsed ?? 0;
    const images       = imageCredits._sum.creditsUsed ?? 0;

    const creditsByType = {
      tts,
      ttsCount:            ttsCredits._count.id ?? 0,
      transcription,
      transcriptionCount:  transcriptionCredits._count.id ?? 0,
      translation,
      translationCount:    translationCredits._count.id ?? 0,
      images,
      imagesCount:         imageCredits._count.id ?? 0,
      total: tts + transcription + translation + images,
    };

    return NextResponse.json({ user, generations, creditsByType });
  } catch (e) {
    const isClerkError = typeof e === "object" && e !== null && (e as { clerkError?: boolean }).clerkError === true;
    if (isClerkError) {
      console.error("[admin/users/generations] Clerk API error:", JSON.stringify(e, null, 2));
      return NextResponse.json({ error: "Error de autenticación temporal" }, { status: 503 });
    }
    console.error("[admin/users/generations] Error:", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
