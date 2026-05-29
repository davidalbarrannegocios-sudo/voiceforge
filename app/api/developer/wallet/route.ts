import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const wallet = await prisma.apiWallet.upsert({
    where: { userId: dbUser.id },
    create: { userId: dbUser.id },
    update: {},
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const usageLogs = await prisma.apiUsageLog.findMany({
    where: { userId: dbUser.id, createdAt: { gte: thirtyDaysAgo } },
    select: { bytes: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const dailyUsage: Record<string, number> = {}
  usageLogs.forEach((log) => {
    const day = log.createdAt.toISOString().split('T')[0]
    dailyUsage[day] = (dailyUsage[day] || 0) + log.bytes
  })

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyBytes = usageLogs
    .filter((l) => l.createdAt >= startOfMonth)
    .reduce((sum, l) => sum + l.bytes, 0)

  return NextResponse.json({
    bytes: Number(wallet.bytes),
    totalSpent: wallet.totalSpent,
    dailyUsage,
    monthlyBytes,
  })
}
