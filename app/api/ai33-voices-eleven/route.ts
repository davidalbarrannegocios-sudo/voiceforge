import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ElevenVoice {
  voice_id?: string;
  id?: string;
  name?: string;
  description?: string;
  preview_url?: string;
  category?: string;
  labels?: {
    accent?: string;
    gender?: string;
    age?: string;
    use_case?: string;
    description?: string;
  };
}

function labelsToLanguages(labels: ElevenVoice["labels"]): string[] {
  const accent = (labels?.accent ?? "").toLowerCase();
  if (accent.includes("spanish") || accent.includes("espanol") || accent.includes("español")) return ["es"];
  if (accent.includes("french") || accent.includes("français")) return ["fr"];
  if (accent.includes("german") && !accent.includes("american")) return ["de"];
  if (accent.includes("italian") || accent.includes("italiano")) return ["it"];
  if (accent.includes("portuguese") || accent.includes("português")) return ["pt"];
  if (accent.includes("japanese") || accent.includes("日本語")) return ["ja"];
  if (accent.includes("chinese") || accent.includes("中文")) return ["zh"];
  if (accent.includes("korean") || accent.includes("한국어")) return ["ko"];
  if (accent.includes("arabic") || accent.includes("عربي")) return ["ar"];
  if (accent.includes("russian") || accent.includes("русский")) return ["ru"];
  return ["en"];
}

function mapToFishVoice(v: ElevenVoice) {
  const labels = v.labels ?? {};
  const tags: string[] = [
    labels.gender,
    labels.age,
    labels.use_case,
    labels.accent ? `accent-${labels.accent}` : undefined,
    labels.description,
  ].filter((t): t is string => typeof t === "string" && t.length > 0);

  return {
    _id: v.voice_id ?? v.id ?? "",
    title: v.name ?? "",
    description: v.description ?? labels.description ?? null,
    cover_image: null,
    languages: labelsToLanguages(labels),
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
  const search = (searchParams.get("search") ?? "").toLowerCase().trim();
  const langFilter = (searchParams.get("language") ?? "").toLowerCase().trim();
  const accentFilter = (searchParams.get("accent") ?? "").toLowerCase().trim();
  const PAGE_SIZE = 20;

  console.log("[ai33-voices-eleven] fetching voices from ai33.pro");
  const res = await fetch("https://api.ai33.pro/v2/voices", {
    headers: { "xi-api-key": apiKey },
  });

  const rawBody = await res.text();
  console.log(`[ai33-voices-eleven] status=${res.status} body=${rawBody.slice(0, 400)}`);

  if (!res.ok) {
    return NextResponse.json({ error: `ai33.pro error ${res.status}: ${rawBody}` }, { status: res.status });
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    console.error("[ai33-voices-eleven] response is not valid JSON");
    return NextResponse.json({ error: "ai33.pro devolvió respuesta no-JSON" }, { status: 500 });
  }
  const rawVoices: ElevenVoice[] = Array.isArray(data) ? data : ((data as { voices?: ElevenVoice[] }).voices ?? []);
  console.log(`[ai33-voices-eleven] rawVoices=${rawVoices.length} langFilter="${langFilter}" accentFilter="${accentFilter}" search="${search}" page=${page}`);
  console.log(`[ai33-voices-eleven] sample raw voice:`, JSON.stringify(rawVoices[0]).slice(0, 300));

  // Filter by language
  const langFiltered = langFilter && langFilter !== "all"
    ? rawVoices.filter((v) => labelsToLanguages(v.labels).includes(langFilter))
    : rawVoices;

  // Collect available accents from language-filtered set (before accent filter)
  const accents = [...new Set(
    langFiltered
      .map((v) => v.labels?.accent)
      .filter((a): a is string => typeof a === "string" && a.length > 0)
  )].sort();

  // Filter by accent
  const accentFiltered = accentFilter && accentFilter !== "all"
    ? langFiltered.filter((v) => (v.labels?.accent ?? "").toLowerCase() === accentFilter)
    : langFiltered;

  // Map to FishVoice format
  const allItems = accentFiltered.map(mapToFishVoice);

  // Search filter
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
  console.log(`[ai33-voices-eleven] returning items=${items.length} total=${total} accents=${accents.length}`);

  return NextResponse.json({ items, total, accents });
}
