import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export interface AssemblyAIUtterance {
  speaker: string;  // "A", "B", "C"...
  text: string;
  start: number;   // milliseconds
  end: number;     // milliseconds
  confidence?: number;
}

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const aaiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!aaiKey) return NextResponse.json({ error: "ASSEMBLYAI_API_KEY no configurada" }, { status: 500 });

  const audioPublicUrl = process.env.HETZNER_AUDIO_PUBLIC_URL;
  if (!audioPublicUrl) return NextResponse.json({ error: "HETZNER_AUDIO_PUBLIC_URL no configurada" }, { status: 500 });

  let body: { fileKey: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { fileKey } = body;
  if (!fileKey) return NextResponse.json({ error: "fileKey requerido" }, { status: 400 });

  // Build public URL for AssemblyAI (must be publicly accessible)
  const audioUrl = `${audioPublicUrl}/${fileKey}`;

  try {
    // Submit transcription to AssemblyAI
    const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: aaiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        speakers_expected: null,  // auto-detect number of speakers
      }),
    });

    if (!submitRes.ok) {
      const err = await submitRes.text();
      return NextResponse.json(
        { error: `Error al enviar a AssemblyAI (${submitRes.status}): ${err}` },
        { status: 500 }
      );
    }

    const { id } = await submitRes.json();
    if (!id) return NextResponse.json({ error: "AssemblyAI no devolvió transcript ID" }, { status: 500 });

    console.log("[diarize] AssemblyAI transcript submitted:", id, "audio:", audioUrl);

    // Poll until completed (max 120s)
    const MAX_POLLS = 38; // 38 × 3s ≈ 114s
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { authorization: aaiKey },
      });

      if (!pollRes.ok) {
        console.warn("[diarize] poll", i + 1, "HTTP error:", pollRes.status);
        continue;
      }

      const transcript = await pollRes.json();
      console.log("[diarize] poll", i + 1, "status:", transcript.status);

      if (transcript.status === "error") {
        return NextResponse.json(
          { error: `Error en diarización: ${transcript.error ?? "desconocido"}` },
          { status: 500 }
        );
      }

      if (transcript.status === "completed") {
        const utterances: AssemblyAIUtterance[] = transcript.utterances ?? [];

        if (!utterances.length) {
          // No utterances — return full text as single speaker
          const text = transcript.text?.trim() ?? "";
          const fallback: AssemblyAIUtterance[] = text
            ? [{ speaker: "A", text, start: 0, end: 0 }]
            : [];
          return NextResponse.json({ utterances: fallback, speakersDetected: 1, transcriptId: id });
        }

        const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];
        console.log("[diarize] done, speakers:", uniqueSpeakers.length, "utterances:", utterances.length);

        return NextResponse.json({
          utterances,
          speakersDetected: uniqueSpeakers.length,
          transcriptId: id,
        });
      }
    }

    return NextResponse.json(
      { error: "Tiempo de espera excedido para diarización. El audio puede ser demasiado largo." },
      { status: 504 }
    );

  } catch (e) {
    console.error("[diarize] ERROR:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
