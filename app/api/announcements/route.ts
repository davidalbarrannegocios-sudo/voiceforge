import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ announcement: null });

  const user = await prisma.user.findFirst({ where: { clerkId: clerkUser.id }, select: { id: true } });
  if (!user) return NextResponse.json({ announcement: null });

  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (!announcements.length) return NextResponse.json({ announcement: null });

  const latest = announcements[0];
  const seen = await prisma.announcementSeen.findUnique({
    where: { userId_announcementId: { userId: user.id, announcementId: latest.id } },
  });

  if (seen) return NextResponse.json({ announcement: null });
  return NextResponse.json({ announcement: latest });
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findFirst({ where: { clerkId: clerkUser.id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { announcementId } = await req.json();
  await prisma.announcementSeen.upsert({
    where: { userId_announcementId: { userId: user.id, announcementId } },
    create: { userId: user.id, announcementId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
