import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 400 })

  const XAI_KEY = process.env.XAI_API_KEY!

  const url = `https://api.x.ai/v1/videos/${taskId}`
  console.log('[xAI poll] url:', url)

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${XAI_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('[xAI poll] status:', res.status)
  const text = await res.text()
  console.log('[xAI poll] response:', text.slice(0, 500))

  if (!res.ok) {
    return NextResponse.json({ status: 'Processing' })
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    return NextResponse.json({ status: 'Processing' })
  }

  if (data.status === 'done') {
    const video = data.video as { url?: string } | undefined
    const videoUrl = video?.url
    console.log('[xAI poll] done! videoUrl:', videoUrl)
    return NextResponse.json({ status: 'Ready', videoUrl })
  }

  if (data.status === 'failed' || data.status === 'expired') {
    console.log('[xAI poll] failed/expired:', data)
    return NextResponse.json({ status: 'Failed' })
  }

  console.log('[xAI poll] still processing, status:', data.status, 'progress:', data.progress)
  return NextResponse.json({
    status: 'Processing',
    progress: data.progress ?? null,
  })
}
