import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { ELITE_TEXT_PLANS } from "@/lib/elite-text";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un experto en creación de guiones para podcasts, vídeos de YouTube y contenido de audio.
Generas guiones naturales, entretenidos y bien estructurados, optimizados para ser narrados con síntesis de voz.

Reglas:
- Escribe en el idioma en que el usuario te escriba
- El texto debe fluir de forma natural al ser leído en voz alta
- Evita caracteres especiales que dificulten la narración (*, #, emojis, etc.)
- Usa puntuación clara para guiar el ritmo (comas, puntos, puntos suspensivos)
- No incluyas etiquetas de escena, acotaciones ni metadatos
- Responde ÚNICAMENTE con el guion, sin introducción ni conclusión tuya`;

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { prompt, maxTokens = 4096 } = (await req.json()) as {
    prompt: string;
    maxTokens?: number;
  };

  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const eliteText = await prisma.eliteTextPlan.findUnique({ where: { userId: user.id } });
  if (!eliteText || eliteText.status !== "active") {
    return NextResponse.json({ error: "No tienes un plan Elite Text activo" }, { status: 403 });
  }

  const tokensAvailable = eliteText.tokensTotal - eliteText.tokensUsed;
  if (tokensAvailable <= 0) {
    return NextResponse.json({ error: "Has agotado tus tokens este mes" }, { status: 402 });
  }

  const safeMaxTokens = Math.min(maxTokens, tokensAvailable, 8192);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let inputTokens = 0;
        let outputTokens = 0;

        const msgStream = anthropic.messages.stream({
          model: ELITE_TEXT_PLANS[eliteText.plan as keyof typeof ELITE_TEXT_PLANS]?.model ?? "claude-sonnet-4-5",
          max_tokens: safeMaxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        msgStream.on("text", (text) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
        });

        const finalMsg = await msgStream.finalMessage();
        inputTokens = finalMsg.usage.input_tokens;
        outputTokens = finalMsg.usage.output_tokens;
        const tokensUsed = inputTokens + outputTokens;

        await prisma.eliteTextPlan.update({
          where: { userId: user.id },
          data: { tokensUsed: { increment: tokensUsed } },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", tokensUsed, tokensAvailable: tokensAvailable - tokensUsed })}\n\n`)
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
