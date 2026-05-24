import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FISH_AUDIO_API_KEY not set" }, { status: 500 });

  const { id } = await params;

  const res = await fetch(`https://api.fish.audio/model/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ error: "Voice not found" }, { status: res.status });

  const data = await res.json();

  // Normalize cover_image to absolute URL
  const FISH_CDN = "https://files.fish.audio";
  if (typeof data.cover_image === "string" && data.cover_image && !data.cover_image.startsWith("http")) {
    data.cover_image = `${FISH_CDN}/${data.cover_image.replace(/^\//, "")}`;
  }

  return NextResponse.json(data);
}
