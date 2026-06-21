import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteImageFromHetzner } from "@/lib/hetzner-images";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await prisma.sharedImage.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true, storageKey: true },
  });

  let deleted = 0;
  for (const img of expired) {
    await deleteImageFromHetzner(img.storageKey);
    await prisma.sharedImage.delete({ where: { id: img.id } });
    deleted++;
  }

  return NextResponse.json({ deleted, total: expired.length });
}
