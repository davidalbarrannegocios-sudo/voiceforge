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

  const clonedVoices = (user?.clonedVoices ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    language: "es",
    isSystem: false,
    createdAt: v.createdAt,
  }));

  return NextResponse.json([...SYSTEM_VOICES, ...clonedVoices]);
}
