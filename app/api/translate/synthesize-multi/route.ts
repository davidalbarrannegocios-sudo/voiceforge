import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { fishAudioGenerateBuffer } from "@/lib/fishaudio";
import type { AssemblyAIUtterance } from "@/app/api/translate/diarize/route";

export const runtime = "nodejs";
export const maxDuration = 300;

interface TranslatedUtterance extends AssemblyAIUtterance {
  translatedText: string;
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: {
    utterances: TranslatedUtterance[];
    sourceFileKey: string;
    userId: string;
    targetLang?: string;
    voiceAssignments?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { utterances, sourceFileKey, userId, targetLang, voiceAssignments } = body;
  if (!utterances?.length) return NextResponse.json({ error: "utterances requerido" }, { status: 400 });
  if (!sourceFileKey) return NextResponse.json({ error: "sourceFileKey requerido" }, { status: 400 });
  if (!voiceAssignments || Object.keys(voiceAssignments).length === 0) {
    return NextResponse.json({ error: "voiceAssignments requerido" }, { status: 400 });
  }

  console.log("[synthesize-multi] usando voces asignadas manualmente:", voiceAssignments);

  // Build speaker order and reference_id array from voiceAssignments
  const speakerOrder = [...new Set(utterances.map(u => u.speaker))].sort();
  const assignedSpeakers = speakerOrder.filter(s => voiceAssignments[s]);

  if (assignedSpeakers.length === 0) {
    return NextResponse.json({ error: "No hay voces asignadas para ningún hablante" }, { status: 400 });
  }

  const speakerIndexMap: Record<string, number> = Object.fromEntries(
    assignedSpeakers.map((s, i) => [s, i])
  );
  const referenceIds = assignedSpeakers.map(s => voiceAssignments[s]);
  console.log("[synthesize-multi] reference_id array:", referenceIds);

  try {

    // Diagnostic logs
    console.log("[synthesize-multi] utterances total:", utterances.length);
    const utterancesWithSpeaker = utterances.filter(u => speakerIndexMap[u.speaker] !== undefined);
    console.log("[synthesize-multi] utterances con speaker asignado:", utterancesWithSpeaker.length);
    const utterancesWithText = utterancesWithSpeaker.filter(u => u.translatedText?.trim());
    console.log("[synthesize-multi] utterances con translatedText:", utterancesWithText.length);

    // Log utterances sin texto traducido
    const utterancesWithoutText = utterancesWithSpeaker.filter(u => !u.translatedText?.trim());
    if (utterancesWithoutText.length > 0) {
      console.warn("[synthesize-multi] WARNING:", utterancesWithoutText.length, "utterances sin translatedText:");
      utterancesWithoutText.slice(0, 5).forEach((u, i) => {
        console.warn(`  [${i + 1}] speaker=${u.speaker} start=${u.start} end=${u.end} text="${u.text}"`);
      });
    }

    const ttsText = utterances
      .filter(u => speakerIndexMap[u.speaker] !== undefined && u.translatedText?.trim())
      .map(u => `<|speaker:${speakerIndexMap[u.speaker]}|>${u.translatedText.trim()}`)
      .join("");

    console.log("[synthesize-multi] ttsText length:", ttsText.length, "chars");
    console.log("[synthesize-multi] ttsText preview:", ttsText.slice(0, 200) + "...");

    if (ttsText.length === 0) {
      return NextResponse.json({ error: "No hay texto traducido para sintetizar" }, { status: 400 });
    }

    const audioBuffer = await fishAudioGenerateBuffer({
      text: ttsText,
      references: referenceIds.map(id => ({ type: "model_id" as const, value: id })),
      model: "s2-pro",
      normalize: false,
      ...(targetLang && { language: targetLang.toLowerCase().slice(0, 2) }),
    });

    const key = `translations/multi/${userId}/${Date.now()}.mp3`;
    const audioUrl = await uploadToR2(key, audioBuffer, "audio/mpeg");
    const durationSeconds = Math.round((audioBuffer.length * 8) / 128_000 * 10) / 10;

    return NextResponse.json({ audioUrl, durationSeconds, r2Key: key });
  } catch (error) {
    console.error("[synthesize-multi] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar audio" },
      { status: 500 }
    );
  }
}
