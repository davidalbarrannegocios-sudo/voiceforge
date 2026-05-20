import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — enough for large chunked texts

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  console.log(`[process-job] received request for jobId=${jobId}`);

  const job = await prisma.job.findUnique({ where: { id: jobId } });

  // Only process jobs that are still pending (idempotent)
  if (!job || job.status !== "pending") {
    console.log(`[process-job] skipping jobId=${jobId} status=${job?.status ?? "not_found"}`);
    return NextResponse.json({ ok: false, reason: "not_pending" });
  }

  console.log(`[process-job] starting jobId=${jobId} chars=${job.text.length}`);

  try {
    await prisma.job.update({ where: { id: job.id }, data: { status: "processing" } });

    const result = await fishAudioGenerate({
      text: job.text,
      referenceId: job.voiceId !== "default" ? job.voiceId : undefined,
      userId: job.userId,
    });

    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: "completed",
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
        },
      }),
      prisma.generation.create({
        data: {
          userId: job.userId,
          text: job.text,
          voiceId: job.voiceId,
          audioUrl: result.audio_url,
          durationSeconds: result.duration_seconds,
          creditsUsed: job.creditsUsed,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[process-job] Failed — jobId=${job.id} userId=${job.userId} chars=${job.text.length} error=${message}`);

    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", error: message },
      }),
      prisma.user.update({
        where: { id: job.userId },
        data: { credits: { increment: job.creditsUsed } },
      }),
    ]);

    return NextResponse.json({ ok: false, error: message });
  }
}
