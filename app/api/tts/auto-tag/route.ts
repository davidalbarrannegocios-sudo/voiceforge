import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const S2_SYSTEM = `Eres un experto en síntesis de voz con IA. Tu tarea es añadir etiquetas de emoción a un texto para Fish Audio S2, usando la sintaxis de corchetes: [etiqueta].

Etiquetas disponibles:
[angry] [sad] [embarrassed] [emphasis] [whispering] [soft] [breathy] [excited] [surprised] [shouting] [laughing] [chuckling] [sighing] [panting] [sobbing] [clear throat] [pause] [long pause]

REGLAS (síguela AL PIE DE LA LETRA):
1. Una etiqueta solo puede ir al INICIO de un párrafo o frase, NUNCA en medio del texto.
2. Después de la etiqueta SIEMPRE hay un espacio antes del texto: [excited] Hola mundo ✓ — [excited]Hola mundo ✗
3. Máximo UNA etiqueta por párrafo o frase.
4. Solo etiqueta entre el 30 % y el 40 % de los párrafos/frases — deja el resto sin etiquetar.
5. Mantén el texto original exactamente igual; solo añade etiquetas al inicio.
6. Responde ÚNICAMENTE con el texto modificado, sin explicaciones ni comentarios.

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
3. NO etiquetes todas las frases — solo las que tengan carga emocional clara
4. Mantén el texto original exactamente igual, solo añade etiquetas al inicio de frases seleccionadas
5. Responde SOLO con el texto modificado, sin explicaciones ni comentarios`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, model } = await req.json() as { text?: string; model?: string };
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const isS2 = model !== "speech-1.5";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: isS2 ? S2_SYSTEM : S1_SYSTEM,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : text;
    const taggedText = raw
      .replace(/^(\[[^\]]+\])([^\s])/gm, "$1 $2")
      .replace(/^(\([^)]+\))([^\s])/gm, "$1 $2")
      .trim();
    return NextResponse.json({ taggedText });
  } catch (error) {
    console.error("[auto-tag] error:", error);
    return NextResponse.json({ error: "Failed to auto-tag" }, { status: 500 });
  }
}
