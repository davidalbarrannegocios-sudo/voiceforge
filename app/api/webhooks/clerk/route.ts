import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { clerkClient } from '@clerk/nextjs/server'
import { isDisposableEmail } from '@/lib/disposable-email-domains'

export const runtime = 'nodejs'

interface ClerkEvent {
  type: string
  data: {
    id: string
    email_addresses: { email_address: string }[]
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

  if (event.type !== 'user.created') {
    return NextResponse.json({ ok: true })
  }

  const email      = event.data.email_addresses[0]?.email_address ?? ''
  const clerkUserId = event.data.id

  if (!isDisposableEmail(email)) {
    return NextResponse.json({ ok: true })
  }

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
