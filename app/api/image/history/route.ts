import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const images = await prisma.sharedImage.findMany({
    where: { userId: dbUser.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      imageUrl: true,
      prompt: true,
      model: true,
      aspectRatio: true,
      type: true,
      createdAt: true,
      expiresAt: true,
      creditsUsed: true,
    },
  });

  return NextResponse.json({ images });
}
