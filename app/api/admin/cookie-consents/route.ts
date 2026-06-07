import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json([], { status: 401 })
  const consents = await prisma.cookieConsent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json(consents)
}
