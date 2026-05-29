import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer el_live_')) {
    return { error: 'Missing or invalid Authorization header', status: 401 }
  }

  const rawKey = authHeader.replace('Bearer ', '')
  const prefix = rawKey.substring(0, 14) + '...'

  const candidates = await prisma.apiKey.findMany({
    where: { prefix, revokedAt: null },
    include: { user: { include: { apiWallet: true } } },
  })

  for (const candidate of candidates) {
    const valid = await bcrypt.compare(rawKey, candidate.keyHash)
    if (valid) {
      await prisma.apiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
      })
      return { apiKey: candidate, user: candidate.user }
    }
  }

  return { error: 'Invalid API key', status: 401 }
}
