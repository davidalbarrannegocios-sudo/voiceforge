import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { clerkClient } from '@clerk/nextjs/server'
import { isDisposableEmail } from '@/lib/disposable-email-domains'
import { prisma } from '@/lib/prisma'
import { UAParser } from 'ua-parser-js'

export const runtime = 'nodejs'

interface ClerkEvent {
  type: string
  data: {
    id: string
    email_addresses?: { email_address: string }[]
    // session.created fields
    user_id?: string
    last_active_at?: number
    client_id?: string
  }
}

async function getGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip.startsWith('127.') || ip.startsWith('::')) return { country: null, city: null }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { country: null, city: null }
    const data = await res.json()
    return {
      country: typeof data.country_name === 'string' ? data.country_name : null,
      city: typeof data.city === 'string' ? data.city : null,
    }
  } catch {
    return { country: null, city: null }
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const payload = await req.text()
  const svixId        = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  let event: ClerkEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── user.created: block disposable emails ────────────────────
  if (event.type === 'user.created') {
    const email      = event.data.email_addresses?.[0]?.email_address ?? ''
    const clerkUserId = event.data.id

    if (!isDisposableEmail(email)) return NextResponse.json({ ok: true })

    console.warn(`[clerk-webhook] Disposable email on signup: ${email} — banning ${clerkUserId}`)
    try {
      const client = await clerkClient()
      await client.users.banUser(clerkUserId)
      console.info(`[clerk-webhook] Banned ${clerkUserId} (${email})`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[clerk-webhook] Failed to ban ${clerkUserId}:`, msg)
      return NextResponse.json({ error: 'Ban failed' }, { status: 500 })
    }
    return NextResponse.json({ blocked: true })
  }

  // ── session.created: log IP/device/geo ────────────────────────
  if (event.type === 'session.created') {
    const clerkUserId = event.data.user_id
    if (!clerkUserId) return NextResponse.json({ ok: true })

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ ok: true })

    // Clerk webhooks don't carry IP/UA — we record what we can from the request
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const uaString = req.headers.get('user-agent') || ''
    const parser = new UAParser(uaString)
    const browser = parser.getBrowser().name || null
    const os = parser.getOS().name || null
    const deviceType = parser.getDevice().type || 'desktop'

    const { country, city } = ip ? await getGeo(ip) : { country: null, city: null }

    await prisma.userSession.create({
      data: {
        userId: user.id,
        ip,
        userAgent: uaString || null,
        browser,
        os,
        device: deviceType,
        country,
        city,
      },
    })

    // Keep only last 100 sessions per user
    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    if (sessions.length > 100) {
      const toDelete = sessions.slice(100).map(s => s.id)
      await prisma.userSession.deleteMany({ where: { id: { in: toDelete } } })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
