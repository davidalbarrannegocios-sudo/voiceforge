import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { fishAudioGenerateBuffer } from '@/lib/fishaudio'

export const runtime = 'nodejs'

const MODEL_MAP: Record<string, string> = {
  'elite-e2-pro': 'speech-1.6',
  'elite-legacy':  'speech-1.5',
  'elite-turbo':   'speech-1.6',
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApiKey(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user, apiKey } = authResult
  const wallet = user.apiWallet

  if (!wallet || Number(wallet.bytes) <= 0) {
    return NextResponse.json({
      error: 'Insufficient API bytes. Recharge at elitelabs.es/dashboard/developers',
    }, { status: 402 })
  }

  const body = await req.json()
  const { text, voice_id, model = 'elite-e2-pro' } = body

  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
  if (!voice_id) return NextResponse.json({ error: 'voice_id is required' }, { status: 400 })

  const fishModel = MODEL_MAP[model] ?? 'speech-1.6'

  try {
    const audioBuffer = await fishAudioGenerateBuffer({
      text,
      referenceId: voice_id,
      model: fishModel,
    })

    const bytesUsed = audioBuffer.length
    const remaining = Math.max(0, Number(wallet.bytes) - bytesUsed)

    await Promise.all([
      prisma.apiWallet.update({
        where: { userId: user.id },
        data: { bytes: { decrement: BigInt(bytesUsed) } },
      }),
      prisma.apiUsageLog.create({
        data: { userId: user.id, apiKeyId: apiKey.id, bytes: bytesUsed, endpoint: 'tts' },
      }),
    ])

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Bytes-Used': bytesUsed.toString(),
        'X-Bytes-Remaining': remaining.toString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
