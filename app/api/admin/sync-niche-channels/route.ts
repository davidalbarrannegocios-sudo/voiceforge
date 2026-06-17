import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

interface NicheChannelInput {
  ytChannelId: string;
  title: string;
  description?: string | null;
  username?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  format?: string | null;
  outlierScore?: number | null;
  isFaceless?: boolean | null;
  isAiChannel?: boolean | null;
  isMonetized?: boolean | null;
  quality?: string | null;
  tags?: string[];
  location?: string | null;
  googleTrendsKeyword?: string | null;
  createdAt?: string | null;
  subscribers?: number | null;
  monthlyRevenue?: number | null;
  monthlyViews?: number | null;
  totalViews?: number | null;
  totalVideos?: number | null;
  avgViewsPerVideo?: number | null;
  avgVideoLength?: number | null;
  uploadsPerWeek?: number | null;
  rpm?: number | null;
  firstVideoDate?: string | null;
  lastVideoDate?: string | null;
}

const CHUNK_SIZE = 50;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: { channels: NicheChannelInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { channels } = body;
  if (!channels || !Array.isArray(channels)) {
    return NextResponse.json({ error: "channels array requerido" }, { status: 400 });
  }

  // Pre-fetch existing ytChannelIds to distinguish inserts from updates
  const ids = channels.map(c => c.ytChannelId).filter(Boolean);
  const existing = await prisma.nicheChannel.findMany({
    where: { ytChannelId: { in: ids } },
    select: { ytChannelId: true },
  });
  const existingSet = new Set(existing.map(e => e.ytChannelId));

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  const valid = channels.filter(ch => ch.ytChannelId && ch.title);

  for (const batch of chunk(valid, CHUNK_SIZE)) {
    await Promise.all(
      batch.map(async ch => {
        const isNew = !existingSet.has(ch.ytChannelId);
        const fields = {
          title: ch.title,
          description: ch.description ?? null,
          username: ch.username ?? null,
          thumbnail: ch.thumbnail ?? null,
          category: ch.category ?? null,
          format: ch.format ?? null,
          outlierScore: ch.outlierScore ?? null,
          isFaceless: ch.isFaceless ?? null,
          isAiChannel: ch.isAiChannel ?? null,
          isMonetized: ch.isMonetized ?? null,
          quality: ch.quality ?? null,
          tags: ch.tags ?? [],
          location: ch.location ?? null,
          googleTrendsKeyword: ch.googleTrendsKeyword ?? null,
          createdAt: ch.createdAt ?? null,
          subscribers: ch.subscribers ?? null,
          monthlyRevenue: ch.monthlyRevenue ?? null,
          monthlyViews: ch.monthlyViews ?? null,
          totalViews: ch.totalViews ?? null,
          totalVideos: ch.totalVideos ?? null,
          avgViewsPerVideo: ch.avgViewsPerVideo ?? null,
          avgVideoLength: ch.avgVideoLength ?? null,
          uploadsPerWeek: ch.uploadsPerWeek ?? null,
          rpm: ch.rpm ?? null,
          firstVideoDate: ch.firstVideoDate ?? null,
          lastVideoDate: ch.lastVideoDate ?? null,
        };
        try {
          await prisma.nicheChannel.upsert({
            where: { ytChannelId: ch.ytChannelId },
            update: fields,
            create: { ytChannelId: ch.ytChannelId, ...fields },
          });
          if (isNew) inserted++; else updated++;
        } catch (e) {
          errors.push(`${ch.ytChannelId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      })
    );
  }

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    total: inserted + updated,
    errors,
  });
}
