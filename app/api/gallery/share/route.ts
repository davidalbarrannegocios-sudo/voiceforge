import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { uploadToR2 } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { imageBase64, videoUrl, prompt, model, aspectRatio, type, creditsUsed = 0 } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  let buffer: Buffer
  let contentType: string
  let r2Key: string
  let mediaType: string

  if (type === 'video' && videoUrl) {
    const res = await fetch(videoUrl)
    buffer = Buffer.from(await res.arrayBuffer())
    contentType = 'video/mp4'
    r2Key = `gallery/videos/${dbUser.id}/${Date.now()}.mp4`
    mediaType = 'video'
  } else if (imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    buffer = Buffer.from(base64Data, 'base64')
    contentType = 'image/jpeg'
    r2Key = `gallery/${dbUser.id}/${Date.now()}.jpg`
    mediaType = 'image'
  } else {
    return NextResponse.json({ error: 'Missing media data' }, { status: 400 })
  }

  const mediaUrl = await uploadToR2(r2Key, buffer, contentType)

  await prisma.sharedImage.create({
    data: {
      userId: dbUser.id,
      prompt,
      model,
      aspectRatio,
      r2Key,
      imageUrl: mediaUrl,
      type: mediaType,
      creditsUsed,
    },
  })

  return NextResponse.json({ success: true, mediaUrl })
}
