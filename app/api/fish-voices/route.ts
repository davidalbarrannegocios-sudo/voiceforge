import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ACCENT_TERMS: Record<string, string[]> = {
  mexico: ["mexican", "mexico", "méxico", "mexicano", "mexicana", "mx", "aztec", "guadalajara", "monterrey", "cdmx", "español mexicano"],
  spain: ["spain", "españa", "castellano", "castilian", "iberian", "peninsular", "spaniard", "español de españa"],
  latam: ["latin", "latam", "colombia", "argentina", "chile", "peru", "venezuela", "latino", "latina", "colombiano", "argentino", "chileno"],
};

const MANUAL_ACCENT_VOICES: Record<string, string[]> = {
  mexico: [],
  spain: [],
  latam: [],
};

type FishItem = {
  _id: string;
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
};

function normalizeCoverImage(item: FishItem): FishItem {
  const FISH_CDN = "https://files.fish.audio";
  return {
    ...item,
    cover_image:
      typeof item.cover_image === "string" && item.cover_image
        ? item.cover_image.startsWith("http")
          ? item.cover_image
          : `${FISH_CDN}/${item.cover_image.replace(/^\//, "")}`
        : null,
  };
}

export async function GET(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FISH_AUDIO_API_KEY not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") ?? "es";
  const search = searchParams.get("search") ?? "";
  const page = searchParams.get("page") ?? "1";
  const tag = searchParams.get("tag") ?? "";
  const accent = searchParams.get("accent") ?? "";

  // Accent filter: single request with large page_size, filter server-side
  // Fish Audio supports page_size up to 200+ and has_more is always null
  if (accent && accent !== "all") {
    const accentParams = new URLSearchParams({
      page_size: "200",
      sort_by: "task_count",
    });

    const accentRes = await fetch(`https://api.fish.audio/model?${accentParams}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const accentData = await accentRes.json();
    const allVoices: FishItem[] = accentData.items ?? [];

    console.log("Total voces acumuladas:", allVoices.length);

    const terms = ACCENT_TERMS[accent] ?? [];
    const filtered = allVoices.filter((v: FishItem) => {
      const searchText = [
        v.title ?? "",
        v.description ?? "",
        ...(v.tags ?? []),
      ].join(" ").toLowerCase();
      return terms.some((term) => searchText.includes(term));
    });

    console.log("Total después de filtrar:", filtered.length);

    const manualIds = MANUAL_ACCENT_VOICES[accent] ?? [];
    const manualVoices = filtered.filter((v: FishItem) => manualIds.includes(v._id));
    const restVoices = filtered.filter((v: FishItem) => !manualIds.includes(v._id));
    const items = [...manualVoices, ...restVoices].map(normalizeCoverImage);

    return Response.json({ items, total: items.length });
  }

  // Normal (non-accent) fetch
  const params = new URLSearchParams({
    page_size: "20",
    page_number: page,
    sort_by: "task_count",
    language,
  });
  if (search) params.set("title", search);
  if (tag) params.set("tag", tag);

  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Fish Audio error: ${text}` }, { status: res.status });
  }

  const data = await res.json();

  if (Array.isArray(data.items)) {
    data.items = data.items.map(normalizeCoverImage);
  }

  return NextResponse.json(data);
}
