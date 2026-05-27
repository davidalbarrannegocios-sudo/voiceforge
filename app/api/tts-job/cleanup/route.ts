import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const [stuckProcessing, stuckPending] = await Promise.all([
    prisma.generationJob.findMany({
      where: { userId: user.id, status: "processing", updatedAt: { lt: fiveMinutesAgo } },
    }),
    prisma.generationJob.findMany({
      where: { userId: user.id, status: "pending", createdAt: { lt: tenMinutesAgo } },
    }),
  ]);

  const stuck = [...stuckProcessing, ...stuckPending];
  if (stuck.length === 0) return NextResponse.json({ cleaned: 0 });

  await prisma.$transaction(
    stuck.flatMap((job) => [
      prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "error", errorMsg: "Tiempo de espera agotado" },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: job.fromPlan },
          extraCredits: { increment: job.fromExtra },
        },
      }),
    ])
  );

  console.log(`[tts-job/cleanup] cleaned ${stuck.length} stuck jobs for userId=${user.id}`);
  return NextResponse.json({ cleaned: stuck.length });
}
