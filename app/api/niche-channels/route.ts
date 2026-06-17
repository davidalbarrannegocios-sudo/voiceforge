import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
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
  const search      = searchParams.get("search") ?? "";
  const category    = searchParams.get("category") ?? "";
  const format      = searchParams.get("format") ?? "";
  const sortBy      = searchParams.get("sortBy") ?? "outlierScore";
  const sortOrder   = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit       = 24;

  // Range filters
  const isMonetizedParam = searchParams.get("isMonetized");
  const minSubs     = searchParams.get("minSubs");
  const maxSubs     = searchParams.get("maxSubs");
  const minRpm      = searchParams.get("minRpm");
  const maxRpm      = searchParams.get("maxRpm");
  const minRevenue  = searchParams.get("minRevenue");
  const maxRevenue  = searchParams.get("maxRevenue");
  const minVideos   = searchParams.get("minVideos");
  const maxVideos   = searchParams.get("maxVideos");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (search) {
    where.OR = [
      { title:               { contains: search, mode: "insensitive" } },
      { description:         { contains: search, mode: "insensitive" } },
      { googleTrendsKeyword: { contains: search, mode: "insensitive" } },
      { tags:                { has: search.toLowerCase() } },
    ];
  }
  if (category)    where.category = { contains: category, mode: "insensitive" };
  if (format)      where.format   = { contains: format,   mode: "insensitive" };

  if (isMonetizedParam !== null) {
    where.isMonetized = isMonetizedParam === "true";
  }

  if (minSubs || maxSubs) {
    where.subscribers = {};
    if (minSubs) where.subscribers.gte = parseInt(minSubs);
    if (maxSubs) where.subscribers.lte = parseInt(maxSubs);
  }
  if (minRpm || maxRpm) {
    where.rpm = {};
    if (minRpm) where.rpm.gte = parseFloat(minRpm);
    if (maxRpm) where.rpm.lte = parseFloat(maxRpm);
  }
  if (minRevenue || maxRevenue) {
    where.monthlyRevenue = {};
    if (minRevenue) where.monthlyRevenue.gte = parseFloat(minRevenue);
    if (maxRevenue) where.monthlyRevenue.lte = parseFloat(maxRevenue);
  }
  if (minVideos || maxVideos) {
    where.totalVideos = {};
    if (minVideos) where.totalVideos.gte = parseInt(minVideos);
    if (maxVideos) where.totalVideos.lte = parseInt(maxVideos);
  }

  const VALID_SORTS = ["outlierScore", "monthlyRevenue", "subscribers", "monthlyViews", "rpm", "totalVideos"] as const;
  const field = (VALID_SORTS as readonly string[]).includes(sortBy) ? sortBy : "outlierScore";
  const orderBy = { [field]: sortOrder };

  const [channels, total] = await Promise.all([
    prisma.nicheChannel.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.nicheChannel.count({ where }),
  ]);

  const [categoryRows, formatRows] = await Promise.all([
    prisma.nicheChannel.findMany({ select: { category: true }, distinct: ["category"], where: { category: { not: null } } }),
    prisma.nicheChannel.findMany({ select: { format: true },   distinct: ["format"],   where: { format:   { not: null } } }),
  ]);

  return NextResponse.json({
    channels,
    total,
    pages: Math.ceil(total / limit),
    categories: categoryRows.map(c => c.category).filter(Boolean).sort(),
    formats:    formatRows.map(f => f.format).filter(Boolean).sort(),
  });
}
