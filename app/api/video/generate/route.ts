import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VIDEO_CREDITS_PER_SECOND = 1500

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { prompt, aspectRatio = '16:9', duration = 5 } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const totalVideoCredits = VIDEO_CREDITS_PER_SECOND * duration

  if (dbUser.credits < totalVideoCredits) {
    return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 402 })
  }

  const XAI_KEY = process.env.XAI_API_KEY!

  const res = await fetch('https://api.x.ai/v1/videos/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-imagine-video',
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      resolution: '720p',
    }),
  })

  const data = await res.json()
  console.log('[xAI video] full response:', JSON.stringify(data))

  if (!res.ok) {
    return NextResponse.json({ error: `xAI error: ${JSON.stringify(data)}` }, { status: 500 })
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { credits: { decrement: totalVideoCredits } },
  })

  return NextResponse.json({
    taskId: data.request_id,
    creditsUsed: totalVideoCredits,
    creditsRemaining: dbUser.credits - totalVideoCredits,
  })
}
