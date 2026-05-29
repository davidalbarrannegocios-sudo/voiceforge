import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MODELS: Record<string, string> = {
  'flux-2-pro':    'flux-2-pro',
  'flux-pro-1.1':  'flux-pro-1.1',
  'flux-kontext':  'flux-kontext-pro',
  'flux-dev':      'flux-dev',
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

  const { prompt, negativePrompt, model = 'flux-pro-1.1', aspectRatio = '1:1', count = 1 } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const endpoint = MODELS[model] ?? 'flux-pro-1.1'
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
    return NextResponse.json({ images })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[image/generate] ERROR:', e?.message)
    return NextResponse.json({ error: e?.message ?? 'Error generando imagen' }, { status: 500 })
  }
}
