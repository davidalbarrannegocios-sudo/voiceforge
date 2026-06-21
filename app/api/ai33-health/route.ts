import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ServiceStatus = "good" | "overloaded";

async function probeAlgrow(apiKey: string): Promise<ServiceStatus> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.algrow.online/api/health", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return "overloaded";
    const data = await res.json() as { status?: string };
    return data.status === "healthy" ? "good" : "overloaded";
  } catch {
    return "overloaded";
  }
}

export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  const adminStatus = config?.elitelabsTurboStatus ?? "active";
  const manualOverride = config?.elitelabsTurboManualOverride ?? false;

  // Manual override: trust admin status, skip external probe
  if (manualOverride || adminStatus !== "active") {
    const isDown = adminStatus !== "active";
    const s: ServiceStatus = isDown ? "overloaded" : "good";
    return NextResponse.json(
      { elevenlabs: s, minimax: s, stealth: s, isDown, adminStatus, manualOverride },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" } }
    );
  }

  const apiKey = process.env.ALGROW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { elevenlabs: "overloaded" as ServiceStatus, minimax: "overloaded" as ServiceStatus, stealth: "overloaded" as ServiceStatus, isDown: true, adminStatus, manualOverride },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" } }
    );
  }

  const status = await probeAlgrow(apiKey);

  console.log(`[ai33-health] algrow=${status} adminStatus=${adminStatus} manualOverride=${manualOverride}`);

  const isDown = status !== "good";
  return NextResponse.json(
    { elevenlabs: status, minimax: status, stealth: status, isDown, adminStatus, manualOverride },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=60" } }
  );
}
