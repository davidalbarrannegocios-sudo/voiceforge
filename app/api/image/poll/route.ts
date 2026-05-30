import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { polling_url } = await req.json()
  if (!polling_url) return NextResponse.json({ error: 'No polling_url' }, { status: 400 })

  const BFL_KEY = process.env.BFL_API_KEY!

  console.log('[poll] calling polling_url:', polling_url?.slice(0, 60))

  const res = await fetch(polling_url, {
    headers: {
      'accept': 'application/json',
      'x-key': BFL_KEY,
    },
  })

  const data = await res.json()
  console.log('[poll] BFL status:', data.status, 'res status:', res.status)

  if (data.status === 'Ready') {
    const imgRes = await fetch(data.result.sample)
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')

    return NextResponse.json({
      status: 'Ready',
      image: `data:image/jpeg;base64,${base64}`,
    })
  }

  if (data.status === 'Error' || data.status === 'Failed') {
    return NextResponse.json({ status: 'Failed' })
  }

  return NextResponse.json({ status: data.status ?? 'Processing' })
}
