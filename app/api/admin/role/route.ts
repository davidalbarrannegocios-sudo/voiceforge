import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { userId, role } = body as { userId: string; role: "admin" | "user" };

  if (!userId || (role !== "admin" && role !== "user"))
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  return NextResponse.json({ id: updated.id, role: updated.role });
}
