import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { uploadImageToHetzner } from '@/lib/hetzner-images'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { polling_url, prompt, model, aspectRatio, creditsUsed: creditsPerImage } = await req.json()
  if (!polling_url) return NextResponse.json({ error: 'No polling_url' }, { status: 400 })

  const BFL_KEY = process.env.BFL_API_KEY!

  console.log('[poll] calling polling_url:', polling_url?.slice(0, 60))

  const res = await fetch(polling_url, {
    headers: {
      'accept': 'application/json',
      'x-key': BFL_KEY,
    },
  })

  const data = await res.json()
  console.log('[poll] BFL status:', data.status, 'res status:', res.status)

  if (data.status === 'Ready') {
    const key = `images/${userId}/${Date.now()}.jpg`
    const url = await uploadImageToHetzner(data.result.sample, key, 'image/jpeg')

    if (prompt && model) {
      const dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } })
      if (dbUser) {
        await prisma.sharedImage.create({
          data: {
            userId: dbUser.id,
            prompt: prompt ?? '',
            model: model ?? '',
            aspectRatio: aspectRatio ?? '1:1',
            storageKey: key,
            imageUrl: url,
            type: 'image',
            creditsUsed: creditsPerImage ?? 0,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        })
      }
    }

    return NextResponse.json({ status: 'Ready', image: url })
  }

  if (data.status === 'Error' || data.status === 'Failed') {
    return NextResponse.json({ status: 'Failed' })
  }

  return NextResponse.json({ status: data.status ?? 'Processing' })
}
