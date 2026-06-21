import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutes — AssemblyAI diarization can be slow

export interface AssemblyAIUtterance {
  speaker: string;   // "A", "B", "C"...
  text: string;
  start: number;     // milliseconds
  end: number;       // milliseconds
  confidence?: number;
}

const ASSEMBLYAI_BASE = "https://api.assemblyai.com";

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error("[diarize] ASSEMBLYAI_API_KEY no configurada");
    return NextResponse.json({ error: "ASSEMBLYAI_API_KEY no configurada" }, { status: 500 });
  }

  const publicAudioBase = process.env.HETZNER_AUDIO_PUBLIC_URL ?? "https://elitelabs-audio.fsn1.your-objectstorage.com";

  let body: { fileKey: string; speakersExpected?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { fileKey, speakersExpected } = body;
  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

  // Build the public Hetzner URL that AssemblyAI will download
  const audioUrl = `${publicAudioBase}/${fileKey}`;
  console.log(`[diarize] submitting to AssemblyAI — url=${audioUrl} speakersExpected=${speakersExpected ?? "auto"}`);

  // Step 1: Submit transcript request
  // Note: AssemblyAI uses lowercase 'authorization' header
  const transcriptPayload: Record<string, unknown> = {
    audio_url: audioUrl,
    speaker_labels: true,
    speech_model: "best",
  };
  // If the user specified an exact speaker count, pass it to AssemblyAI to improve accuracy
  if (speakersExpected && speakersExpected >= 2) {
    transcriptPayload.speakers_expected = speakersExpected;
  }

  const submitRes = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript`, {
    method: "POST",
    headers: {
      "authorization": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(transcriptPayload),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    console.error(`[diarize] submit failed (${submitRes.status}): ${err}`);
    return NextResponse.json({ error: `AssemblyAI submit failed (${submitRes.status}): ${err}` }, { status: 502 });
  }

  const submitData = await submitRes.json();
  const transcriptId: string = submitData.id;

  if (!transcriptId) {
    console.error("[diarize] no transcript ID returned:", JSON.stringify(submitData));
    return NextResponse.json({ error: "AssemblyAI no devolvió un ID de transcripción" }, { status: 502 });
  }

  console.log(`[diarize] transcript submitted — id=${transcriptId}`);

  // Step 2: Poll until status === "completed" or "error"
  // 200 polls × 3s = 600s = 10 minutes
  const POLL_INTERVAL_MS = 3000;
  const MAX_POLLS = 200;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript/${transcriptId}`, {
      headers: { "authorization": apiKey },
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      console.error(`[diarize] poll failed (${pollRes.status}): ${err}`);
      return NextResponse.json({ error: `AssemblyAI poll failed (${pollRes.status}): ${err}` }, { status: 502 });
    }

    const pollData = await pollRes.json();
    const status: string = pollData.status;

    console.log(`[diarize] poll ${i + 1}/${MAX_POLLS} — status=${status}`);

    if (status === "error") {
      console.error("[diarize] AssemblyAI error:", pollData.error);
      return NextResponse.json({ error: `AssemblyAI error: ${pollData.error ?? "unknown"}` }, { status: 502 });
    }

    if (status === "completed") {
      // Step 3: Read utterances[] — speaker-diarized segments
      // Each utterance: { speaker: "A"|"B"|"C", text, start, end }
      const rawUtterances = pollData.utterances;

      if (!rawUtterances || !Array.isArray(rawUtterances) || rawUtterances.length === 0) {
        // Log full response to help diagnose why utterances is missing
        console.warn("[diarize] utterances empty or missing — full AssemblyAI response:");
        console.warn(JSON.stringify({
          status: pollData.status,
          speaker_labels: pollData.speaker_labels,
          utterances: pollData.utterances,
          words_count: pollData.words?.length ?? 0,
          text_length: pollData.text?.length ?? 0,
          audio_duration: pollData.audio_duration,
          error: pollData.error,
        }, null, 2));

        // Fallback: single speaker with full text
        const text: string = pollData.text ?? "";
        return NextResponse.json({
          utterances: [{ speaker: "A", text, start: 0, end: 0 }],
          speakerCount: 1,
          speakersDetected: 1,
          transcriptId,
        });
      }

      const utterances: AssemblyAIUtterance[] = rawUtterances.map((u: {
        speaker: string; text: string; start: number; end: number; confidence?: number;
      }) => ({
        speaker: u.speaker,   // "A", "B", "C"...
        text: u.text,
        start: u.start,
        end: u.end,
        confidence: u.confidence,
      }));

      const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))].sort();
      const speakerCount = uniqueSpeakers.length;

      console.log(`[diarize] completed — ${utterances.length} utterances, ${speakerCount} speakers: ${uniqueSpeakers.join(", ")}`);

      return NextResponse.json({
        utterances,
        speakerCount,            // número de hablantes únicos detectados
        speakersDetected: speakerCount,  // alias for backwards compat
        transcriptId,
      });
    }

    // status is "queued" or "processing" — keep polling
  }

  console.error(`[diarize] timeout after ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s — transcript=${transcriptId}`);
  return NextResponse.json({ error: "AssemblyAI tardó demasiado. Intenta con un audio más corto." }, { status: 504 });
}
