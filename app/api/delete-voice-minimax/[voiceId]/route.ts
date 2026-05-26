import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { voiceId } = await params;
  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const voice = await prisma.clonedVoice.findUnique({ where: { id: voiceId } });
  if (!voice || voice.userId !== user.id) {
    return NextResponse.json({ error: "Voz no encontrada" }, { status: 404 });
  }
  if (voice.provider !== "minimax" || !voice.minimaxVoiceId) {
    return NextResponse.json({ error: "Esta voz no es de Minimax" }, { status: 400 });
  }

  // Delete from ai33.pro
  const res = await fetch(`https://api.ai33.pro/v1m/voice/clone/${voice.minimaxVoiceId}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey },
  });

  // Treat 404 from upstream as ok (already deleted)
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.error(`[delete-voice-minimax] ai33.pro error ${res.status}: ${text}`);
  }

  await prisma.clonedVoice.delete({ where: { id: voiceId } });

  return NextResponse.json({ success: true });
}
