import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
  { user: { id: string; role: string } } | NextResponse
> {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  return { user };
}
