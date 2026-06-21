import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { clerkId: clerkUser.id } });
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const res = await fetch("https://api.fish.audio/wallet/self/api-credit", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
