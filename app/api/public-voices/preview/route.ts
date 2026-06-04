import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ url: null });

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ url: null });

  try {
    const res = await fetch(`https://api.fish.audio/model/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ url: null });

    const data = await res.json();
    // Fish Audio returns samples as an array with an `audio` field containing the preview URL
    const url: string | null =
      data.samples?.[0]?.audio ??
      data.preview_audio ??
      null;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
