import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = ["active", "maintenance", "disabled"] as const;
type TurboStatus = (typeof VALID_STATUSES)[number];

function serializeConfig(config: {
  elitelabsTurboStatus: string;
  elitelabsTurboManualOverride: boolean;
  registrationOpen: boolean;
  maintenanceMessage: string;
  maintenanceMessageActive: boolean;
  planCredits: string;
}) {
  return {
    elitelabsTurboStatus: config.elitelabsTurboStatus as TurboStatus,
    elitelabsTurboManualOverride: config.elitelabsTurboManualOverride,
    registrationOpen: config.registrationOpen,
    maintenanceMessage: config.maintenanceMessage,
    maintenanceMessageActive: config.maintenanceMessageActive,
    planCredits: config.planCredits,
  };
}

export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    elitelabsTurboStatus: (config?.elitelabsTurboStatus ?? "active") as TurboStatus,
    elitelabsTurboManualOverride: config?.elitelabsTurboManualOverride ?? false,
    registrationOpen: config?.registrationOpen ?? true,
    maintenanceMessage: config?.maintenanceMessage ?? "",
    maintenanceMessageActive: config?.maintenanceMessageActive ?? false,
    planCredits: config?.planCredits ?? "{}",
  });
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.elitelabsTurboStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.elitelabsTurboStatus)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    updateData.elitelabsTurboStatus = body.elitelabsTurboStatus;
  }
  if (body.elitelabsTurboManualOverride !== undefined) updateData.elitelabsTurboManualOverride = !!body.elitelabsTurboManualOverride;
  if (body.registrationOpen !== undefined) updateData.registrationOpen = !!body.registrationOpen;
  if (body.maintenanceMessage !== undefined) updateData.maintenanceMessage = String(body.maintenanceMessage);
  if (body.maintenanceMessageActive !== undefined) updateData.maintenanceMessageActive = !!body.maintenanceMessageActive;
  if (body.planCredits !== undefined) {
    updateData.planCredits = typeof body.planCredits === "string" ? body.planCredits : JSON.stringify(body.planCredits);
  }

  const config = await prisma.systemConfig.upsert({
    where: { id: "singleton" },
    update: updateData,
    create: {
      id: "singleton",
      elitelabsTurboStatus: "active",
      elitelabsTurboManualOverride: false,
      registrationOpen: true,
      maintenanceMessage: "",
      maintenanceMessageActive: false,
      planCredits: "{}",
      ...updateData,
    },
  });

  return NextResponse.json(serializeConfig(config));
}
