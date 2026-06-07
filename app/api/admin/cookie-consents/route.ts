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

  const clerkIds = [...new Set(consents.map(c => c.userId).filter(Boolean))] as string[]
  const users = clerkIds.length
    ? await prisma.user.findMany({ where: { clerkId: { in: clerkIds } }, select: { clerkId: true, email: true } })
    : []
  const emailByClerkId = Object.fromEntries(users.map(u => [u.clerkId, u.email]))

  const result = consents.map(c => ({ ...c, email: c.userId ? (emailByClerkId[c.userId] ?? null) : null }))
  return NextResponse.json(result)
}
