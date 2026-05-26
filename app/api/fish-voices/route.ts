import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ACCENT_TERMS: Record<string, string[]> = {
  mexico: ["mexican", "mexico", "méxico", "mexicano", "mexican accent", "español mexicano"],
  spain: ["spain", "españa", "castellano", "castilian", "iberian", "peninsular", "spaniard"],
  latam: ["latin", "latam", "colombia", "argentina", "chile", "peru", "venezuela", "latino"],
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

  const isAccentFilter = accent && accent !== "all" && ACCENT_TERMS[accent];

  let params: URLSearchParams;
  if (isAccentFilter) {
    // Fetch a broad pool without language/title constraints so server-side filtering has enough to work with
    params = new URLSearchParams({
      page_size: "80",
      sort_by: "task_count",
    });
    if (tag) params.set("tag", tag);
  } else {
    params = new URLSearchParams({
      page_size: "20",
      page_number: page,
      sort_by: "task_count",
      language,
    });
    if (search) params.set("title", search);
    if (tag) params.set("tag", tag);
  }

  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Fish Audio error: ${text}` }, { status: res.status });
  }

  const data = await res.json();

  // Normalize cover_image: Fish Audio may return relative paths — make them absolute
  const FISH_CDN = "https://files.fish.audio";
  if (Array.isArray(data.items)) {
    data.items = data.items.map((item: FishItem) => ({
      ...item,
      cover_image:
        typeof item.cover_image === "string" && item.cover_image
          ? item.cover_image.startsWith("http")
            ? item.cover_image
            : `${FISH_CDN}/${item.cover_image.replace(/^\//, "")}`
          : null,
    }));
  }

  // Server-side accent filtering: match title + description + tags
  if (isAccentFilter && Array.isArray(data.items)) {
    const terms = ACCENT_TERMS[accent];
    data.items = data.items.filter((v: FishItem) => {
      const searchText = [
        v.title ?? "",
        v.description ?? "",
        ...(v.tags ?? []),
      ].join(" ").toLowerCase();
      return terms.some((term) => searchText.includes(term));
    });

    // Promote manually curated voices to the top
    const manualIds = MANUAL_ACCENT_VOICES[accent] ?? [];
    if (manualIds.length > 0) {
      const manualVoices = data.items.filter((v: FishItem) => manualIds.includes(v._id));
      const restVoices = data.items.filter((v: FishItem) => !manualIds.includes(v._id));
      data.items = [...manualVoices, ...restVoices];
    }

    data.total = data.items.length;
  }

  return NextResponse.json(data);
}
