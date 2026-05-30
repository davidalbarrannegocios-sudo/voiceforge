import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BFL_ENDPOINTS: Record<string, string> = {
  'flux-2-klein-4b':    'flux-2-klein-4b',
  'flux-2-klein-9b':    'flux-2-klein-9b',
  'flux-2-pro':         'flux-2-pro',
  'flux-2-max':         'flux-2-max',
  'flux-2-flex':        'flux-2-flex',
  'flux-pro-1.1':       'flux-pro-1.1',
  'flux-pro-1.1-ultra': 'flux-pro-1.1-ultra',
  'flux-kontext-pro':   'flux-kontext-pro',
  'flux-kontext-max':   'flux-kontext-max',
  'flux-pro-1.0-fill':  'flux-pro-1.0-fill',
}

const MODEL_CREDITS: Record<string, number> = {
  'flux-2-klein-4b':          571,
  'flux-2-pro':               2285,
  'flux-2-flex':              3142,
  'flux-2-max':               3428,
  'flux-2-klein-9b':          6000,
  'flux-pro-1.1':             2000,
  'flux-pro-1.1-ultra':       2857,
  'flux-kontext-pro':         2000,
  'flux-kontext-max':         3428,
  'flux-pro-1.0-fill':        2571,
  'grok-imagine-image':        650,
  'grok-imagine-image-quality': 650,
}

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 768 },
  '9:16': { width: 768,  height: 1280 },
  '4:3':  { width: 1024, height: 768 },
  '3:4':  { width: 768,  height: 1024 },
}

function roundTo32(n: number): number {
  return Math.round(n / 32) * 32
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { prompt, negativePrompt, model = 'flux-pro-1.1', aspectRatio = '1:1', count = 1 } = await req.json()

  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const creditsPerImage = MODEL_CREDITS[model] ?? 2000
  const totalCredits = creditsPerImage * count

  if (dbUser.credits < totalCredits) {
    return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 402 })
  }

  const isXAI = model.startsWith('grok-imagine-image')

  if (isXAI) {
    const XAI_KEY = process.env.XAI_API_KEY!

    const images = await Promise.all(
      Array.from({ length: count }).map(async () => {
        const res = await fetch('https://api.x.ai/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_KEY}`,
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            response_format: 'b64_json',
          }),
        })

        const data = await res.json()
        console.log('[xAI image] status:', res.status, 'data:', JSON.stringify(data).slice(0, 200))

        if (!res.ok) throw new Error(`xAI error ${res.status}: ${JSON.stringify(data)}`)

        const b64 = data.data?.[0]?.b64_json
        if (!b64) throw new Error('xAI: no b64_json in response')

        return `data:image/png;base64,${b64}`
      })
    )

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: totalCredits } },
    })

    return NextResponse.json({
      images,
      creditsUsed: totalCredits,
      creditsRemaining: dbUser.credits - totalCredits,
    })
  }

  // BFL path
  const endpoint = BFL_ENDPOINTS[model] ?? 'flux-pro-1.1'
  const dims = DIMENSIONS[aspectRatio] ?? { width: 1024, height: 1024 }
  const BFL_KEY = process.env.BFL_API_KEY!

  const jobs = await Promise.all(
    Array.from({ length: count }).map(async () => {
      const res = await fetch(`https://api.bfl.ai/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-key': BFL_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          width: roundTo32(dims.width),
          height: roundTo32(dims.height),
          output_format: 'jpeg',
          safety_tolerance: 2,
          ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(`BFL error ${res.status}: ${JSON.stringify(err)}`)
      }

      const data = await res.json()
      return { id: data.id, polling_url: data.polling_url }
    })
  )

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { credits: { decrement: totalCredits } },
  })

  return NextResponse.json({
    jobs,
    creditsUsed: totalCredits,
    creditsRemaining: dbUser.credits - totalCredits,
  })
}
