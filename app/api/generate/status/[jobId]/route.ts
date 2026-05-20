import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, audioUrl: true, error: true }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[status] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
