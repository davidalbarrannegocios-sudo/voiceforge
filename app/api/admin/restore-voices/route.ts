import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const FISH_AUDIO_BASE = "https://api.fish.audio";

async function fetchFishAudioModels() {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) throw new Error("FISH_AUDIO_API_KEY not configured");
  const res = await fetch(`${FISH_AUDIO_BASE}/model?self=true&page_size=100`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Fish Audio API ${res.status}`);
  const data = await res.json();
  return (data.items ?? []) as {
    _id: string;
    title: string;
    created_at: string;
    visibility: string;
    state: string;
  }[];
}

// GET — list Fish Audio models + existing assignments
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const [fishModels, existing, users] = await Promise.all([
      fetchFishAudioModels(),
      prisma.clonedVoice.findMany({
        where: { provider: "fish_audio" },
        select: { id: true, referenceAudioUrl: true, userId: true, name: true, gender: true, language: true },
      }),
      prisma.user.findMany({
        orderBy: { email: "asc" },
        select: { id: true, email: true },
      }),
    ]);

    // Index existing assignments by Fish Audio model ID
    const assigned: Record<string, { clonedVoiceId: string; userId: string; name: string; gender: string; language: string }> = {};
    for (const v of existing) {
      assigned[v.referenceAudioUrl] = {
        clonedVoiceId: v.id,
        userId: v.userId,
        name: v.name,
        gender: v.gender,
        language: v.language,
      };
    }

    return NextResponse.json({ fishModels, assigned, users });
  } catch (e) {
    console.error("[admin/restore-voices GET]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — assign a Fish Audio model to a user
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { modelId, userId, voiceName, gender = "masculine", language = "es" } = await req.json();

    if (!modelId || !userId || !voiceName) {
      return NextResponse.json({ error: "modelId, userId y voiceName son obligatorios" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Upsert: if already assigned to this model, update it; otherwise create
    const existing = await prisma.clonedVoice.findFirst({
      where: { referenceAudioUrl: modelId },
    });

    let voice;
    if (existing) {
      voice = await prisma.clonedVoice.update({
        where: { id: existing.id },
        data: { userId, name: voiceName, gender, language },
      });
    } else {
      voice = await prisma.clonedVoice.create({
        data: {
          userId,
          name: voiceName,
          referenceAudioUrl: modelId,
          provider: "fish_audio",
          gender,
          language,
          isPublic: false,
        },
      });
    }

    return NextResponse.json({ ok: true, voice });
  } catch (e) {
    console.error("[admin/restore-voices POST]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — remove assignment
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { modelId } = await req.json();
    if (!modelId) return NextResponse.json({ error: "modelId requerido" }, { status: 400 });

    const existing = await prisma.clonedVoice.findFirst({ where: { referenceAudioUrl: modelId } });
    if (!existing) return NextResponse.json({ error: "No asignado" }, { status: 404 });

    await prisma.clonedVoice.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/restore-voices DELETE]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
