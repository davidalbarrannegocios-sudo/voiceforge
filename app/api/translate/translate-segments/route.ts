import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface TranslatedUtterance extends AssemblyAIUtterance {
  translatedText: string;
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

  const LANG_MAP: Record<string, string> = {
    en: "en-US", zh: "zh-HANS", de: "de", ja: "ja",
    fr: "fr", es: "es", ko: "ko", ar: "ar", ru: "ru", pt: "pt-BR",
  };
  const deeplCode = LANG_MAP[targetLang];
  if (!deeplCode) return NextResponse.json({ error: "Idioma no válido" }, { status: 400 });

  const translator = new deepl.Translator(deeplKey);

  try {
    const translated: TranslatedUtterance[] = await Promise.all(
      utterances.map(async u => {
        const result = await translator.translateText(
          u.text, null, deeplCode as deepl.TargetLanguageCode
        ) as deepl.TextResult;
        return { ...u, translatedText: result.text.trim() };
      })
    );

    return NextResponse.json({ utterances: translated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en traducción DeepL";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
