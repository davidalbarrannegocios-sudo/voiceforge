import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { fishAudioGenerateBuffer } from '@/lib/fishaudio'
import { uploadToR2 } from '@/lib/r2'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

interface DialogueLineInput {
  text: string
  voiceId: string
  model: 'elite-pro' | 'elite-legacy' | 'elite-turbo'
  characterName: string
}

export const maxDuration = 300
export const runtime = 'nodejs'

function getExpiresAt(plan: string): Date {
  const now = new Date()
  if (plan === 'free')       return new Date(now.getTime() + 72 * 60 * 60 * 1000)
  if (plan === 'starter')    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  if (plan === 'enterprise') return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findFirst({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { lines }: { lines: DialogueLineInput[] } = await req.json()
  if (!lines?.length) return NextResponse.json({ error: 'No lines' }, { status: 400 })

  // Validate all voiceIds before starting generation
  for (const line of lines) {
    if (!line.voiceId || line.voiceId.trim() === '') {
      return NextResponse.json({
        error: `Voz no asignada para el personaje: ${line.characterName}`,
      }, { status: 400 })
    }
  }

  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0)
  if (dbUser.credits < totalChars) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  const sessionId = randomUUID()
  const audioPaths: string[] = []

  console.log('[dialogue] Starting generation:', { lines: lines.length, totalChars, userId: dbUser.id })

  try {
    // Generate each line sequentially to preserve order
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      console.log(`[dialogue] Generating line ${i + 1}/${lines.length}:`, {
        model: line.model, voiceId: line.voiceId, chars: line.text.length,
      })

      let audioBuffer: Buffer

      if (line.model === 'elite-turbo' && process.env.AI33_BASE_URL && process.env.AI33_API_KEY) {
        const res = await fetch(`${process.env.AI33_BASE_URL}/v1/text-to-speech/${line.voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.AI33_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: line.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        })
        audioBuffer = Buffer.from(await res.arrayBuffer())
      } else {
        const fishModel = line.model === 'elite-legacy' ? 'speech-1.5' : 'speech-1.6'
        const validVoiceId = (line.voiceId && line.voiceId !== 'default')
          ? line.voiceId
          : undefined

        audioBuffer = await fishAudioGenerateBuffer({
          text: line.text,
          referenceId: validVoiceId,
          model: fishModel,
        })
      }

      console.log(`[dialogue] Line ${i + 1} done, buffer size:`, audioBuffer.length)

      const chunkPath = join('/tmp', `${sessionId}_chunk_${String(i).padStart(3, '0')}.mp3`)
      await writeFile(chunkPath, audioBuffer)
      audioPaths.push(chunkPath)
    }

    // Concatenate with ffmpeg (re-encode to avoid header incompatibility issues)
    const listPath = join('/tmp', `${sessionId}_list.txt`)
    const listContent = audioPaths.map(p => `file '${p}'`).join('\n')
    await writeFile(listPath, listContent)

    const outputPath = join('/tmp', `${sessionId}_output.mp3`)
    console.log('[dialogue] Starting ffmpeg concat, files:', audioPaths.length)

    await execFileAsync('ffmpeg', [
      '-f', 'concat', '-safe', '0',
      '-i', listPath,
      '-c:a', 'libmp3lame', '-q:a', '2',
      outputPath, '-y',
    ])

    const outputBuffer = await readFile(outputPath)
    console.log('[dialogue] ffmpeg done, output size:', outputBuffer.length)

    const r2Key = `dialogues/${dbUser.id}/${sessionId}.mp3`
    console.log('[dialogue] Uploading to R2:', r2Key)
    const audioUrl = await uploadToR2(r2Key, outputBuffer, 'audio/mpeg')

    const charNames = [...new Set(lines.map(l => l.characterName))].join(', ')
    const dialogueText = lines.map(l => `(${l.characterName}) ${l.text}`).join('\n')
    const expiresAt = getExpiresAt(dbUser.plan)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: { credits: { decrement: totalChars } },
      }),
      prisma.generation.create({
        data: {
          userId: dbUser.id,
          status: 'done',
          text: dialogueText,
          voiceId: lines[0].voiceId,
          voiceName: `Diálogo (${charNames})`,
          creditsUsed: totalChars,
          audioUrl,
          expiresAt,
        },
      }),
    ])

    // Cleanup tmp files (non-blocking)
    Promise.all([
      ...audioPaths.map(p => unlink(p).catch(() => {})),
      unlink(listPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])

    return NextResponse.json({
      audioUrl,
      creditsRemaining: dbUser.credits - totalChars,
    })
  } catch (err: unknown) {
    await Promise.all(audioPaths.map(p => unlink(p).catch(() => {})))
    const e = err as { message?: string; stack?: string }
    console.error('[dialogue] ERROR:', {
      message: e?.message,
      stack: e?.stack?.split('\n').slice(0, 5),
    })
    return NextResponse.json({
      error: e?.message ?? 'Generation failed',
    }, { status: 500 })
  }
}
