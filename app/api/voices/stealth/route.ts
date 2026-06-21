import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface StealthVoice {
  voice_id: string;
  name: string;
  language?: string;
  description?: string;
  tags?: string[];
  is_cloned?: boolean;
}

interface StealthVoicesResponse {
  success: boolean;
  voices: StealthVoice[];
}

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.ALGROW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ALGROW_API_KEY no configurada" }, { status: 500 });

  try {
    const res = await fetch("https://api.algrow.online/api/voices/stealth", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Algrow stealth voices ${res.status}: ${await res.text()}`);
    const { voices } = await res.json() as StealthVoicesResponse;

    const items = (voices ?? []).map((v) => ({
      _id: v.voice_id,
      title: v.name,
      description: v.description ?? null,
      languages: [v.language ?? "en"],
      tags: v.tags ?? [],
      samples: [],
      task_count: 0,
      like_count: 0,
      cover_image: null,
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
