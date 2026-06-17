import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!adminUser || adminUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { channels } = await req.json();
  if (!channels || !Array.isArray(channels)) {
    return NextResponse.json({ error: "channels array required" }, { status: 400 });
  }

  let upserted = 0;
  for (const ch of channels) {
    if (!ch.id || !ch.title) continue;
    await prisma.nicheChannel.upsert({
      where: { ytChannelId: ch.id },
      update: {
        title: ch.title,
        description: ch.description,
        username: ch.username,
        thumbnail: ch.thumbnail,
        category: ch.category,
        format: ch.format,
        outlierScore: ch.outlierScore,
        isFaceless: ch.isFaceless,
        isAiChannel: ch.isAiChannel,
        isMonetized: ch.isMonetized,
        quality: ch.quality,
        tags: ch.tags ?? [],
        location: ch.location,
        googleTrendsKeyword: ch.googleTrendsKeyword,
        createdAt: ch.createdAt,
        subscribers: ch.subscribers,
        monthlyRevenue: ch.monthlyRevenue,
        monthlyViews: ch.monthlyViews,
        totalViews: ch.totalViews,
        totalVideos: ch.totalVideos,
        avgViewsPerVideo: ch.avgViewsPerVideo,
        avgVideoLength: ch.avgVideoLength,
        uploadsPerWeek: ch.uploadsPerWeek,
        rpm: ch.rpm,
        firstVideoDate: ch.firstVideoDate,
        lastVideoDate: ch.lastVideoDate,
      },
      create: {
        ytChannelId: ch.id,
        title: ch.title,
        description: ch.description,
        username: ch.username,
        thumbnail: ch.thumbnail,
        category: ch.category,
        format: ch.format,
        outlierScore: ch.outlierScore,
        isFaceless: ch.isFaceless,
        isAiChannel: ch.isAiChannel,
        isMonetized: ch.isMonetized,
        quality: ch.quality,
        tags: ch.tags ?? [],
        location: ch.location,
        googleTrendsKeyword: ch.googleTrendsKeyword,
        createdAt: ch.createdAt,
        subscribers: ch.subscribers,
        monthlyRevenue: ch.monthlyRevenue,
        monthlyViews: ch.monthlyViews,
        totalViews: ch.totalViews,
        totalVideos: ch.totalVideos,
        avgViewsPerVideo: ch.avgViewsPerVideo,
        avgVideoLength: ch.avgVideoLength,
        uploadsPerWeek: ch.uploadsPerWeek,
        rpm: ch.rpm,
        firstVideoDate: ch.firstVideoDate,
        lastVideoDate: ch.lastVideoDate,
      },
    });
    upserted++;
  }

  return NextResponse.json({ success: true, upserted });
}
