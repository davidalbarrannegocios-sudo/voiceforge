import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCharCost } from "@/lib/utils";
import { getEffectivePlan } from "@/lib/plan";
import { deleteFromR2 } from "@/lib/r2";
import { log } from "@/lib/logger";
import { processTranslationInBackground, processMultiSpeakerTranslationInBackground, DiarizedSegment, AssemblyAIUtterance } from "@/lib/translate-processor";

export const runtime = "nodejs";
export const maxDuration = 30;

const FREE_TRANSCRIPTION_LIMIT = 2;

export async function POST(req: Request) {
  console.log("[translate] request received");

  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fishKey = process.env.FISH_AUDIO_API_KEY;
  const deeplKey = process.env.DEEPL_API_KEY;
  if (!fishKey) return NextResponse.json({ error: "FISH_AUDIO_API_KEY no configurada" }, { status: 500 });
  if (!deeplKey) return NextResponse.json({ error: "DEEPL_API_KEY no configurada" }, { status: 500 });

  let body: { fileKey: string; targetLang: string; referenceId?: string; referenceFileKey?: string; speakerMode?: "single" | "multi"; utterances?: AssemblyAIUtterance[]; segments?: DiarizedSegment[] };
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { fileKey, targetLang, referenceId, referenceFileKey, speakerMode = "single", utterances, segments } = body;

  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

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

  const lang = LANGUAGES[targetLang];
  if (!lang) return NextResponse.json({ error: "Idioma de destino no válido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const effectivePlan = await getEffectivePlan(user.id, user.plan);

  if (effectivePlan === "free" && user.transcriptionUsed >= FREE_TRANSCRIPTION_LIMIT) {
    await deleteFromR2(fileKey).catch(() => {});
    if (referenceFileKey) await deleteFromR2(referenceFileKey).catch(() => {});
    return NextResponse.json(
      { error: "Has usado tus 2 transcripciones/traducciones gratuitas. Suscríbete a cualquier plan de pago para uso ilimitado." },
      { status: 403 }
    );
  }

  const fileName = fileKey.split("/").pop() ?? fileKey;
  const task = await prisma.translationTask.create({
    data: {
      userId: user.id,
      fileName,
      targetLanguage: targetLang,
      targetLanguageName: lang.name,
      status: "pending",
      speakerMode,
    },
  });

  console.log("[translate] task created:", task.id, "mode:", speakerMode, "— firing background processor");

  if (speakerMode === "multi") {
    processMultiSpeakerTranslationInBackground({
      taskId: task.id,
      userId: user.id,
      fileKey,
      targetLang,
      fishKey,
      deeplKey,
      effectivePlan,
      lang,
      user,
      utterances,  // AssemblyAI format (preferred)
      segments,    // legacy fallback
    }).catch(e => console.error("[translate-multi] unhandled bg error:", e));
  } else {
    processTranslationInBackground({
      taskId: task.id,
      userId: user.id,
      fileKey,
      targetLang,
      referenceId,
      referenceFileKey,
      fishKey,
      deeplKey,
      effectivePlan,
      lang,
      user,
    }).catch(e => console.error("[translate] unhandled bg error:", e));
  }

  return NextResponse.json({ taskId: task.id });
}
