import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const langNames: Record<string, string> = {
  'EN': 'English', 'EN-US': 'English', 'EN-GB': 'English',
  'ES': 'Spanish', 'FR': 'French', 'DE': 'German',
  'PT': 'Portuguese', 'PT-BR': 'Portuguese', 'PT-PT': 'Portuguese',
  'IT': 'Italian', 'ZH': 'Chinese', 'JA': 'Japanese',
  'KO': 'Korean', 'AR': 'Arabic', 'RU': 'Russian',
  'NL': 'Dutch', 'PL': 'Polish', 'TR': 'Turkish', 'SV': 'Swedish'
}

async function translateSegment(text: string, targetLang: string): Promise<string> {
  if (!text?.trim()) return text
  const targetLangName = langNames[targetLang.toUpperCase()] || targetLang

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text to ${targetLangName}. Return ONLY the translated text, no explanations, no quotes, nothing else.`
        },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })
  })

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)
  const data = await response.json()
  return data.choices[0].message.content.trim()
}

export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { utterances, targetLang } = await req.json()
  if (!utterances?.length) return NextResponse.json({ error: "No hay segmentos" }, { status: 400 })
  if (!targetLang) return NextResponse.json({ error: "Idioma destino requerido" }, { status: 400 })

  const BATCH_SIZE = 5
  const translated: string[] = []

  for (let i = 0; i < utterances.length; i += BATCH_SIZE) {
    const batch = utterances.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((u: {text?: string; translatedText?: string; [key: string]: unknown}) => translateSegment(u.text || u.translatedText || '', targetLang))
    )
    translated.push(...results)
  }

  const translatedUtterances = utterances.map((u: {text?: string; [key: string]: unknown}, i: number) => ({
    ...u,
    translatedText: translated[i] || u.text
  }))

  return NextResponse.json({ utterances: translatedUtterances })
}
