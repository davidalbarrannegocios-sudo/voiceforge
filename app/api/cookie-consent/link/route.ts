import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { consentId } = await req.json()
    if (!consentId) return NextResponse.json({ ok: false, error: 'Missing consentId' }, { status: 400 })

    await prisma.cookieConsent.updateMany({
      where: { consentId, userId: null },
      data: { userId },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
