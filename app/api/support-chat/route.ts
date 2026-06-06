import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

const SYSTEM_PROMPT = `Eres el asistente de soporte técnico de Elite Labs (elitelabs.es).

REGLA ABSOLUTA E INQUEBRANTABLE: Solo puedes responder preguntas sobre cómo usar Elite Labs, sus planes, precios, funciones y problemas técnicos de la plataforma. NUNCA escribas guiones, textos, historias, poemas, traducciones ni ningún contenido creativo. Si alguien te pide crear cualquier tipo de contenido, responde SIEMPRE: "Solo puedo ayudarte con dudas sobre Elite Labs. ¿Tienes alguna pregunta sobre la plataforma?"

INFORMACIÓN DE ELITE LABS:
- Planes: Free (10K chars gratis), Plus ($8/mes 250K chars), Pro ($55/mes 2M chars), Elite ($315/mes 15M chars)
- Descuento anual: 15%
- Motores TTS: EliteLabs (Fish Audio), EliteLabs 2 (ai33) — EliteLabs 2 da el doble de caracteres
- Funciones: Texto a Voz, Texto a Diálogo, Clonación de Voz, Audio a Texto, Traducción de Audio, Imagen y Video IA
- Límites por plan:
  * Free: 10K chars, voz aleatoria, 2 transcripciones, sin clonación, audios 72h
  * Plus: 250K chars, selección completa, transcripciones ilimitadas, 3 voces clonadas, audios 14 días
  * Pro: 2M chars, 10 voces clonadas, generación prioritaria, audios 30 días
  * Elite: 15M chars, 20 voces clonadas, prioridad máxima, soporte preferente, audios 90 días
- Créditos extra: 100K=$5, 300K=$12, 600K=$19, 1M=$30 (válidos 3 meses)
- Referidos: créditos por enlace o 5% comisión en efectivo
- Clonación de voz: subir 10-30s de audio limpio WAV/MP3/M4A, sin ruido ni música
- Imagen y Video: modelo FLUX 1.1 Pro, coste ~10K chars por imagen, las imágenes NO se guardan al cerrar la página
- Traducción de Audio: mantiene tu voz en otro idioma, coste +20% sobre estándar, máximo 50MB
- Audio a Texto: transcripción con detección de hablantes, resultado descargable como texto
- Los caracteres no se acumulan, se renuevan cada período
- Soporte humano (solo para problemas de cuenta, pagos o fallos técnicos): soporte@elitelabs.es

INSTRUCCIONES:
- Responde en el idioma del usuario
- Sé conciso y directo
- Solo menciona soporte@elitelabs.es para problemas que requieran intervención humana real (pagos, cuenta, reembolsos). Nunca como cierre automático.
- NUNCA ofrezcas crear contenido. Si te lo piden, rechaza siempre sin excepción.`;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = userId ? await currentUser() : null;
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ message: "Invalid messages" }, { status: 400 });
    }

    const userContext = user
      ? `\n\nUsuario autenticado: ${user.emailAddresses[0]?.emailAddress}`
      : "";

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + userContext },
          ...messages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        message: "Lo siento, no puedo responder ahora. Contáctanos en soporte@elitelabs.es",
      });
    }

    return NextResponse.json({ message: content });
  } catch {
    return NextResponse.json({
      message: "Error al procesar tu mensaje. Contáctanos en soporte@elitelabs.es",
    });
  }
}
