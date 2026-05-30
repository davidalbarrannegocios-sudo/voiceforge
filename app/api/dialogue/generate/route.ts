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

async function generateLineAudio(line: DialogueLineInput): Promise<Buffer> {
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
    return Buffer.from(await res.arrayBuffer())
  }

  const fishModel = line.model === 'elite-legacy' ? 'speech-1.5' : 'speech-1.6'
  const validVoiceId = (line.voiceId && line.voiceId !== 'default') ? line.voiceId : undefined
  return fishAudioGenerateBuffer({ text: line.text, referenceId: validVoiceId, model: fishModel })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findFirst({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { lines, preview, outputFormat = 'mp3', pauseBetweenLines = 0 }: {
    lines: DialogueLineInput[]
    preview?: boolean
    outputFormat?: 'mp3' | 'wav'
    pauseBetweenLines?: number
  } = await req.json()

  if (!lines?.length) return NextResponse.json({ error: 'No lines' }, { status: 400 })

  // Preview: generate one line, no credit charge, no DB save
  if (preview) {
    const line = lines[0]
    if (!line.voiceId?.trim()) {
      return NextResponse.json({ error: 'No voice assigned' }, { status: 400 })
    }
    const sessionId = randomUUID()
    try {
      const audioBuffer = await generateLineAudio(line)
      const r2Key = `previews/${dbUser.id}/${sessionId}.mp3`
      const audioUrl = await uploadToR2(r2Key, audioBuffer, 'audio/mpeg')
      return NextResponse.json({ audioUrl })
    } catch (err: unknown) {
      const e = err as { message?: string }
      return NextResponse.json({ error: e?.message ?? 'Preview failed' }, { status: 500 })
    }
  }

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
  const ext = outputFormat === 'wav' ? 'wav' : 'mp3'

  console.log('[dialogue] Starting generation:', { lines: lines.length, totalChars, outputFormat, pauseBetweenLines })

  try {
    // Pre-generate silence chunk if needed
    let silencePath: string | null = null
    if (pauseBetweenLines > 0 && lines.length > 1) {
      silencePath = join('/tmp', `${sessionId}_silence.mp3`)
      const pauseSecs = (pauseBetweenLines / 1000).toFixed(3)
      await execFileAsync('ffmpeg', [
        '-f', 'lavfi',
        '-i', `anullsrc=r=44100:cl=mono`,
        '-t', pauseSecs,
        '-c:a', 'libmp3lame', '-q:a', '4',
        silencePath, '-y',
      ])
    }

    // Generate each line sequentially
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      console.log(`[dialogue] Generating line ${i + 1}/${lines.length}:`, {
        model: line.model, voiceId: line.voiceId, chars: line.text.length,
      })
      const audioBuffer = await generateLineAudio(line)
      const chunkPath = join('/tmp', `${sessionId}_chunk_${String(i).padStart(3, '0')}.mp3`)
      await writeFile(chunkPath, audioBuffer)
      audioPaths.push(chunkPath)
    }

    // Build concat list, interleaving silence between lines
    const concatEntries: string[] = []
    for (let i = 0; i < audioPaths.length; i++) {
      concatEntries.push(`file '${audioPaths[i]}'`)
      if (silencePath && i < audioPaths.length - 1) {
        concatEntries.push(`file '${silencePath}'`)
      }
    }

    const listPath = join('/tmp', `${sessionId}_list.txt`)
    await writeFile(listPath, concatEntries.join('\n'))

    const outputPath = join('/tmp', `${sessionId}_output.${ext}`)
    console.log('[dialogue] Starting ffmpeg concat, entries:', concatEntries.length)

    const ffmpegArgs = [
      '-f', 'concat', '-safe', '0',
      '-i', listPath,
    ]
    if (outputFormat === 'wav') {
      ffmpegArgs.push('-c:a', 'pcm_s16le', '-ar', '44100')
    } else {
      ffmpegArgs.push('-c:a', 'libmp3lame', '-q:a', '2')
    }
    ffmpegArgs.push(outputPath, '-y')

    await execFileAsync('ffmpeg', ffmpegArgs)

    const outputBuffer = await readFile(outputPath)
    console.log('[dialogue] ffmpeg done, output size:', outputBuffer.length)

    const contentType = outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg'
    const r2Key = `dialogues/${dbUser.id}/${sessionId}.${ext}`
    const audioUrl = await uploadToR2(r2Key, outputBuffer, contentType)

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
    const cleanupPaths = [...audioPaths, listPath, outputPath]
    if (silencePath) cleanupPaths.push(silencePath)
    Promise.all(cleanupPaths.map(p => unlink(p).catch(() => {})))

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
