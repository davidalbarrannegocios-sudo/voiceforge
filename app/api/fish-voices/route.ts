import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  // Normalize cover_image: Fish Audio may return relative paths — make them absolute
  const FISH_CDN = "https://files.fish.audio";
  if (Array.isArray(data.items)) {
    data.items = data.items.map((item: Record<string, unknown>) => ({
      ...item,
      cover_image:
        typeof item.cover_image === "string" && item.cover_image
          ? item.cover_image.startsWith("http")
            ? item.cover_image
            : `${FISH_CDN}/${item.cover_image.replace(/^\//, "")}`
          : null,
    }));
  }

  return NextResponse.json(data);
}
