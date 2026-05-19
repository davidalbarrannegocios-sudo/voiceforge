import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") ?? "es";
  const pageSize = searchParams.get("page_size") ?? "5";

  const params = new URLSearchParams({
    page_size: pageSize,
    page_number: "1",
    sort_by: "task_count",
    language,
  });

  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ items: [] });

  const data = await res.json();
  return NextResponse.json(data);
}
