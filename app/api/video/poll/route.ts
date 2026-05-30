import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 400 })

  const XAI_KEY = process.env.XAI_API_KEY!

  const res = await fetch(`https://api.x.ai/v1/video/generations/${taskId}`, {
    headers: { 'Authorization': `Bearer ${XAI_KEY}` },
  })

  const data = await res.json()
  console.log('[xAI video poll] full response:', JSON.stringify(data))

  if (data.status === 'succeeded' || data.status === 'completed' || data.status === 'ready') {
    const videoUrl = data.video?.url ?? data.url ?? data.result?.url
    return NextResponse.json({ status: 'Ready', videoUrl })
  }

  if (data.status === 'failed' || data.status === 'error') {
    return NextResponse.json({ status: 'Failed' })
  }

  return NextResponse.json({ status: 'Processing' })
}
