import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ServiceStatus = "good" | "overloaded";

async function probe(url: string, apiKey: string, init: RequestInit): Promise<ServiceStatus> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), "xi-api-key": apiKey },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok ? "good" : "overloaded";
  } catch {
    return "overloaded";
  }
}

export async function GET() {
  // Admin override takes priority over health probe
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  const adminStatus = config?.elitelabsTurboStatus ?? "active";

  if (adminStatus !== "active") {
    return NextResponse.json(
      { elevenlabs: "overloaded" as ServiceStatus, minimax: "good" as ServiceStatus, isDown: true, adminStatus },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" } }
    );
  }

  const apiKey = process.env.SK_AI33_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { elevenlabs: "overloaded" as ServiceStatus, minimax: "overloaded" as ServiceStatus, isDown: true, adminStatus },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" } }
    );
  }

  const [elevenlabs, minimax] = await Promise.all([
    probe("https://api.ai33.pro/v2/voices", apiKey, { method: "GET" }),
    probe("https://api.ai33.pro/v1m/voice/list", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: 1, page_size: 1, tag_list: [] }),
    }),
  ]);

  console.log(`[ai33-health] elevenlabs=${elevenlabs} minimax=${minimax} adminStatus=${adminStatus}`);

  const isDown = elevenlabs !== "good";
  return NextResponse.json(
    { elevenlabs, minimax, isDown, adminStatus },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=60" } }
  );
}
