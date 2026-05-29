import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generateApiKey, getApiKeyLimit } from '@/lib/api-developer'
import bcrypt from 'bcryptjs'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: dbUser.id, revokedAt: null },
    select: {
      id: true, name: true, prefix: true,
      lastUsedAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const limit = getApiKeyLimit(dbUser.plan ?? 'free')
  if (limit === 0) return NextResponse.json({
    error: 'Necesitas un plan de pago para usar la API',
  }, { status: 403 })

  const activeKeys = await prisma.apiKey.count({
    where: { userId: dbUser.id, revokedAt: null },
  })
  if (activeKeys >= limit) return NextResponse.json({
    error: `Límite de ${limit} API keys para tu plan`,
  }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const rawKey = generateApiKey()
  const keyHash = await bcrypt.hash(rawKey, 10)
  const prefix = rawKey.substring(0, 14) + '...'

  await prisma.apiKey.create({
    data: { userId: dbUser.id, name: name.trim(), keyHash, prefix },
  })

  return NextResponse.json({ key: rawKey, prefix })
}
