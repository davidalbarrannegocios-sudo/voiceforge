import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const S2_SYSTEM = `Eres un experto en dirección de actores de doblaje y síntesis de voz con IA. Tu tarea es analizar el contenido emocional y narrativo de cada oración y añadir la etiqueta más apropiada usando la sintaxis de corchetes: [etiqueta].

CATÁLOGO COMPLETO DE ETIQUETAS:

TONO EMOCIONAL:
[angry] — ira, enfado, indignación
[sad] — tristeza, melancolía, pena
[embarrassed] — vergüenza, incomodidad
[emphasis] — énfasis, importancia, destacar algo
[whispering] — susurro, secreto, intimidad
[soft] — suavidad, ternura, delicadeza
[breathy] — voz entrecortada, agitación leve, sensualidad
[excited] — emoción, entusiasmo, alegría intensa

EFECTOS DE AUDIO:
[laughing] — risa abierta
[chuckling] — risita suave, risa contenida
[moaning] — queja, dolor leve o placer
[clear throat] — aclarar la garganta antes de hablar
[sobbing] — llanto con sollozos
[crying loudly] — llanto intenso
[sighing] — suspiro de alivio, cansancio o resignación
[panting] — jadeo, agitación física
[groaning] — gemido de esfuerzo o dolor
[crowd laughing] — risa de fondo de multitud
[background laughter] — risas de fondo
[audience laughing] — risa de audiencia/público
[pause] — pausa breve natural
[long pause] — pausa larga dramática

AVANZADAS:
[inhale] — inspiración audible antes de hablar
[exhale] — exhalación audible
[singing] — tono cantado o melodioso
[screaming] — grito de terror o desesperación
[shouting] — voz elevada, gritar con fuerza
[surprised] — sorpresa, asombro repentino
[shocked] — impacto, incredulidad
[volume up] — subir volumen gradualmente
[volume down] — bajar volumen gradualmente
[echo] — efecto de eco o reverb
[loud] — voz muy alta y potente
[low volume] — voz muy baja
[whisper] — susurro más pronunciado que whispering
[sigh] — suspiro simple
[short pause] — micropausa
[clearing throat] — carraspeo
[delight] — deleite, placer, satisfacción
[with strong accent] — acento marcado o exagerado

REGLAS (sígelas AL PIE DE LA LETRA):
1. Analiza el CONTENIDO SEMÁNTICO de cada oración: ¿qué emoción transmite? ¿qué está haciendo el personaje? ¿cuál es el contexto narrativo?
2. Las etiquetas van SIEMPRE al INICIO de la oración, nunca en medio ni al final.
3. Después de la etiqueta SIEMPRE hay un espacio: [excited] Texto ✓ — [excited]Texto ✗
4. Máximo UNA etiqueta por oración.
5. Etiqueta entre el 50% y el 65% de las oraciones, distribuidas por todo el texto de forma natural.
6. USA TODO EL CATÁLOGO — no te limites a 4 o 5 etiquetas. Elige la más precisa para cada momento.
7. Prioriza etiquetas de efectos ([sighing], [chuckling], [clear throat], [pause]) cuando la oración describe una acción física o pausa narrativa.
8. Usa [emphasis] para datos importantes, cifras, nombres propios relevantes o afirmaciones clave.
9. Usa [pause] o [short pause] antes de revelaciones o giros dramáticos.
10. Mantén el texto original exactamente igual; solo añade etiquetas al inicio de oraciones seleccionadas.
11. Responde ÚNICAMENTE con el texto modificado, sin explicaciones ni comentarios.

GUÍA DE ANÁLISIS:
- Oración con pregunta retórica o reflexión → [emphasis] o [soft]
- Oración que describe acción física intensa → [panting] o [shouting]
- Oración que revela información impactante → [shocked] o [surprised]
- Oración de despedida o cierre emocional → [sighing] o [soft]
- Oración de alerta o advertencia → [loud] o [emphasis]
- Oración de secreto o confesión → [whispering] o [whisper]
- Oración de alegría o celebración → [excited] o [delight]
- Oración de tristeza o pérdida → [sad] o [sobbing]
- Narración neutral pero importante → [emphasis]
- Pausa dramática entre ideas → [pause] o [short pause]

EJEMPLO:
[excited] ¡Bienvenidos al programa de hoy!
Vamos a repasar los eventos más importantes de la semana.
[emphasis] Pero primero, hay algo que deben saber.
[pause] Todo cambió en un instante.
[shocked] Nadie esperaba lo que ocurrió después.
[soft] Fue un momento que nadie olvidará.`;

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
