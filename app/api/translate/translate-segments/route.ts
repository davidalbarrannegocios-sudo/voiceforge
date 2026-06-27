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

  // Bug 1: filter utterances with empty or whitespace-only text
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
    // Bug 2: process in batches of 10 with retry on rate limits
    const BATCH_SIZE = 10;
    const translated: TranslatedUtterance[] = [];

    for (let i = 0; i < validUtterances.length; i += BATCH_SIZE) {
      const batch = validUtterances.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async u => {
          const text = await translateWithRetry(translator, u.text, deeplCode as deepl.TargetLanguageCode);
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
    const msg = e instanceof Error ? e.message : "Error en traducción DeepL";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
