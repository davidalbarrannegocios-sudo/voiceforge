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
  return NextResponse.json(data);
}
