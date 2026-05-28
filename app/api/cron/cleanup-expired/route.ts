import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromR2, keyFromPublicUrl } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch expired generations that still have an audio file
  const expiredGenerations = await prisma.generation.findMany({
    where: { expiresAt: { lt: now }, audioUrl: { not: null } },
    select: { id: true, audioUrl: true },
  });

  // Fetch expired jobs that still have an audio file
  const expiredJobs = await prisma.job.findMany({
    where: { expiresAt: { lt: now }, audioUrl: { not: null }, status: { not: "expired" } },
    select: { id: true, audioUrl: true },
  });

  // Fetch expired translation tasks
  const expiredTranslations = await prisma.translationTask.findMany({
    where: { expiresAt: { lt: now }, audioUrl: { not: null }, status: { not: "expired" } },
    select: { id: true, audioUrl: true, r2Key: true },
  });

  let deleted = 0;
  let errors = 0;

  // Collect unique R2 keys/URLs to delete (Generation and Job share the same file)
  const uniqueUrls = new Set<string>();
  for (const g of expiredGenerations) if (g.audioUrl) uniqueUrls.add(g.audioUrl);
  for (const j of expiredJobs) if (j.audioUrl) uniqueUrls.add(j.audioUrl);

  for (const url of uniqueUrls) {
    try {
      await deleteFromR2(keyFromPublicUrl(url));
      deleted++;
    } catch (err) {
      console.error(`[cleanup] failed to delete ${url}:`, err);
      errors++;
    }
  }

  // Delete translation audio files (prefer r2Key, fall back to URL)
  for (const t of expiredTranslations) {
    const key = t.r2Key ?? (t.audioUrl ? keyFromPublicUrl(t.audioUrl) : null);
    if (!key) continue;
    try {
      await deleteFromR2(key);
      deleted++;
    } catch (err) {
      console.error(`[cleanup] failed to delete translation ${key}:`, err);
      errors++;
    }
  }

  // Null out audioUrl on expired generations
  if (expiredGenerations.length > 0) {
    await prisma.generation.updateMany({
      where: { id: { in: expiredGenerations.map((g) => g.id) } },
      data: { audioUrl: null },
    });
  }

  // Null out audioUrl and mark expired on jobs
  if (expiredJobs.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: expiredJobs.map((j) => j.id) } },
      data: { audioUrl: null, status: "expired" },
    });
  }

  // Null out audioUrl and mark expired on translation tasks
  if (expiredTranslations.length > 0) {
    await prisma.translationTask.updateMany({
      where: { id: { in: expiredTranslations.map((t) => t.id) } },
      data: { audioUrl: null, status: "expired" },
    });
  }

  console.log(`[cleanup] deleted=${deleted} errors=${errors} generations=${expiredGenerations.length} jobs=${expiredJobs.length} translations=${expiredTranslations.length}`);

  return NextResponse.json({
    ok: true,
    deleted,
    errors,
    generations: expiredGenerations.length,
    jobs: expiredJobs.length,
    translations: expiredTranslations.length,
  });
}
