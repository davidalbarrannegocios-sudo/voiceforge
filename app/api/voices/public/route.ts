import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";

  console.log("[voices/public] search param:", JSON.stringify(search));

  const voices = await prisma.clonedVoice.findMany({
    where: search
      ? {
          isPublic: true,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { referenceAudioUrl: { contains: search, mode: "insensitive" } },
          ],
        }
      : { isPublic: true },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  console.log("[voices/public] results:", voices.length);

  return NextResponse.json(
    voices.map((v) => ({
      id: v.id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      fishAudioModelId: v.referenceAudioUrl,
      creatorName: v.user.email.split("@")[0],
    }))
  );
}
