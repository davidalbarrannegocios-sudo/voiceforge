import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, targetLang } = await req.json()
  if (!text || !targetLang) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const lines = text.split('\n')
  const charPattern = /^(\([^)]+\))\s*(.+)$/

  const linesToTranslate: string[] = []
  const prefixes: string[] = []

  for (const line of lines) {
    const match = line.trim().match(charPattern)
    if (match) {
      prefixes.push(match[1])
      linesToTranslate.push(match[2])
    } else {
      prefixes.push('')
      linesToTranslate.push(line)
    }
  }

  const deeplRes = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: linesToTranslate,
      target_lang: targetLang.toUpperCase(),
    }),
  })

  if (!deeplRes.ok) {
    const err = await deeplRes.text()
    console.error('DeepL error:', err)
    return NextResponse.json({ error: 'Translation failed' }, { status: 502 })
  }

  const deeplData = await deeplRes.json()
  const translations: string[] = deeplData.translations?.map((t: { text: string }) => t.text) ?? linesToTranslate

  const translatedText = translations
    .map((t, i) => prefixes[i] ? `${prefixes[i]} ${t}` : t)
    .join('\n')

  return NextResponse.json({ translatedText })
}
