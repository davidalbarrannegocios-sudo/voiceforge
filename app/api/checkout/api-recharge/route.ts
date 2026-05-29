import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

const OPTIONS: Record<string, { euros: number; bytes: number; label: string }> = {
  r18:  { euros: 18,  bytes: 1_000_000,  label: '1M bytes API' },
  r54:  { euros: 54,  bytes: 3_000_000,  label: '3M bytes API' },
  r180: { euros: 180, bytes: 10_000_000, label: '10M bytes API' },
  r540: { euros: 540, bytes: 30_000_000, label: '30M bytes API' },
}

export async function POST(req: NextRequest) {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20' as never,
  })

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { optionId } = await req.json()
  const option = OPTIONS[optionId]
  if (!option) return NextResponse.json({ error: 'Invalid option' }, { status: 400 })

  const paymentIntent = await stripe.paymentIntents.create({
    amount: option.euros * 100,
    currency: 'eur',
    metadata: {
      type: 'api_recharge',
      userId,
      bytes: option.bytes.toString(),
      euros: option.euros.toString(),
    },
    description: `Elite Labs API — ${option.label}`,
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
