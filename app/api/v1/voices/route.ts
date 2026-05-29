import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '20')), 100)

  const voices = await prisma.clonedVoice.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      gender: true,
      language: true,
      provider: true,
      createdAt: true,
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  const total = await prisma.clonedVoice.count({ where: { isPublic: true } })

  return NextResponse.json({ voices, page, limit, total })
}
