import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  return NextResponse.json({
    models: [
      { id: 'elite-e2-pro', name: 'Elite Labs E2 Pro',  type: 'tts', price_per_million_bytes: 18 },
      { id: 'elite-legacy', name: 'Elite Labs Legacy',  type: 'tts', price_per_million_bytes: 18 },
      { id: 'elite-turbo',  name: 'Elite Labs Turbo',   type: 'tts', price_per_million_bytes: 18 },
      { id: 'transcribe-1', name: 'Elite Labs ASR',     type: 'asr', price_per_hour: 0.36 },
    ],
  })
}
