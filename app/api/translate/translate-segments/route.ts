import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface TranslatedUtterance extends AssemblyAIUtterance {
  translatedText: string;
}

async function translateWithRetry(
  translator: deepl.Translator,
  text: string,
  targetLang: deepl.TargetLanguageCode,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await translator.translateText(text, null, targetLang) as deepl.TextResult;
      return result.text.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.toLowerCase().includes("too many requests") || msg.includes("429");
      if (isRateLimit && attempt < maxRetries - 1) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.warn(`[translate-segments] DeepL rate limit, reintentando en ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (attempt === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("DeepL falló después de todos los reintentos");
}

const OPENAI_LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", it: "Italian", zh: "Chinese", ja: "Japanese",
  ko: "Korean", ar: "Arabic", ru: "Russian",
};

async function translateWithFallback(
  translator: deepl.Translator,
  text: string,
  deeplCode: deepl.TargetLanguageCode,
  targetLang: string,
): Promise<string> {
  try {
    return await translateWithRetry(translator, text, deeplCode);
  } catch (err) {
    console.warn("[translate-segments] DeepL falló, usando OpenAI como fallback");
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw err;
    const langName = OPENAI_LANG_NAMES[targetLang] ?? targetLang;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text to ${langName}. Return ONLY the translated text, nothing else.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "OpenAI translation failed");
    return data.choices[0].message.content.trim();
  }
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const deeplKey = process.env.DEEPL_API_KEY;
  if (!deeplKey) return NextResponse.json({ error: "DEEPL_API_KEY no configurada" }, { status: 500 });

  let body: { utterances: AssemblyAIUtterance[]; targetLang: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { utterances, targetLang } = body;
  if (!utterances?.length) return NextResponse.json({ error: "utterances requerido" }, { status: 400 });
  if (!targetLang) return NextResponse.json({ error: "targetLang requerido" }, { status: 400 });

  const validUtterances = utterances.filter(u => u.text?.trim().length > 0);
  if (validUtterances.length === 0) {
    return NextResponse.json({ error: "No hay texto válido para traducir" }, { status: 400 });
  }

  const LANG_MAP: Record<string, string> = {
    en: "en-US", zh: "zh-HANS", de: "de", ja: "ja",
    fr: "fr", es: "es", ko: "ko", ar: "ar", ru: "ru", pt: "pt-BR",
  };
  const deeplCode = LANG_MAP[targetLang];
  if (!deeplCode) return NextResponse.json({ error: "Idioma no válido" }, { status: 400 });

  const translator = new deepl.Translator(deeplKey);

  try {
    const BATCH_SIZE = 10;
    const translated: TranslatedUtterance[] = [];

    for (let i = 0; i < validUtterances.length; i += BATCH_SIZE) {
      const batch = validUtterances.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async u => {
          const text = await translateWithFallback(translator, u.text, deeplCode as deepl.TargetLanguageCode, targetLang);
          return { ...u, translatedText: text } as TranslatedUtterance;
        })
      );
      translated.push(...results);
      if (i + BATCH_SIZE < validUtterances.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return NextResponse.json({ utterances: translated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en traducción";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
