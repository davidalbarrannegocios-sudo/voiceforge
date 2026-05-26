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
  has_more?: boolean;
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

  const isAccentFilter = !!(accent && accent !== "all" && ACCENT_TERMS[accent]);
  const headers = { Authorization: `Bearer ${apiKey}` };

  if (isAccentFilter) {
    const terms = ACCENT_TERMS[accent];

    // Fetch up to 5 pages (100 voices) without language/title constraints for a broad pool
    const allVoices: FishItem[] = [];
    for (let p = 1; p <= 5; p++) {
      const params = new URLSearchParams({
        page_size: "20",
        page_number: String(p),
        sort_by: "task_count",
      });
      if (tag) params.set("tag", tag);

      const res = await fetch(`https://api.fish.audio/model?${params}`, {
        headers,
        next: { revalidate: 300 },
      });
      if (!res.ok) break;

      const data = await res.json();
      const items: FishItem[] = (data.items ?? []).map(normalizeCoverImage);
      allVoices.push(...items);
      if (!data.has_more) break;
    }

    console.log("Total voces antes de filtrar:", allVoices.length);
    console.log("Terms usados:", terms);
    console.log("Ejemplo descripción voz 0:", allVoices[0]?.description);
    console.log("Ejemplo tags voz 0:", allVoices[0]?.tags);

    // Filter server-side: match title + description + tags
    const filtered = allVoices.filter((v) => {
      const searchText = [
        v.title ?? "",
        v.description ?? "",
        ...(v.tags ?? []),
      ].join(" ").toLowerCase();
      return terms.some((term) => searchText.includes(term));
    });

    console.log("Total después de filtrar:", filtered.length);

    // Promote manually curated voices to the top
    const manualIds = MANUAL_ACCENT_VOICES[accent] ?? [];
    let items = filtered;
    if (manualIds.length > 0) {
      const manual = filtered.filter((v) => manualIds.includes(v._id));
      const rest = filtered.filter((v) => !manualIds.includes(v._id));
      items = [...manual, ...rest];
    }

    return NextResponse.json({ items, total: items.length });
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
    headers,
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
