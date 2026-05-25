import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { truncateText } from "@/lib/utils";

export async function GET(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!user) {
    return NextResponse.json({ generations: [], total: 0 });
  }

  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        text: true,
        audioUrl: true,
        creditsUsed: true,
        durationSeconds: true,
        voiceId: true,
        createdAt: true,
        expiresAt: true,
      },
    }),
    prisma.generation.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    generations: generations.map((g) => ({
      ...g,
      text: truncateText(g.text, 100),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
