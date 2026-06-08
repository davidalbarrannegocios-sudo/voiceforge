import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  try {
    const { consent, consentId } = await req.json()
    const { userId } = await auth()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null

    await prisma.cookieConsent.create({
      data: { userId, ip, consent, consentId: consentId ?? null }
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
