import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const S2_SYSTEM = `Eres un experto en síntesis de voz con IA. Tu tarea es añadir etiquetas de emoción a un texto para Fish Audio S2, usando la sintaxis de corchetes: [etiqueta].

Etiquetas disponibles:
[angry] [sad] [embarrassed] [emphasis] [whispering] [soft] [breathy] [excited] [surprised] [shouting] [laughing] [chuckling] [sighing] [panting] [sobbing] [clear throat] [pause] [long pause]

REGLAS (síguela AL PIE DE LA LETRA):
1. Las etiquetas pueden ir al INICIO de cualquier frase o oración dentro de un párrafo, no solo al inicio del párrafo completo. Trata cada oración que termina en punto como una unidad independiente que puede recibir una etiqueta.
2. Después de la etiqueta SIEMPRE hay un espacio antes del texto: [excited] Hola mundo ✓ — [excited]Hola mundo ✗
3. Máximo UNA etiqueta por oración o frase.
4. Etiqueta entre el 50 % y el 60 % de las oraciones del texto total — distribúyelas por todo el texto, no solo al inicio de párrafos. Incluye oraciones en medio y al final de párrafos.
5. Mantén el texto original exactamente igual; solo añade etiquetas al inicio de las oraciones seleccionadas.
6. Varía las etiquetas: no uses la misma etiqueta más de 3 veces seguidas. Alterna entre [excited], [emphasis], [soft], [sighing], [whispering], [breathy] según el tono emocional de cada oración.
7. Responde ÚNICAMENTE con el texto modificado, sin explicaciones ni comentarios.

EJEMPLOS:
CORRECTO:
[excited] ¡Bienvenidos al show de hoy!
Hoy vamos a hablar de algo muy especial.
[soft] Pero primero, un momento de reflexión.

INCORRECTO:
[excited][soft] ¡Bienvenidos! — (dos etiquetas)
¡Bienvenidos [excited] al show! — (etiqueta en medio)
[excited]¡Bienvenidos! — (sin espacio tras etiqueta)`;

const S1_SYSTEM = `Eres un experto en síntesis de voz con IA. Tu tarea es añadir etiquetas de emoción y efectos de audio al texto, usando ÚNICAMENTE la sintaxis de paréntesis de Fish Audio S1: (etiqueta).

Etiquetas disponibles:
- Emociones básicas: (happy) (sad) (angry) (excited) (calm) (nervous) (confident) (surprised) (satisfied) (delighted) (scared) (worried) (upset) (frustrated) (embarrassed) (empathetic) (disgusted) (moved) (proud) (relaxed) (grateful) (curious) (sarcastic)
- Emociones avanzadas: (disdainful) (unhappy) (anxious) (hysterical) (indifferent) (confused) (disappointed) (regretful) (guilty) (hopeful) (optimistic) (pessimistic) (nostalgic) (lonely) (bored) (contemptuous) (sympathetic) (determined)
- Tono: (shouting) (screaming) (whispering) (soft tone) (in a hurry tone)
- Efectos de audio: (laughing) (chuckling) (sobbing) (crying loudly) (sighing) (groaning) (panting) (gasping) (yawning)
- Efectos especiales: (audience laughing) (background laughter) (crowd laughing) (break) (long-break)

REGLAS ESTRICTAS:
1. Las etiquetas van SIEMPRE al INICIO de la frase, nunca en medio
2. Se pueden combinar máx 2: (sad)(whispering) Texto aquí
3. Etiqueta entre el 50 % y el 60 % de las frases — prioriza las que tengan carga emocional pero incluye también frases narrativas con contexto descriptivo.
4. Mantén el texto original exactamente igual, solo añade etiquetas al inicio de frases seleccionadas
5. Responde SOLO con el texto modificado, sin explicaciones ni comentarios`;

const MAX_CHUNK = 5000;

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n+/);
  let current = "";

  const flush = () => {
    if (current.trim()) { chunks.push(current.trim()); current = ""; }
  };

  for (const para of paragraphs) {
    if (para.length > MAX_CHUNK) {
      // Large paragraph: split at sentence boundaries
      flush();
      // Split on sentence-ending punctuation followed by space or end
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentBuf = "";
      for (const s of sentences) {
        if (s.length > MAX_CHUNK) {
          // Single sentence too long: hard split by chars
          if (sentBuf) { chunks.push(sentBuf.trim()); sentBuf = ""; }
          for (let i = 0; i < s.length; i += MAX_CHUNK) {
            chunks.push(s.slice(i, i + MAX_CHUNK));
          }
        } else if (sentBuf && (sentBuf + " " + s).length > MAX_CHUNK) {
          chunks.push(sentBuf.trim());
          sentBuf = s;
        } else {
          sentBuf = sentBuf ? sentBuf + " " + s : s;
        }
      }
      if (sentBuf.trim()) current = sentBuf;
    } else {
      const tentative = current ? current + "\n" + para : para;
      if (tentative.length > MAX_CHUNK && current) {
        flush();
        current = para;
      } else {
        current = tentative;
      }
    }
  }
  flush();
  return chunks;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, model } = await req.json() as { text?: string; model?: string };
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  console.log("[auto-tag] input chars:", text.length, "model:", model);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const isS2 = model !== "speech-1.5";

  try {
    const chunks = splitIntoChunks(text);
    console.log("[auto-tag] chunks:", chunks.length, "sizes:", chunks.map(c => c.length));

    const taggedChunks: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8096,
        system: isS2 ? S2_SYSTEM : S1_SYSTEM,
        messages: [{ role: "user", content: chunk }],
      });
      const raw = response.content[0].type === "text" ? response.content[0].text : chunk;

      // Safety: if model returned significantly less than input, use original chunk
      if (raw.length < chunk.length * 0.9) {
        console.warn(`[auto-tag] chunk ${i + 1}/${chunks.length}: output (${raw.length}) shorter than input (${chunk.length}) — using original`);
        taggedChunks.push(chunk);
      } else {
        taggedChunks.push(raw);
      }
    }

    const joined = taggedChunks.join("\n\n");
    const taggedText = joined
      .replace(/^(\[[^\]]+\])([^\s])/gm, "$1 $2")
      .replace(/^(\([^)]+\))([^\s])/gm, "$1 $2")
      .trim();

    console.log("[auto-tag] input chars:", text.length, "output chars:", taggedText.length);

    return NextResponse.json({ taggedText });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[auto-tag] error:", errMsg);
    return NextResponse.json({ error: `Failed to auto-tag: ${errMsg}` }, { status: 500 });
  }
}
