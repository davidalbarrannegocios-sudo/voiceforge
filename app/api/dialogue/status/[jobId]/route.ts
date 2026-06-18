import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params

  const dbUser = await prisma.user.findFirst({
    where: { clerkId: userId },
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, status: true, audioUrl: true, error: true, creditsUsed: true },
  })

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.userId !== dbUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({
    status:      job.status,
    audioUrl:    job.audioUrl,
    error:       job.error,
    creditsUsed: job.creditsUsed,
  })
}
