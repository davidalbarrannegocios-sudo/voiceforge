import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FishItem = Record<string, unknown> & { cover_image?: string | null };

function normalizeCoverImage(item: FishItem): FishItem {
  const FISH_CDN = "https://files.fish.audio";
  const cover = item.cover_image;
  return {
    ...item,
    cover_image:
      typeof cover === "string" && cover
        ? cover.startsWith("http")
          ? cover
          : `${FISH_CDN}/${cover.replace(/^\//, "")}`
        : null,
  };
}

export async function GET(req: Request) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") ?? "es";
  const pageSize = searchParams.get("page_size") ?? "5";
  const page = searchParams.get("page") ?? "1";
  const search = searchParams.get("search") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const params = new URLSearchParams({
    page_size: pageSize,
    page_number: page,
    sort_by: "task_count",
  });
  if (language !== "all") params.set("language", language);
  if (search) params.set("title", search);
  if (tag) params.set("tag", tag);

  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) return NextResponse.json({ items: [] });

  const data = await res.json();
  if (Array.isArray(data.items)) {
    data.items = (data.items as FishItem[]).map(normalizeCoverImage);
  }

  return NextResponse.json(data);
}
