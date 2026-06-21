import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getEffectivePlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth + plan gate
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Plan de pago requerido" }, { status: 403 });
  }
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json({ error: "Plan de pago requerido" }, { status: 403 });
  }
  const effectivePlan = await getEffectivePlan(user.id, user.plan);
  if (effectivePlan === "free") {
    return NextResponse.json({ error: "Plan de pago requerido" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const format   = searchParams.get("format") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit    = 24;
  const offset   = (page - 1) * limit;

  // Seed — use the provided value for consistent pagination, or generate one
  const seedParam = parseInt(searchParams.get("seed") ?? "");
  const seed = Number.isInteger(seedParam) && !isNaN(seedParam)
    ? seedParam
    : Math.floor(Math.random() * 2_147_483_647);
  const seedText = String(seed);

  // Range filters
  const isMonetizedParam = searchParams.get("isMonetized");
  const minSubs    = searchParams.get("minSubs");
  const maxSubs    = searchParams.get("maxSubs");
  const minRpm     = searchParams.get("minRpm");
  const maxRpm     = searchParams.get("maxRpm");
  const minRevenue = searchParams.get("minRevenue");
  const maxRevenue = searchParams.get("maxRevenue");
  const minVideos  = searchParams.get("minVideos");
  const maxVideos  = searchParams.get("maxVideos");

  // Build parameterized WHERE conditions (no raw string interpolation of user input)
  const conditions: Prisma.Sql[] = [];

  if (search) {
    const q = `%${search}%`;
    conditions.push(Prisma.sql`(
      title ILIKE ${q} OR
      description ILIKE ${q} OR
      "googleTrendsKeyword" ILIKE ${q} OR
      ${search.toLowerCase()} = ANY(tags)
    )`);
  }
  if (category) conditions.push(Prisma.sql`category ILIKE ${"%" + category + "%"}`);
  if (format)   conditions.push(Prisma.sql`format ILIKE ${"%" + format + "%"}`);

  if (isMonetizedParam === "true")  conditions.push(Prisma.sql`"isMonetized" = true`);
  if (isMonetizedParam === "false") conditions.push(Prisma.sql`"isMonetized" = false`);

  if (minSubs)    conditions.push(Prisma.sql`subscribers >= ${parseInt(minSubs)}`);
  if (maxSubs)    conditions.push(Prisma.sql`subscribers <= ${parseInt(maxSubs)}`);
  if (minRpm)     conditions.push(Prisma.sql`rpm >= ${parseFloat(minRpm)}`);
  if (maxRpm)     conditions.push(Prisma.sql`rpm <= ${parseFloat(maxRpm)}`);
  if (minRevenue) conditions.push(Prisma.sql`"monthlyRevenue" >= ${parseFloat(minRevenue)}`);
  if (maxRevenue) conditions.push(Prisma.sql`"monthlyRevenue" <= ${parseFloat(maxRevenue)}`);
  if (minVideos)  conditions.push(Prisma.sql`"totalVideos" >= ${parseInt(minVideos)}`);
  if (maxVideos)  conditions.push(Prisma.sql`"totalVideos" <= ${parseInt(maxVideos)}`);

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.sql``;

  // Run data + count in parallel using seeded deterministic random order
  type RawChannel = Record<string, unknown>;
  const [rows, countResult] = await Promise.all([
    prisma.$queryRaw<RawChannel[]>`
      SELECT * FROM "NicheChannel"
      ${whereClause}
      ORDER BY md5(id::text || ${seedText})
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM "NicheChannel"
      ${whereClause}
    `,
  ]);

  const total = Number(countResult[0].count);

  // Categories + formats (Prisma ORM is fine for these simple distinct queries)
  const [categoryRows, formatRows] = await Promise.all([
    prisma.nicheChannel.findMany({ select: { category: true }, distinct: ["category"], where: { category: { not: null } } }),
    prisma.nicheChannel.findMany({ select: { format: true },   distinct: ["format"],   where: { format:   { not: null } } }),
  ]);

  return NextResponse.json({
    channels: rows,
    total,
    pages: Math.ceil(total / limit),
    categories: categoryRows.map(c => c.category).filter(Boolean).sort(),
    formats:    formatRows.map(f => f.format).filter(Boolean).sort(),
    seed,
  });
}
