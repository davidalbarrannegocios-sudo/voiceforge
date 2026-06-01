import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/prisma";

async function getGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  // Skip private/loopback IPs
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("fc00:") ||
    ip.startsWith("fe80:")
  ) {
    console.log("[auth-session/geo] Local IP, skipping geo:", ip);
    return { country: "Local", city: "Development" };
  }

  // Provider 1: ip-api.com (free, no key, 45 req/min, HTTP only)
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    console.log("[auth-session/geo] ip-api.com response for", ip, ":", JSON.stringify(data));
    if (data.status === "success" && data.country) {
      return { country: data.country, city: data.city ?? null };
    }
  } catch (err) {
    console.warn("[auth-session/geo] ip-api.com failed:", err);
  }

  // Provider 2: ipapi.co fallback
  try {
    const res = await fetch(
      `https://ipapi.co/${ip}/json/`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    console.log("[auth-session/geo] ipapi.co response for", ip, ":", JSON.stringify(data));
    if (data.country_name) {
      return { country: data.country_name, city: data.city ?? null };
    }
  } catch (err) {
    console.warn("[auth-session/geo] ipapi.co failed:", err);
  }

  console.warn("[auth-session/geo] All geo providers failed for IP:", ip);
  return { country: null, city: null };
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip") ?? "0.0.0.0");

  console.log("[auth-session] IP headers — x-forwarded-for:", req.headers.get("x-forwarded-for"), "| x-real-ip:", req.headers.get("x-real-ip"), "| resolved:", ip);

  const uaString = req.headers.get("user-agent") || "";
  const parser = new UAParser(uaString);
  const browser = parser.getBrowser().name || null;
  const os = parser.getOS().name || null;
  const deviceType = parser.getDevice().type || "desktop";

  const { country, city } = await getGeo(ip);

  console.log("[auth-session] Saving session — userId:", user.id, "| ip:", ip, "| country:", country, "| city:", city);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      ip,
      userAgent: uaString || null,
      browser,
      os,
      device: deviceType,
      country,
      city,
    },
  });

  // Keep only last 100 sessions per user
  const sessions = await prisma.userSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (sessions.length > 100) {
    const toDelete = sessions.slice(100).map((s) => s.id);
    await prisma.userSession.deleteMany({ where: { id: { in: toDelete } } });
  }

  return NextResponse.json({ ok: true });
}
