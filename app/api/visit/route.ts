import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null
    const country = req.headers.get('cf-ipcountry') || null

    await prisma.pageVisit.create({
      data: { ip, userAgent, country, path: '/' }
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
