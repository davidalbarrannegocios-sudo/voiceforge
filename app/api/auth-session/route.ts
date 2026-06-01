import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/prisma";

async function getGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("::")) {
    return { country: null, city: null };
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { country: null, city: null };
    const data = await res.json();
    return {
      country: typeof data.country_name === "string" ? data.country_name : null,
      city: typeof data.city === "string" ? data.city : null,
    };
  } catch {
    return { country: null, city: null };
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const uaString = req.headers.get("user-agent") || "";
  const parser = new UAParser(uaString);
  const browser = parser.getBrowser().name || null;
  const os = parser.getOS().name || null;
  const deviceType = parser.getDevice().type || "desktop";

  const { country, city } = ip ? await getGeo(ip) : { country: null, city: null };

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
