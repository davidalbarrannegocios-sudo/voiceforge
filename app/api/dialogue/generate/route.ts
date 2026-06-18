import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { fishAudioGenerateBuffer } from '@/lib/fishaudio'
import { log } from '@/lib/logger'
import { uploadToR2 } from '@/lib/r2'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

// No maxDuration — returns immediately with jobId; generation runs as background task
export const runtime = 'nodejs'

interface DialogueLineInput {
  text: string
  voiceId: string
  model: 'elite-pro' | 'elite-legacy' | 'elite-turbo'
  characterName: string
}

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

async function processDialogueInBackground(
  jobId: string,
  userId: string,
  lines: DialogueLineInput[],
  outputFormat: 'mp3' | 'wav',
  pauseBetweenLines: number,
  fromPlan: number,
  fromExtra: number,
  plan: string,
  sessionId: string,
) {
  await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } })

  const audioPaths: string[] = []
  let silencePath: string | null = null
  let listPath: string | null = null
  let outputPath: string | null = null

  try {
    const ext = outputFormat === 'wav' ? 'wav' : 'mp3'

    // Pre-generate silence chunk if needed
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
      console.log(`[dialogue] bg line ${i + 1}/${lines.length} jobId=${jobId}`)
      const audioBuffer = await generateLineAudio(line)
      const chunkPath = join('/tmp', `${sessionId}_chunk_${String(i).padStart(3, '0')}.mp3`)
      await writeFile(chunkPath, audioBuffer)
      audioPaths.push(chunkPath)
    }

    // Build concat list, interleaving silence
    const concatEntries: string[] = []
    for (let i = 0; i < audioPaths.length; i++) {
      concatEntries.push(`file '${audioPaths[i]}'`)
      if (silencePath && i < audioPaths.length - 1) {
        concatEntries.push(`file '${silencePath}'`)
      }
    }

    listPath = join('/tmp', `${sessionId}_list.txt`)
    await writeFile(listPath, concatEntries.join('\n'))

    outputPath = join('/tmp', `${sessionId}_output.${ext}`)

    const ffmpegArgs = ['-f', 'concat', '-safe', '0', '-i', listPath]
    if (outputFormat === 'wav') {
      ffmpegArgs.push('-c:a', 'pcm_s16le', '-ar', '44100')
    } else {
      ffmpegArgs.push('-c:a', 'libmp3lame', '-q:a', '2')
    }
    ffmpegArgs.push(outputPath, '-y')
    await execFileAsync('ffmpeg', ffmpegArgs)

    const outputBuffer = await readFile(outputPath)
    const contentType = outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg'
    const r2Key = `dialogues/${userId}/${sessionId}.${ext}`
    const audioUrl = await uploadToR2(r2Key, outputBuffer, contentType)

    const charNames = [...new Set(lines.map(l => l.characterName))].join(', ')
    const dialogueText = lines.map(l => `(${l.characterName}) ${l.text}`).join('\n')
    const totalChars = fromPlan + fromExtra
    const expiresAt = getExpiresAt(plan)

    await prisma.$transaction([
      prisma.job.update({
        where: { id: jobId },
        data: { status: 'done', audioUrl },
      }),
      prisma.generation.create({
        data: {
          userId,
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

    log('info', 'credits', 'credits deducted', {
      userId, chars: totalChars, creditsUsed: totalChars,
      voiceName: `Diálogo (${charNames})`, plan,
    }, userId)
    console.log(`[dialogue] bg done jobId=${jobId}`)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[dialogue] bg error jobId=${jobId}:`, errMsg)

    await prisma.$transaction([
      prisma.job.update({ where: { id: jobId }, data: { status: 'error', error: errMsg } }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: fromPlan }, extraCredits: { increment: fromExtra } },
      }),
    ])
    log('info', 'credits', 'credits refunded — dialogue error', {
      userId, creditsRefunded: fromPlan + fromExtra, fromPlan, fromExtra, jobId,
    }, userId)
  } finally {
    // Cleanup tmp files (non-blocking)
    const cleanupPaths = [...audioPaths]
    if (silencePath) cleanupPaths.push(silencePath)
    if (listPath)    cleanupPaths.push(listPath)
    if (outputPath)  cleanupPaths.push(outputPath)
    Promise.all(cleanupPaths.map(p => unlink(p).catch(() => {})))
  }
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

  // ── Preview: synchronous, no credit charge, no DB save ──────────────────────
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

  // ── Validate all voiceIds ────────────────────────────────────────────────────
  for (const line of lines) {
    if (!line.voiceId || line.voiceId.trim() === '') {
      return NextResponse.json({
        error: `Voz no asignada para el personaje: ${line.characterName}`,
      }, { status: 400 })
    }
  }

  const filteredLines = lines.filter(l => l.text.trim())
  if (!filteredLines.length) return NextResponse.json({ error: 'No lines with text' }, { status: 400 })

  // ── Credit check ─────────────────────────────────────────────────────────────
  const totalChars = filteredLines.reduce((sum, l) => sum + l.text.length, 0)
  const totalAvailable = dbUser.credits + dbUser.extraCredits
  if (totalAvailable < totalChars) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }
  const fromPlan  = Math.min(dbUser.credits, totalChars)
  const fromExtra = totalChars - fromPlan

  // ── Deduct credits + create Job atomically ───────────────────────────────────
  const charNames    = [...new Set(filteredLines.map(l => l.characterName))].join(', ')
  const dialogueText = filteredLines.map(l => `(${l.characterName}) ${l.text}`).join('\n')

  const [, job] = await prisma.$transaction([
    prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: fromPlan }, extraCredits: { decrement: fromExtra } },
    }),
    prisma.job.create({
      data: {
        userId:     dbUser.id,
        status:     'pending',
        text:       dialogueText,
        voiceId:    filteredLines[0].voiceId,
        voiceName:  `Diálogo (${charNames})`,
        creditsUsed: totalChars,
        expiresAt:  getExpiresAt(dbUser.plan),
      },
    }),
  ])

  console.log(`[dialogue] created jobId=${job.id} lines=${filteredLines.length} chars=${totalChars}`)

  // ── Fire and forget ──────────────────────────────────────────────────────────
  processDialogueInBackground(
    job.id, dbUser.id, filteredLines, outputFormat, pauseBetweenLines,
    fromPlan, fromExtra, dbUser.plan, randomUUID(),
  ).catch(err => console.error('[dialogue] unhandled bg error:', err))

  return NextResponse.json({
    jobId: job.id,
    creditsUsed: totalChars,
    creditsRemaining: totalAvailable - totalChars,
  })
}
