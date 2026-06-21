import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface AlgrowVoice {
  voice_id: string;
  name: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  description?: string;
  preview_url?: string;
  category?: string;
  use_case?: string;
}

interface AlgrowVoicesResponse {
  success: boolean;
  voices: AlgrowVoice[];
  has_more?: boolean;
}

function mapToFishVoice(v: AlgrowVoice) {
  const tags: string[] = [
    v.gender,
    v.age,
    v.accent ? `accent-${v.accent}` : undefined,
    v.use_case,
  ].filter((t): t is string => typeof t === "string" && t.length > 0);

  return {
    _id: v.voice_id,
    title: v.name ?? "",
    description: v.description ?? null,
    cover_image: null,
    languages: [v.language ?? "en"],
    tags,
    task_count: 0,
    like_count: 0,
    samples: v.preview_url ? [{ audio: v.preview_url }] : [],
  };
}

export async function GET(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.ALGROW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ALGROW_API_KEY no configurada" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const langFilter = (searchParams.get("language") ?? "").toLowerCase().trim();
  const genderFilter = (searchParams.get("gender") ?? "").toLowerCase().trim();
  const ageFilter = (searchParams.get("age") ?? "").toLowerCase().trim();
  const useCaseFilter = (searchParams.get("use_case") ?? "").toLowerCase().trim();
  const accentFilter = (searchParams.get("accent") ?? "").toLowerCase().trim();

  const searchWords = search.split(/\s+/).filter(Boolean);
  const serverSearch = searchWords[0] ?? "";
  const clientSearchWords = searchWords.slice(1).map((w) => w.toLowerCase());

  const baseParams = new URLSearchParams({ page_size: "100" });
  if (serverSearch) baseParams.set("search", serverSearch);
  if (langFilter && langFilter !== "all") baseParams.set("language", langFilter);
  if (genderFilter && genderFilter !== "all") baseParams.set("gender", genderFilter);
  if (ageFilter && ageFilter !== "all") baseParams.set("age", ageFilter);
  if (useCaseFilter && useCaseFilter !== "all") baseParams.set("use_case", useCaseFilter);
  if (accentFilter && accentFilter !== "all") baseParams.set("accent", accentFilter);

  let rawVoices: AlgrowVoice[] = [];
  let serverTotal = 0;
  try {
    let hasMore = true;
    let pageNum = 0;
    while (hasMore && pageNum < 5) {
      const params = new URLSearchParams(baseParams);
      params.set("page", String(pageNum));
      const url = `https://api.algrow.online/api/voices?${params}`;
      console.log("[ai33-voices-eleven] fetching Algrow voices page", pageNum, url);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Algrow voices ${res.status}: ${await res.text()}`);
      const parsed = await res.json() as AlgrowVoicesResponse;
      const pageVoices = parsed.voices ?? [];
      rawVoices = rawVoices.concat(pageVoices);
      serverTotal = rawVoices.length;
      hasMore = parsed.has_more === true && pageVoices.length > 0;
      pageNum++;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  console.log(`[ai33-voices-eleven] fetched=${rawVoices.length} serverTotal=${serverTotal} search="${search}" lang="${langFilter}" gender="${genderFilter}" age="${ageFilter}" use_case="${useCaseFilter}" accent="${accentFilter}"`);

  // Collect available accents before client-side filters
  const accents = [...new Set(
    rawVoices
      .map((v) => v.accent)
      .filter((a): a is string => typeof a === "string" && a.length > 0)
  )].sort();

  // Client-side filters
  let filtered = rawVoices;
  if (clientSearchWords.length > 0) {
    filtered = filtered.filter((v) => {
      const name = (v.name ?? "").toLowerCase();
      return clientSearchWords.every((w) => name.includes(w));
    });
  }
  if (useCaseFilter && useCaseFilter !== "all") {
    filtered = filtered.filter((v) => (v.use_case ?? "").toLowerCase() === useCaseFilter);
  }
  if (accentFilter && accentFilter !== "all") {
    filtered = filtered.filter((v) => (v.accent ?? "").toLowerCase() === accentFilter);
  }

  const allItems = filtered.map(mapToFishVoice);
  const total = allItems.length;

  console.log(`[ai33-voices-eleven] returning items=${total} accents=${accents.length} serverTotal=${serverTotal}`);
  return NextResponse.json({ items: allItems, total, accents, serverTotal });
}
