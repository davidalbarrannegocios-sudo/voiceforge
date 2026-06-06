import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface SharedVoice {
  voice_id: string;
  name?: string;
  language?: string;
  accent?: string;
  gender?: string;
  age?: string;
  descriptive?: string;
  use_case?: string;
  category?: string;
  description?: string;
  preview_url?: string;
  image_url?: string;
}

function mapToFishVoice(v: SharedVoice) {
  const tags: string[] = [
    v.gender,
    v.age,
    v.use_case,
    v.accent ? `accent-${v.accent}` : undefined,
    v.descriptive,
  ].filter((t): t is string => typeof t === "string" && t.length > 0);

  return {
    _id: v.voice_id,
    title: v.name ?? "",
    description: v.description ?? v.descriptive ?? null,
    cover_image: v.image_url ?? null,
    languages: v.language ? [v.language.split("-")[0].toLowerCase()] : ["en"],
    tags,
    task_count: 0,
    like_count: 0,
    samples: v.preview_url ? [{ audio: v.preview_url }] : [],
  };
}

export async function GET(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search = (searchParams.get("search") ?? "").trim();
  const langFilter = (searchParams.get("language") ?? "").toLowerCase().trim();
  const genderFilter = (searchParams.get("gender") ?? "").toLowerCase().trim();
  const ageFilter = (searchParams.get("age") ?? "").toLowerCase().trim();
  const useCaseFilter = (searchParams.get("use_case") ?? "").toLowerCase().trim();
  const accentFilter = (searchParams.get("accent") ?? "").toLowerCase().trim();
  // Build server-side filter params for ai33.pro
  // age and gender work server-side; use_case does not (always returns full set)
  const params = new URLSearchParams({ page_size: "100", page: String(page) });
  if (langFilter && langFilter !== "all") params.set("language", langFilter);
  if (genderFilter && genderFilter !== "all") params.set("gender", genderFilter);
  if (ageFilter && ageFilter !== "all") params.set("age", ageFilter);
  if (search) params.set("search", search);

  const url = `https://api.ai33.pro/v1/shared-voices?${params}`;
  console.log("[ai33-voices-eleven] fetching:", url);

  const res = await fetch(url, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) {
    const errBody = await res.text();
    return NextResponse.json({ error: `ai33.pro error ${res.status}: ${errBody}` }, { status: res.status });
  }

  let parsed: { voices?: SharedVoice[]; total_count?: number } | SharedVoice[];
  try { parsed = await res.json() as typeof parsed; } catch {
    return NextResponse.json({ error: "ai33.pro devolvió respuesta no-JSON" }, { status: 500 });
  }

  const rawVoices: SharedVoice[] = Array.isArray(parsed) ? parsed : (parsed.voices ?? []);
  const serverTotal: number = Array.isArray(parsed) ? rawVoices.length : (parsed.total_count ?? rawVoices.length);
  console.log(`[ai33-voices-eleven] fetched=${rawVoices.length} serverTotal=${serverTotal} lang="${langFilter}" gender="${genderFilter}" age="${ageFilter}" use_case="${useCaseFilter}" accent="${accentFilter}"`);

  // Collect available accents before any client-side filters
  const accents = [...new Set(
    rawVoices
      .map((v) => v.accent)
      .filter((a): a is string => typeof a === "string" && a.length > 0)
  )].sort();

  // Client-side filters (not supported server-side)
  let filtered = rawVoices;
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
