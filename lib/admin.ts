import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
  { user: { id: string; role: string } } | NextResponse
> {
  let userId: string | null = null;

  try {
    const session = await auth();
    userId = session.userId;
  } catch (e) {
    console.error("[requireAdmin] Clerk auth error:", JSON.stringify(e, null, 2));
    return NextResponse.json({ error: "Error de autenticación" }, { status: 503 });
  }

  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  return { user };
}
