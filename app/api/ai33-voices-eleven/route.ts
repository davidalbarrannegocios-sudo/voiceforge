import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) return NextResponse.json({ error: "SK_AI33_KEY no configurada" }, { status: 500 });

  const res = await fetch("https://api.ai33.pro/v2/voices", {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `ai33.pro error ${res.status}: ${text}` }, { status: res.status });
  }

  const data = await res.json();
  const rawVoices: Record<string, unknown>[] = Array.isArray(data) ? data : (data.voices ?? []);
  const voices = rawVoices.map((v) => ({
    id: (v.voice_id ?? v.id ?? "") as string,
    name: (v.name ?? "") as string,
    sampleUrl: (v.preview_url ?? v.sample_url ?? null) as string | null,
  }));

  return NextResponse.json({ voices });
}
