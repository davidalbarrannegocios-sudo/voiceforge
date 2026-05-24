import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FISH_AUDIO_BASE = "https://api.fish.audio";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { voiceId } = await params;
    const { isPublic } = (await req.json()) as { isPublic: boolean };

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const voice = await prisma.clonedVoice.findUnique({
      where: { id: voiceId },
      select: { userId: true, referenceAudioUrl: true },
    });
    if (!voice) return NextResponse.json({ error: "Voz no encontrada" }, { status: 404 });
    if (voice.userId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const updated = await prisma.clonedVoice.update({
      where: { id: voiceId },
      data: { isPublic },
      select: { id: true, isPublic: true },
    });

    // Sync visibility to Fish Audio
    let fishAudioSynced = false;
    const apiKey = process.env.FISH_AUDIO_API_KEY;
    if (apiKey && voice.referenceAudioUrl) {
      try {
        const res = await fetch(`${FISH_AUDIO_BASE}/model/${voice.referenceAudioUrl}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ visibility: isPublic ? "public" : "private" }),
        });
        fishAudioSynced = res.ok;
        if (!res.ok) {
          const errText = await res.text();
          console.error("[visibility] Fish Audio sync failed:", res.status, errText);
        }
      } catch (e) {
        console.error("[visibility] Fish Audio sync error:", e);
      }
    }

    return NextResponse.json({ success: true, isPublic: updated.isPublic, fishAudioSynced });
  } catch (e) {
    console.error("[visibility]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
