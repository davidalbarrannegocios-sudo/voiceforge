import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fishAudioGenerate } from "@/lib/fishaudio";
import { calculateCharCost } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const LANGUAGES: Record<string, { name: string; prompt: string }> = {
  en:  { name: "Inglés",   prompt: "English" },
  ja:  { name: "Japonés",  prompt: "Japanese" },
  ko:  { name: "Coreano",  prompt: "Korean" },
  zh:  { name: "Mandarín", prompt: "Mandarin Chinese" },
  yue: { name: "Cantonés", prompt: "Cantonese Chinese" },
};

async function gptTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the given text accurately and naturally, preserving tone and meaning. Return only the translated text, with no explanations, notes, or commentary.",
        },
        {
          role: "user",
          content: `Translate the following text from ${fromLang} to ${toLang}:\n\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.choices[0]?.message?.content ?? "").trim();
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey = process.env.FISH_AUDIO_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!fishKey)   return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });
  if (!openaiKey) return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });

  const form = await req.formData();
  const audioFile = form.get("audio") as File | null;
  const targetLang = (form.get("target_lang") as string) ?? "";

  if (!audioFile) return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });
  if (!LANGUAGES[targetLang]) return NextResponse.json({ error: "Idioma de destino no válido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // ── Step 1: ASR — transcribe audio ──────────────────────────
  const asrForm = new FormData();
  asrForm.append("audio", audioFile);
  asrForm.append("language", "es");
  asrForm.append("ignore_timestamps", "true");

  const asrRes = await fetch("https://api.fish.audio/v1/asr", {
    method: "POST",
    headers: { Authorization: `Bearer ${fishKey}` },
    body: asrForm,
  });

  if (!asrRes.ok) {
    const err = await asrRes.text();
    return NextResponse.json({ error: `Error en transcripción (${asrRes.status}): ${err}` }, { status: 502 });
  }

  const asrData = await asrRes.json();
  const transcribedText = (asrData.text ?? "").trim();

  if (!transcribedText) {
    return NextResponse.json({ error: "No se detectó texto en el audio" }, { status: 400 });
  }

  console.log(`[translate] ASR → ${transcribedText.length} chars, target=${targetLang}`);

  // ── Step 2: Translate ES → EN ────────────────────────────────
  let englishText: string;
  try {
    englishText = await gptTranslate(transcribedText, "Spanish", "English", openaiKey);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error en traducción ES→EN" }, { status: 502 });
  }

  // ── Step 3: Translate EN → target (if not English) ───────────
  let finalText = englishText;
  if (targetLang !== "en") {
    try {
      finalText = await gptTranslate(englishText, "English", LANGUAGES[targetLang].prompt, openaiKey);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error en traducción al idioma destino" }, { status: 502 });
    }
  }

  // ── Credit check & deduction ──────────────────────────────────
  const charCost = calculateCharCost(finalText.length);
  if (user.credits < charCost) {
    return NextResponse.json(
      { error: `Créditos insuficientes. Necesitas ${charCost} para ${finalText.length} caracteres.`, charCost, charsAvailable: user.credits },
      { status: 402 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { credits: { decrement: charCost } },
  });

  // ── Step 4: TTS — generate translated audio ───────────────────
  let result;
  try {
    result = await fishAudioGenerate({ text: finalText, userId: user.id });
  } catch (e) {
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: charCost } },
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar audio" },
      { status: 500 },
    );
  }

  console.log(`[translate] done → ${result.audio_url} (${result.duration_seconds}s, ${charCost} credits)`);

  return NextResponse.json({
    audioUrl: result.audio_url,
    durationSeconds: result.duration_seconds,
    transcribedText,
    englishText,
    translatedText: finalText,
    targetLanguageName: LANGUAGES[targetLang].name,
    charCost,
    charsRemaining: user.credits - charCost,
  });
}
