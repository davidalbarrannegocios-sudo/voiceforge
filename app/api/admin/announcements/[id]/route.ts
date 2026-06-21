import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { clerkId: clerkUser.id } });
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const announcement = await prisma.announcement.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ announcement });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const user = await prisma.user.findFirst({ where: { clerkId: clerkUser.id } });
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.announcement.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
