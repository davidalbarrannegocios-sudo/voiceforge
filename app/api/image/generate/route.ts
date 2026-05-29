import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MODEL_ENDPOINTS: Record<string, string> = {
  'flux-2-klein-4b':   'flux-2-klein-4b',
  'flux-2-klein-9b':   'flux-2-klein-9b',
  'flux-2-pro':        'flux-2-pro',
  'flux-2-max':        'flux-2-max',
  'flux-2-flex':       'flux-2-flex',
  'flux-pro-1.1':      'flux-pro-1.1',
  'flux-pro-1.1-ultra':'flux-pro-1.1-ultra',
  'flux-kontext-pro':  'flux-kontext-pro',
  'flux-kontext-max':  'flux-kontext-max',
  'flux-pro-1.0-fill': 'flux-pro-1.0-fill',
}

const MODEL_CREDITS: Record<string, number> = {
  'flux-2-klein-4b':    571,
  'flux-2-pro':        2285,
  'flux-2-flex':       3142,
  'flux-2-max':        3428,
  'flux-2-klein-9b':   6000,
  'flux-pro-1.1':      2000,
  'flux-pro-1.1-ultra':2857,
  'flux-kontext-pro':  2000,
  'flux-kontext-max':  3428,
  'flux-pro-1.0-fill': 2571,
}

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '16:9': { width: 1440, height: 810 },
  '9:16': { width: 810,  height: 1440 },
  '4:3':  { width: 1024, height: 768 },
  '3:4':  { width: 768,  height: 1024 },
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { prompt, negativePrompt, model = 'flux-pro-1.1', aspectRatio = '1:1', count = 1 } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const creditsPerImage = MODEL_CREDITS[model] ?? 2000
  const totalCredits = creditsPerImage * Math.min(count, 8)

  if (dbUser.credits < totalCredits) {
    return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 402 })
  }

  const endpoint = MODEL_ENDPOINTS[model] ?? 'flux-pro-1.1'
  const dims = DIMENSIONS[aspectRatio] ?? { width: 1024, height: 1024 }
  const BFL_KEY = process.env.BFL_API_KEY!

  const promises = Array.from({ length: count }).map(async () => {
    const submitRes = await fetch(`https://api.bfl.ai/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-key': BFL_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: dims.width,
        height: dims.height,
        output_format: 'jpeg',
        safety_tolerance: 2,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      }),
    })

    const submitData = await submitRes.json()
    if (!submitRes.ok) throw new Error(submitData.message ?? 'BFL submit error')

    const { polling_url } = submitData

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 1000))

      const pollRes = await fetch(polling_url, {
        headers: { 'accept': 'application/json', 'x-key': BFL_KEY },
      })
      const pollData = await pollRes.json()

      if (pollData.status === 'Ready') {
        const imgRes = await fetch(pollData.result.sample)
        const imgBuffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(imgBuffer).toString('base64')
        return `data:image/jpeg;base64,${base64}`
      }

      if (pollData.status === 'Error' || pollData.status === 'Failed') {
        throw new Error('Generation failed')
      }
    }

    throw new Error('Timeout')
  })

  try {
    const images = await Promise.all(promises)

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: totalCredits } },
    })

    return NextResponse.json({
      images,
      creditsUsed: totalCredits,
      creditsRemaining: dbUser.credits - totalCredits,
    })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[image/generate] ERROR:', e?.message)
    return NextResponse.json({ error: e?.message ?? 'Error generando imagen' }, { status: 500 })
  }
}
