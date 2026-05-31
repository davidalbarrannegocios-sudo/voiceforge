'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Play, Pause, Download, Loader2, ChevronDown,
  Mic, X, Upload, MessageSquare, Plus, Music2,
} from 'lucide-react'
import { VoiceBrowser, SelectedVoice } from '@/app/dashboard/VoiceBrowser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Character {
  id: string
  name: string
  voiceId: string
  voiceName: string
  model: 'elite-pro' | 'elite-legacy' | 'elite-turbo'
  color: string
  speed: number
  volume: number
}

interface DialogueLine {
  characterId: string
  text: string
}

interface Voice {
  id: string
  name: string
  model?: string
}

interface GenerationEntry {
  url: string
  format: 'mp3' | 'wav'
  createdAt: number
}

const CHARACTER_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fb923c',
  '#a78bfa', '#fbbf24', '#f87171', '#38bdf8',
]

const LANG_MAP: Record<string, string> = {
  es: 'ES', en: 'EN', fr: 'FR', de: 'DE',
  it: 'IT', pt: 'PT', nl: 'NL', pl: 'PL',
  ru: 'RU', ja: 'JA', zh: 'ZH',
}

const DIALOGUE_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDialogueText(text: string): DialogueLine[] | null {
  const lines = text.split('\n').filter(l => l.trim())
  const result: DialogueLine[] = []
  const charPattern = /^\(([^)]+)\)\s*(.+)$/
  for (const line of lines) {
    const match = line.trim().match(charPattern)
    if (!match) return null
    result.push({ characterId: match[1].trim(), text: match[2].trim() })
  }
  return result.length > 0 ? result : null
}

