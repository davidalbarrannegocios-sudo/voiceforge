import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/prisma";

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

  await prisma.userSession.create({
    data: {
      userId: user.id,
      ip,
      userAgent: uaString || null,
      browser,
      os,
      device: deviceType,
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
