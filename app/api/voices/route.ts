import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SYSTEM_VOICES = [
  { id: "default", name: "Voz estándar", language: "es", isSystem: true },
  { id: "narrator-en", name: "Narrador inglés", language: "en", isSystem: true },
];

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: {
      clonedVoices: { orderBy: { createdAt: "desc" } },
    },
  });

  const rawVoices = user?.clonedVoices ?? [];

  // Clip counts per voice (grouped by Fish Audio model ID)
  const modelIds = rawVoices.map((v) => v.referenceAudioUrl);
  const counts = modelIds.length
    ? await prisma.generation.groupBy({
        by: ["voiceId"],
        where: { userId: user!.id, voiceId: { in: modelIds } },
        _count: { voiceId: true },
      })
    : [];
  const countMap = Object.fromEntries(counts.map((c) => [c.voiceId, c._count.voiceId]));

  const clonedVoices = rawVoices.map((v) => ({
    id: v.id,
    name: v.name,
    language: v.language,
    gender: v.gender,
    isSystem: false,
    isPublic: v.isPublic,
    fishAudioModelId: v.referenceAudioUrl,
    createdAt: v.createdAt,
    clipCount: countMap[v.referenceAudioUrl] ?? 0,
  }));

  return NextResponse.json([...SYSTEM_VOICES, ...clonedVoices]);
}