function extractCharacters(lines: DialogueLine[]): string[] {
  const seen = new Set<string>()
  const chars: string[] = []
  for (const line of lines) {
    if (!seen.has(line.characterId)) { seen.add(line.characterId); chars.push(line.characterId) }
  }
  return chars
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userVoices: Voice[]
  plan: string
  credits: number
  onCreditsUpdate: (newCredits: number) => void
  language?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DialogueEditor({ userVoices, plan, credits, onCreditsUpdate, language }: Props) {
  // Script state
  const [rawText, setRawText] = useState('')
  const [parsedLines, setParsedLines] = useState<DialogueLine[] | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [selectingVoiceFor, setSelectingVoiceFor] = useState<string | null>(null)

  // Translation
  const [isTranslating, setIsTranslating] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationHistory, setGenerationHistory] = useState<GenerationEntry[]>([])

  // Settings
  const [pauseBetweenLines, setPauseBetweenLines] = useState(500)
  const [outputFormat, setOutputFormat] = useState<'mp3' | 'wav'>('mp3')

  // Audio player
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Preview
  const [previewAudio, setPreviewAudio] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Manual character
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCharName, setManualCharName] = useState('')

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<'script' | 'characters' | 'audio'>('script')

  const prevLanguage = useRef(language)

  // ─── Derived ────────────────────────────────────────────────────────────────

  const totalChars = parsedLines?.reduce((sum, l) => sum + l.text.length, 0) ?? 0
  const hasAllVoices = characters.length > 0 && characters.every(c => c.voiceId)
  const canGenerate = hasAllVoices && parsedLines && parsedLines.length > 0 && credits >= totalChars

  // ─── Script parsing ─────────────────────────────────────────────────────────

  const handleTextChange = useCallback((text: string) => {
    setRawText(text)
    setAudioUrl(null)
    setParseError(null)

    if (!text.trim()) { setParsedLines(null); setCharacters([]); return }

    const lines = parseDialogueText(text)
    if (!lines) {
      setParsedLines(null)
      if (text.includes('(') && text.includes(')')) {
        setParseError('Usa el formato: (Nombre) Texto de la línea')
      }
      return
    }

    setParsedLines(lines)
    const charNames = extractCharacters(lines)
    setCharacters(prev => {
      const existingMap = new Map(prev.map(c => [c.name, c]))
      return charNames.map((name, i) => {
        if (existingMap.has(name)) return existingMap.get(name)!
        return {
          id: `char_${i}_${Date.now()}`,
          name,
          voiceId: '',
          voiceName: 'Voz estándar',
          model: 'elite-pro' as const,
          color: CHARACTER_COLORS[i % CHARACTER_COLORS.length],
          speed: 1,
          volume: 1,
        }
      })
    })
  }, [])

  // ─── Translation ────────────────────────────────────────────────────────────

  const translateText = useCallback(async (targetLang: string) => {
    if (!rawText.trim() || !parsedLines) return
    setIsTranslating(true)
    try {
      const res = await fetch('/api/translate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, targetLang }),
      })
      const data = await res.json()
      if (data.translatedText) handleTextChange(data.translatedText)
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setIsTranslating(false)
    }
  }, [rawText, parsedLines, handleTextChange])

  useEffect(() => {
    if (language && language !== prevLanguage.current && rawText && parsedLines) {
      const deeplLang = LANG_MAP[language] ?? language.toUpperCase()
      translateText(deeplLang)
    }
    prevLanguage.current = language
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Character management ────────────────────────────────────────────────────

  function updateCharacter(id: string, updates: Partial<Character>) {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const assignVoice = useCallback((charName: string, voiceId: string, voiceName: string, model: Character['model']) => {
    setCharacters(prev => prev.map(c => c.name === charName ? { ...c, voiceId, voiceName, model } : c))
    setSelectingVoiceFor(null)
  }, [])

  function addManualCharacter() {
    const name = manualCharName.trim()
    if (!name || characters.some(c => c.name === name)) return
    setCharacters(prev => [...prev, {
      id: `char_manual_${Date.now()}`,
      name,
      voiceId: '',
      voiceName: 'Voz estándar',
      model: 'elite-pro' as const,
      color: CHARACTER_COLORS[prev.length % CHARACTER_COLORS.length],
      speed: 1,
      volume: 1,
    }])
    setManualCharName('')
    setShowManualInput(false)
  }

  // ─── Preview single line ─────────────────────────────────────────────────────

  async function handlePreviewLine(line: DialogueLine, char?: Character) {
    if (!char?.voiceId || isPreviewLoading) return
    setIsPreviewLoading(true)
    setPreviewAudio(null)
    try {
      const res = await fetch('/api/dialogue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [{ text: line.text, voiceId: char.voiceId, model: char.model, characterName: char.name }],
          preview: true,
        }),
      })
      const data = await res.json()
      if (data.audioUrl) setPreviewAudio(data.audioUrl)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // ─── Generate full dialogue ──────────────────────────────────────────────────

  async function handleGenerate() {
    if (!canGenerate || !parsedLines) return
    setIsGenerating(true)
    setAudioUrl(null)
    setError(null)
    setGenerationProgress(0)

    const estimatedMs = parsedLines.length * 3500
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      setGenerationProgress(Math.min(88, Math.round((elapsed / estimatedMs) * 100)))
    }, 400)

    try {
      const res = await fetch('/api/dialogue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: parsedLines.map(line => {
            const char = characters.find(c => c.name === line.characterId)!
            return { text: line.text, voiceId: char.voiceId, model: char.model, characterName: char.name }
          }),
          outputFormat,
          pauseBetweenLines,
        }),
      })

      const data = await res.json()
      clearInterval(progressInterval)

      if (!res.ok) { setError(data.error ?? 'Error al generar el diálogo'); return }

      setGenerationProgress(100)

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl)
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        onCreditsUpdate(data.creditsRemaining)
        setGenerationHistory(prev => [
          { url: data.audioUrl, format: outputFormat, createdAt: Date.now() },
          ...prev,
        ].slice(0, 3))
        setMobileTab('audio')
      } else if (data.jobId) {
        setJobId(data.jobId)
        pollJob(data.jobId)
      }
    } catch (err) {
      clearInterval(progressInterval)
      console.error('Generate error:', err)
      setError('Error de red al generar el diálogo')
    } finally {
      setIsGenerating(false)
    }
  }

  async function pollJob(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/tts-job/${id}`)
      const data = await res.json()
      if (data.status === 'done') {
        clearInterval(interval)
        setAudioUrl(data.audioUrl)
        setJobId(null)
        onCreditsUpdate(data.creditsRemaining)
      } else if (data.status === 'error') {
        clearInterval(interval)
        setJobId(null)
      }
    }, 3000)
  }

  // ─── Example ─────────────────────────────────────────────────────────────────

  const exampleText = `(Narrador) Era una noche oscura y tormentosa.
(Personaje 1) ¿Has escuchado lo que pasó anoche?
(Personaje 2) No, cuéntame. Estaba durmiendo.
(Personaje 1) Alguien entró en la casa abandonada.
(Personaje 2) ¡No puede ser!
(Narrador) Y así comenzó la aventura.`

  // ─── Sub-components (shared across mobile/desktop) ────────────────────────

  const CharacterList = () => (
    <div className="space-y-2">
      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-2">
            <Mic className="w-3.5 h-3.5 text-white/20" />
          </div>
          <p className="text-xs text-white/20">Escribe el guión para detectar personajes</p>
        </div>
      ) : characters.map(char => (
        <div key={char.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 group">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-black flex-shrink-0 select-none"
                 style={{ backgroundColor: char.color }}>
              {char.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{char.name}</p>
              <p className="text-[10px] text-white/25">
                {parsedLines?.filter(l => l.characterId === char.name).length ?? 0} líneas
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectingVoiceFor(char.name)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] border transition-all ${
              char.voiceId
                ? 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20'
                : 'border-dashed border-white/15 text-white/25 hover:border-white/30 hover:text-white/40'
            }`}
          >
            <Mic className="w-3 h-3 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{char.voiceId ? char.voiceName : 'Asignar voz →'}</span>
          </button>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            <div>
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-white/20">Velocidad</span>
                <span className="text-[9px] text-white/30">{char.speed.toFixed(1)}x</span>
              </div>
              <input type="range" min={0.5} max={2} step={0.1} value={char.speed}
                     onChange={e => updateCharacter(char.id, { speed: parseFloat(e.target.value) })}
                     className="w-full accent-white h-px" />
            </div>
            <div>
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-white/20">Volumen</span>
                <span className="text-[9px] text-white/30">{Math.round(char.volume * 100)}%</span>
              </div>
              <input type="range" min={0} max={2} step={0.1} value={char.volume}
                     onChange={e => updateCharacter(char.id, { volume: parseFloat(e.target.value) })}
                     className="w-full accent-white h-px" />
            </div>
          </div>
        </div>
      ))}

      {/* Manual character */}
      {showManualInput ? (
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={manualCharName}
            onChange={e => setManualCharName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addManualCharacter(); if (e.key === 'Escape') { setShowManualInput(false); setManualCharName('') } }}
            placeholder="Nombre del personaje"
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 placeholder:text-white/20 outline-none focus:border-white/20"
          />
          <button onClick={addManualCharacter}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs text-white/60 transition-colors">
            OK
          </button>
          <button onClick={() => { setShowManualInput(false); setManualCharName('') }}
                  className="p-1.5 hover:bg-white/[0.06] rounded-lg text-white/30 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowManualInput(true)}
          className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/10 text-[11px] text-white/25 hover:text-white/40 hover:border-white/20 transition-all"
        >
          <Plus className="w-3 h-3" />
          Personaje manual
        </button>
      )}
    </div>
  )

  const AudioSettings = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Pausa entre líneas</span>
        <select value={pauseBetweenLines}
                onChange={e => setPauseBetweenLines(Number(e.target.value))}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/50 outline-none cursor-pointer">
          <option value={0}>Sin pausa</option>
          <option value={300}>0.3s</option>
          <option value={500}>0.5s</option>
          <option value={1000}>1s</option>
          <option value={1500}>1.5s</option>
          <option value={2000}>2s</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Formato</span>
        <div className="flex gap-0.5 bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
          {(['mp3', 'wav'] as const).map(fmt => (
            <button key={fmt} onClick={() => setOutputFormat(fmt)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      outputFormat === fmt ? 'bg-white text-black' : 'text-white/30 hover:text-white/50'
                    }`}>
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg ${
        credits >= totalChars ? 'bg-white/[0.02] text-white/25' : 'bg-red-500/[0.08] text-red-400/70'
      }`}>
        <span>{totalChars.toLocaleString()} cr necesarios</span>
        <span>{credits.toLocaleString()} disponibles</span>
      </div>
    </div>
  )

  const GenerateButton = () => (
    <div>
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className="w-full py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
          : <><Play className="w-4 h-4" /> Generar audio</>
        }
      </button>
      {error && <p className="text-[11px] text-red-400/70 text-center mt-2 truncate">{error}</p>}
      {!hasAllVoices && characters.length > 0 && !error && (
        <p className="text-[10px] text-amber-400/50 text-center mt-1.5">
          Asigna una voz a cada personaje
        </p>
      )}
    </div>
  )

  const AudioResult = () => (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
      {!audioUrl && !isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
            <Music2 className="w-6 h-6 text-white/15" />
          </div>
          <p className="text-sm text-white/20 font-medium">El audio aparecerá aquí</p>
          <p className="text-xs text-white/10 mt-1">Genera el diálogo para escucharlo</p>
        </div>
      ) : isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-white/30" />
          <p className="text-sm text-white/40">Generando diálogo...</p>
          <div className="w-full max-w-[200px]">
            <div className="w-full bg-white/[0.06] rounded-full h-1 mb-1">
              <div className="bg-white/50 h-1 rounded-full transition-all duration-500"
                   style={{ width: `${generationProgress}%` }} />
            </div>
            <p className="text-[10px] text-white/20">{generationProgress}%</p>
          </div>
        </div>
      ) : audioUrl ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => { setIsPlaying(false); setCurrentTime(0) }}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          />

          {/* Player */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
            {/* Progress bar */}
            <div
              className="h-1 bg-white/10 rounded-full mb-4 cursor-pointer group/bar relative"
              onClick={e => {
                if (!audioRef.current || !duration) return
                const rect = e.currentTarget.getBoundingClientRect()
                audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
              }}
            >
              <div className="absolute inset-y-0 -top-1.5 -bottom-1.5 left-0 right-0" />
              <div className="h-full bg-white/70 rounded-full transition-all relative"
                   style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <span className="text-xs text-white/40 font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex-1" />
              <button
                onClick={handleGenerate}
                className="text-[11px] text-white/20 hover:text-white/50 transition-colors"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Download */}
          <a
            href={audioUrl}
            download={`dialogo.${outputFormat}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs text-white/50 hover:text-white/80 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar {outputFormat.toUpperCase()}
          </a>
        </div>
      ) : null}

      {/* Generation history */}
      {generationHistory.length > 1 && (
        <div className="border-t border-white/[0.06] pt-3">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Generaciones anteriores</p>
          <div className="space-y-1.5">
            {generationHistory.slice(1).map((entry, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] group/entry">
                <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-3 h-3 text-white/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/30">
                    {new Date(entry.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[9px] text-white/15 uppercase">{entry.format}</p>
                </div>
                <a href={entry.url} download={`dialogo-${i + 2}.${entry.format}`}
                   className="opacity-0 group-hover/entry:opacity-100 p-1 rounded hover:bg-white/[0.06] text-white/30 transition-all">
                  <Download className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview audio autoplay */}
      {previewAudio && <audio src={previewAudio} autoPlay className="hidden" />}
    </div>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Mobile tab bar ── */}
      <div className="md:hidden flex-shrink-0 flex border-b border-white/[0.08]">
        {(['script', 'characters', 'audio'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === tab ? 'text-white border-b-2 border-white' : 'text-white/30'
            }`}
          >
            {tab === 'script' ? 'Guión' : tab === 'characters' ? 'Personajes' : 'Audio'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Configuration ── */}
        <div className={`
          w-full md:w-[280px] flex-shrink-0 flex flex-col overflow-hidden
          md:border-r border-white/[0.08]
          ${mobileTab !== 'characters' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Configuración</p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* Characters section */}
            <div className="px-3 py-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider">
                  Personajes detectados
                </p>
                {parsedLines && (
                  <div className="relative">
                    <button
                      onClick={() => setShowLangPicker(p => !p)}
                      className="flex items-center gap-0.5 text-[10px] text-white/20 hover:text-white/40 transition-colors"
                    >
                      Traducir <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {showLangPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                        <div className="absolute top-full right-0 mt-1 z-50 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-36">
                          {DIALOGUE_LANGUAGES.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setShowLangPicker(false)
                                translateText(LANG_MAP[lang.code] ?? lang.code.toUpperCase())
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <CharacterList />
            </div>

            {/* Audio settings section */}
            <div className="px-3 py-3">
              <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider mb-2.5">
                Configuración de audio
              </p>
              <AudioSettings />
            </div>
          </div>

          {/* Generate button — pinned bottom */}
          <div className="flex-shrink-0 p-3 border-t border-white/[0.08]">
            <GenerateButton />
          </div>
        </div>

        {/* ── CENTER: Script editor ── */}
        <div className={`
          flex-1 flex flex-col overflow-hidden
          ${mobileTab !== 'script' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.08]">
            <span className="text-xs font-semibold text-white/60">Guión</span>
            <div className="flex-1" />

            {/* Import */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-[11px] text-white/40 cursor-pointer transition-all">
              <Upload className="w-3 h-3" />
              Importar
              <input type="file" accept=".txt" className="hidden"
                     onChange={e => {
                       const f = e.target.files?.[0]
                       if (!f) return
                       const reader = new FileReader()
                       reader.onload = ev => handleTextChange(ev.target?.result as string)
                       reader.readAsText(f)
                     }} />
            </label>

            {!rawText && (
              <button
                onClick={() => handleTextChange(exampleText)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-[11px] text-white/40 transition-all"
              >
                Ejemplo
              </button>
            )}

            {rawText && (
              <button
                onClick={() => { setRawText(''); setParsedLines(null); setCharacters([]) }}
                className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/20 hover:text-white/50 transition-colors"
                title="Limpiar guión"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Textarea */}
          <div className="flex-1 overflow-hidden relative bg-[#111111]">
            {isTranslating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Traduciendo...
                </div>
              </div>
            )}
            <textarea
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={`(Narrador) Era una noche oscura y tormentosa.\n(Personaje 1) ¿Has escuchado lo que pasó anoche?\n(Personaje 2) No, cuéntame. Estaba durmiendo.\n(Personaje 1) Alguien entró en la casa abandonada.\n(Personaje 2) ¡No puede ser!\n(Narrador) Y así comenzó la aventura.`}
              className="w-full h-full bg-transparent px-5 py-5 text-sm text-white/80 placeholder:text-white/[0.12] outline-none resize-none font-mono leading-7 focus:ring-0"
              spellCheck={false}
            />
          </div>

          {/* Bottom status bar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-t border-white/[0.06] bg-black/20">
            <span className="text-[11px] text-white/20">
              {parsedLines?.length ?? 0} líneas · {totalChars.toLocaleString()} cr
            </span>
            {parseError && <span className="text-[11px] text-amber-400/60">{parseError}</span>}
            <div className="flex-1" />
            {rawText && (
              <button
                onClick={() => {
                  const blob = new Blob([rawText], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'guion.txt'; a.click()
                }}
                className="text-[11px] text-white/15 hover:text-white/35 transition-colors"
              >
                Exportar .txt
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Audio result ── */}
        <div className={`
          w-full md:w-[300px] flex-shrink-0 flex flex-col overflow-hidden
          md:border-l border-white/[0.08]
          ${mobileTab !== 'audio' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Audio</p>
          </div>

          <AudioResult />
        </div>
      </div>

      {/* ── Mobile: Generate button pinned bottom ── */}
      <div className="md:hidden flex-shrink-0 p-3 border-t border-white/[0.08]">
        <GenerateButton />
      </div>

      {/* ── VoiceBrowser modal ── */}
      {selectingVoiceFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectingVoiceFor(null)} />
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-white">Seleccionar voz</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Para:{' '}
                  <span style={{ color: characters.find(c => c.name === selectingVoiceFor)?.color }}>
                    {selectingVoiceFor}
                  </span>
                </p>
              </div>
              <button onClick={() => setSelectingVoiceFor(null)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <VoiceBrowser
                clonedVoices={userVoices.map(v => ({ id: v.id, name: v.name }))}
                onSelect={(voice: SelectedVoice | null) => {
                  if (!voice || !selectingVoiceFor) return
                  assignVoice(selectingVoiceFor, voice.referenceId, voice.name, 'elite-pro')
                }}
                onClose={() => setSelectingVoiceFor(null)}
                plan={plan}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
