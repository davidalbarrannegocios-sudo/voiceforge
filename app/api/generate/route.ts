import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCharCost } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { text, reference_id } = await req.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const charCost = calculateCharCost(text.trim().length);

    if (user.credits < charCost) {
      return NextResponse.json(
        { error: "Caracteres insuficientes", charCost, charsAvailable: user.credits },
        { status: 402 }
      );
    }

    // Deduct credits and create job atomically
    const [, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: charCost } },
      }),
      prisma.job.create({
        data: {
          userId: user.id,
          status: "pending",
          text: text.trim(),
          voiceId: reference_id ?? "default",
          creditsUsed: charCost,
        },
      }),
    ]);

    // Fire-and-forget via localhost to avoid external DNS round-trip on Railway.
    const baseUrl = `http://localhost:${process.env.PORT ?? 3000}`;
    const processUrl = `${baseUrl}/api/process-job/${job.id}`;
    console.log(`[generate] firing process-job → ${processUrl}`);
    fetch(processUrl, { method: "POST" })
      .then((r) => console.log(`[generate] process-job responded: ${r.status}`))
      .catch((err) => console.error("[generate] process-job trigger failed:", err));

    return NextResponse.json({ jobId: job.id, charCost, charsRemaining: user.credits - charCost });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled error:", message);
    return NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
  }
}
