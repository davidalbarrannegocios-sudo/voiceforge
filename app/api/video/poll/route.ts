import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 400 })

  const XAI_KEY = process.env.XAI_API_KEY!

  console.log('[xAI poll] taskId received:', taskId)
  console.log('[xAI poll] taskId type:', typeof taskId)
  console.log('[xAI poll] url:', `https://api.x.ai/v1/videos/generations/${taskId}`)

  const urls = [
    `https://api.x.ai/v1/videos/generations/${taskId}`,
    `https://api.x.ai/v1/video/generations/${taskId}`,
  ]

  for (const url of urls) {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${XAI_KEY}` },
    })

    console.log('[xAI poll] trying:', url, 'status:', res.status)

    if (res.status === 404) continue

    const text = await res.text()
    console.log('[xAI poll] response text:', text.slice(0, 300))

    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      console.error('[xAI poll] not JSON:', text.slice(0, 100))
      return NextResponse.json({ status: 'Processing' })
    }

    console.log('[xAI poll] status field:', data.status)

    if (data.status === 'succeeded' || data.status === 'completed' || data.status === 'ready') {
      const video = data.video as { url?: string } | undefined
      const result = data.result as { url?: string } | undefined
      const videoUrl = video?.url ?? (data.url as string | undefined) ?? result?.url
      console.log('[xAI poll] videoUrl:', videoUrl)
      return NextResponse.json({ status: 'Ready', videoUrl })
    }

    if (data.status === 'failed' || data.status === 'error') {
      return NextResponse.json({ status: 'Failed' })
    }

    return NextResponse.json({ status: data.status ?? 'Processing' })
  }

  console.error('[xAI poll] both URLs returned 404 for taskId:', taskId)
  return NextResponse.json({ status: 'Processing' })
}
