import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult
  const wallet = user.apiWallet

  return NextResponse.json({
    bytes_available: Number(wallet?.bytes ?? 0),
    total_spent_eur: wallet?.totalSpent ?? 0,
  })
}
