import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface MinimaxVoice {
  voice_id?: string;
  id?: string;
  name?: string;
  description?: string;
  audio_url?: string;
  sample_url?: string;
  preview_url?: string;
  gender?: string;
  language?: string;
  tags?: string[];
}

function mapToFishVoice(v: MinimaxVoice) {
  const tags: string[] = [
    v.gender,
    ...(v.tags ?? []),
  ].filter((t): t is string => typeof t === "string" && t.length > 0);

  const sampleUrl = v.audio_url ?? v.sample_url ?? v.preview_url ?? null;

  return {
    _id: v.voice_id ?? v.id ?? "",
    title: v.name ?? "",
    description: v.description ?? null,
    cover_image: null,
    languages: v.language ? [v.language] : ["zh"],
    tags,
    task_count: 0,
    like_count: 0,
    samples: sampleUrl ? [{ audio: sampleUrl }] : [],
  };
}

export async function GET(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) {
    console.error("[ai33-voices-minimax] SK_AI33_KEY not configured");
    return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search = (searchParams.get("search") ?? "").toLowerCase().trim();
  const PAGE_SIZE = 20;

  // Load user's cloned Minimax voices from DB
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  const clonedVoices = user
    ? await prisma.clonedVoice.findMany({
        where: { userId: user.id, provider: "minimax" },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const clonedItems = clonedVoices.map((v) => ({
    _id: v.minimaxVoiceId ?? v.id,
    title: v.name,
    description: "Mi voz clonada",
    cover_image: null,
    languages: [v.language],
    tags: ["clonada", v.gender === "feminine" ? "female" : "male"],
    task_count: 0,
    like_count: 0,
    samples: [] as { audio: string }[],
  }));

  // Fetch public Minimax voices from ai33.pro
  let publicItems: ReturnType<typeof mapToFishVoice>[] = [];
  try {
    console.log("[ai33-voices-minimax] fetching public voice list from ai33.pro");
    const res = await fetch("https://api.ai33.pro/v1m/voice/list", {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ page: 1, page_size: 200, tag_list: [] }),
    });
    const rawBody = await res.text();
    console.log(`[ai33-voices-minimax] voice/list status=${res.status} body=${rawBody.slice(0, 600)}`);

    if (res.ok) {
      let data: unknown;
      try {
        data = JSON.parse(rawBody);
      } catch {
        console.error("[ai33-voices-minimax] voice/list response is not valid JSON");
        data = {};
      }
      const rawVoices: MinimaxVoice[] =
        (data as { voices?: MinimaxVoice[] }).voices ??
        (data as { items?: MinimaxVoice[] }).items ??
        (data as { list?: MinimaxVoice[] }).list ??
        (Array.isArray(data) ? (data as MinimaxVoice[]) : []);
      console.log(`[ai33-voices-minimax] parsed ${rawVoices.length} public voices`);
      publicItems = rawVoices.map(mapToFishVoice);
    } else {
      console.error(`[ai33-voices-minimax] voice/list non-ok status=${res.status}`);
    }
  } catch (err) {
    console.error("[ai33-voices-minimax] voice/list fetch error:", err);
    // Return cloned voices only if public fetch fails
  }

  const allItems = [...clonedItems, ...publicItems];

  const filtered = search
    ? allItems.filter(
        (v) =>
          v.title.toLowerCase().includes(search) ||
          (v.description ?? "").toLowerCase().includes(search) ||
          v.tags.some((t) => t.toLowerCase().includes(search))
      )
    : allItems;

  const total = filtered.length;
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({ items, total });
}
