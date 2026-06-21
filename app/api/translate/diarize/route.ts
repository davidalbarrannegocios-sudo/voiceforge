import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // AssemblyAI can take up to 5 min

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
  if (!apiKey) return NextResponse.json({ error: "ASSEMBLYAI_API_KEY no configurada" }, { status: 500 });

  const publicAudioBase = process.env.HETZNER_AUDIO_PUBLIC_URL ?? "https://elitelabs-audio.fsn1.your-objectstorage.com";

  let body: { fileKey: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { fileKey } = body;
  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

  // Build the public URL that AssemblyAI will fetch
  const audioUrl = `${publicAudioBase}/${fileKey}`;

  // Step 1: Submit transcript request with speaker_labels: true
  const submitRes = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      // Let AssemblyAI detect the number of speakers automatically
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    return NextResponse.json({ error: `AssemblyAI submit failed (${submitRes.status}): ${err}` }, { status: 502 });
  }

  const submitData = await submitRes.json();
  const transcriptId: string = submitData.id;
  if (!transcriptId) {
    return NextResponse.json({ error: "AssemblyAI no devolvió un ID de transcripción" }, { status: 502 });
  }

  console.log(`[diarize] submitted transcript ${transcriptId} for key=${fileKey} url=${audioUrl}`);

  // Step 2: Poll until status === "completed" or "error"
  const POLL_INTERVAL_MS = 3000;
  const MAX_POLLS = 100; // 5 minutes max (100 × 3s)

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript/${transcriptId}`, {
      headers: { Authorization: apiKey },
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      return NextResponse.json({ error: `AssemblyAI poll failed (${pollRes.status}): ${err}` }, { status: 502 });
    }

    const pollData = await pollRes.json();
    const status: string = pollData.status;

    console.log(`[diarize] poll ${i + 1}/${MAX_POLLS} — status=${status}`);

    if (status === "error") {
      return NextResponse.json({ error: `AssemblyAI error: ${pollData.error ?? "unknown"}` }, { status: 502 });
    }

    if (status === "completed") {
      // Read utterances[] — this is the speaker-diarized data
      const rawUtterances: Array<{
        speaker: string;
        text: string;
        start: number;
        end: number;
        confidence?: number;
      }> = pollData.utterances ?? [];

      if (!rawUtterances.length) {
        // Fallback: no utterances means no speaker detection; return as single speaker
        const text: string = pollData.text ?? "";
        return NextResponse.json({
          utterances: [{ speaker: "A", text, start: 0, end: 0 }],
          speakersDetected: 1,
          transcriptId,
        });
      }

      const utterances: AssemblyAIUtterance[] = rawUtterances.map(u => ({
        speaker: u.speaker,   // "A", "B", "C"...
        text: u.text,
        start: u.start,
        end: u.end,
        confidence: u.confidence,
      }));

      const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];

      console.log(`[diarize] completed — ${utterances.length} utterances, ${uniqueSpeakers.length} speakers: ${uniqueSpeakers.join(", ")}`);

      return NextResponse.json({
        utterances,
        speakersDetected: uniqueSpeakers.length,
        transcriptId,
      });
    }

    // status is "queued" or "processing" — keep polling
  }

  return NextResponse.json({ error: "AssemblyAI tardó demasiado en responder. Intenta con un audio más corto." }, { status: 504 });
}
