import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_LANGS = ["es", "en", "fr", "de", "pt"];

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { language } = body as { language?: string };

  if (!language || !VALID_LANGS.includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await prisma.user.update({
    where: { clerkId: user.id },
    data: { language },
  });

  return NextResponse.json({ ok: true });
}
