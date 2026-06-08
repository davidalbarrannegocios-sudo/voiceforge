import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

  return NextResponse.json(ticket);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const existing: Prisma.JsonArray = Array.isArray(ticket.messages) ? ticket.messages as Prisma.JsonArray : [];
  const newMessage: Prisma.JsonObject = {
    role: "user",
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      messages: [...existing, newMessage],
      status: "open",
    },
  });

  return NextResponse.json(updated);
}
