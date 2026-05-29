import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as never,
})

const RECHARGE_OPTIONS = [
  { id: 'r18',  euros: 18,  bytes: 1_000_000,  label: '1M bytes — 18€' },
  { id: 'r54',  euros: 54,  bytes: 3_000_000,  label: '3M bytes — 54€' },
  { id: 'r180', euros: 180, bytes: 10_000_000, label: '10M bytes — 180€' },
  { id: 'r540', euros: 540, bytes: 30_000_000, label: '30M bytes — 540€' },
]

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { optionId } = await req.json()
  const option = RECHARGE_OPTIONS.find((o) => o.id === optionId)
  if (!option) return NextResponse.json({ error: 'Invalid option' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: option.euros * 100,
        product_data: {
          name: `Elite Labs API — ${option.label}`,
          description: `${option.bytes.toLocaleString()} bytes para uso de la API`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      type: 'api_recharge',
      userId,
      bytes: option.bytes.toString(),
      euros: option.euros.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/developers?recharge=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/developers`,
  })

  return NextResponse.json({ url: session.url })
}
