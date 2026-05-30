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

  const { imageBase64, prompt, model, aspectRatio } = await req.json()
  if (!imageBase64 || !prompt) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const r2Key = `gallery/${dbUser.id}/${Date.now()}.jpg`
  const imageUrl = await uploadToR2(r2Key, buffer, 'image/jpeg')

  await prisma.sharedImage.create({
    data: {
      userId: dbUser.id,
      prompt,
      model,
      aspectRatio,
      r2Key,
      imageUrl,
    },
  })

  return NextResponse.json({ success: true, imageUrl })
}
