import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clerkId: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (user.clerkId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(user.clerkId);
    } catch (err) {
      console.error("[admin/delete] Clerk delete failed:", err);
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  const body = await req.json();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clerkId: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (body.action === "ban") {
    if (user.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.banUser(user.clerkId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("402")) {
          return NextResponse.json({ error: "Error al banear en Clerk" }, { status: 500 });
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unban") {
    if (user.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.unbanUser(user.clerkId);
      } catch (err) {
        console.error("[admin/unban] Clerk unban failed:", err);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "suspend") {
    const until = body.until ? new Date(body.until) : null;
    await prisma.user.update({ where: { id: userId }, data: { disabledUntil: until } });

    // Embed in Clerk publicMetadata so middleware can check without DB
    if (user.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(user.clerkId, {
          publicMetadata: { suspendedUntil: until?.toISOString() ?? null },
        });
      } catch (err) {
        console.error("[admin/suspend] Clerk metadata update failed:", err);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unsuspend") {
    await prisma.user.update({ where: { id: userId }, data: { disabledUntil: null } });

    if (user.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(user.clerkId, {
          publicMetadata: { suspendedUntil: null },
        });
      } catch (err) {
        console.error("[admin/unsuspend] Clerk metadata update failed:", err);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
