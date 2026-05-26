import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { voiceId?: unknown; voiceName?: unknown; languageTag?: unknown; genderTag?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { voiceId, voiceName, languageTag, genderTag } = body;
  if (!voiceId || !voiceName) {
    return NextResponse.json({ error: "voiceId y voiceName son requeridos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  await prisma.clonedVoice.create({
    data: {
      userId: user.id,
      name: String(voiceName),
      referenceAudioUrl: "",
      language: String(languageTag ?? "es"),
      gender: genderTag === "female" ? "feminine" : "masculine",
      isPublic: false,
      provider: "minimax",
      minimaxVoiceId: String(voiceId),
    },
  });

  console.log(`[save-cloned-voice] saved voiceId=${voiceId} user=${user.id}`);
  return NextResponse.json({ ok: true });
}
