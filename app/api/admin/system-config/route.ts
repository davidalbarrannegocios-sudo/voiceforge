import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = ["active", "maintenance", "disabled"] as const;
type TurboStatus = (typeof VALID_STATUSES)[number];

export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    elitelabsTurboStatus: (config?.elitelabsTurboStatus ?? "active") as TurboStatus,
  });
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { elitelabsTurboStatus } = await req.json();
  if (!VALID_STATUSES.includes(elitelabsTurboStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const config = await prisma.systemConfig.upsert({
    where: { id: "singleton" },
    update: { elitelabsTurboStatus },
    create: { id: "singleton", elitelabsTurboStatus },
  });

  return NextResponse.json({ elitelabsTurboStatus: config.elitelabsTurboStatus });
}
