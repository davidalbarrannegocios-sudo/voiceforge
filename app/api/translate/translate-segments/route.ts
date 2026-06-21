import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 60;

const LANGUAGES: Record<string, { name: string; deeplCode: string }> = {
  en: { name: "Inglés", deeplCode: "en-US" },
  zh: { name: "Chino", deeplCode: "zh-HANS" },
  de: { name: "Alemán", deeplCode: "de" },
  ja: { name: "Japonés", deeplCode: "ja" },
  fr: { name: "Francés", deeplCode: "fr" },
  es: { name: "Español", deeplCode: "es" },
  ko: { name: "Coreano", deeplCode: "ko" },
  ar: { name: "Árabe", deeplCode: "ar" },
  ru: { name: "Ruso", deeplCode: "ru" },
  pt: { name: "Portugués", deeplCode: "pt-BR" },
};

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
  if (!utterances?.length) return NextResponse.json({ error: "utterances requeridas" }, { status: 400 });

  const lang = LANGUAGES[targetLang];
  if (!lang) return NextResponse.json({ error: "Idioma de destino no válido" }, { status: 400 });

  try {
    const translator = new deepl.Translator(deeplKey);

    const translated = await Promise.all(
      utterances.map(async (u) => {
        const result = await translator.translateText(
          u.text,
          null,
          lang.deeplCode as deepl.TargetLanguageCode
        ) as deepl.TextResult;
        return { ...u, translatedText: result.text.trim() };
      })
    );

    return NextResponse.json({ utterances: translated });
  } catch (e) {
    console.error("[translate-segments] ERROR:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
