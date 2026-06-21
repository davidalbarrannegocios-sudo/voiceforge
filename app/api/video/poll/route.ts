import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { uploadImageToHetzner } from '@/lib/hetzner-images'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 400 })

  const XAI_KEY = process.env.XAI_API_KEY!

  const url = `https://api.x.ai/v1/videos/${taskId}`
  console.log('[xAI poll] url:', url)

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${XAI_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('[xAI poll] status:', res.status)
  const text = await res.text()
  console.log('[xAI poll] response:', text.slice(0, 500))

  if (!res.ok) {
    return NextResponse.json({ status: 'Processing' })
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    return NextResponse.json({ status: 'Processing' })
  }

  if (data.status === 'done') {
    const video = data.video as { url?: string } | undefined
    const videoUrl = video?.url
    console.log('[xAI poll] done! videoUrl:', videoUrl)

    if (videoUrl) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
        if (dbUser) {
          const key = `videos/${dbUser.id}/${Date.now()}.mp4`
          const savedUrl = await uploadImageToHetzner(videoUrl, key, "video/mp4")
          await prisma.sharedImage.create({
            data: {
              userId: dbUser.id,
              prompt: "Video generado",
              model: "grok-imagine-video",
              aspectRatio: "16:9",
              storageKey: key,
              imageUrl: savedUrl,
              type: "video",
              creditsUsed: 0,
              expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            }
          })
          return NextResponse.json({ status: 'Ready', videoUrl: savedUrl })
        }
      } catch (e) {
        console.error('[xAI poll] save error:', e)
      }
    }

    return NextResponse.json({ status: 'Ready', videoUrl })
  }

  if (data.status === 'failed' || data.status === 'expired') {
    console.log('[xAI poll] failed/expired:', data)
    return NextResponse.json({ status: 'Failed' })
  }

  console.log('[xAI poll] still processing, status:', data.status, 'progress:', data.progress)
  return NextResponse.json({
    status: 'Processing',
    progress: data.progress ?? null,
  })
}
