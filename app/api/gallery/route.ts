import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const images = await prisma.sharedImage.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      imageUrl: true,
      prompt: true,
      model: true,
      aspectRatio: true,
      type: true,
      createdAt: true,
    },
  })

  console.log('[gallery] page:', page, 'total images found:', images.length)
  if (images[0]) console.log('[gallery] first image id:', images[0].id, 'url:', images[0].imageUrl.slice(0, 60))

  return NextResponse.json({ images })
}
