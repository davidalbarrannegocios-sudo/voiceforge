'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Play, Pause, Download, Loader2, ChevronDown, AlertCircle,
  Mic, X, ChevronRight, Upload, MessageSquare,
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
  const [dialogueLang, setDialogueLang] = useState('es')
  const [showLangPicker, setShowLangPicker] = useState(false)

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Settings
  const [pauseBetweenLines, setPauseBetweenLines] = useState(500)
  const [outputFormat, setOutputFormat] = useState<'mp3' | 'wav'>('mp3')

  // Audio player
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Preview
  const [previewLine, setPreviewLine] = useState<string | null>(null)
  const [previewAudio, setPreviewAudio] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

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

  // ─── Preview single line ─────────────────────────────────────────────────────

  async function handlePreviewLine(line: DialogueLine, char?: Character) {
    if (!char?.voiceId || isPreviewLoading) return
    setIsPreviewLoading(true)
    setPreviewLine(line.text)
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-full overflow-hidden">

        {/* ── LEFT: Script editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.08]">

          {/* Compact toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/[0.08]">
            <span className="text-xs font-medium text-white/50">Guión</span>
            <div className="flex-1" />

            {/* Translate */}
            {parsedLines && (
              <div className="relative">
                <button
                  onClick={() => setShowLangPicker(p => !p)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-white/40 transition-all"
                >
                  Traducir
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showLangPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                      {DIALOGUE_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setDialogueLang(lang.code)
                            setShowLangPicker(false)
                            translateText(LANG_MAP[lang.code] ?? lang.code.toUpperCase())
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors whitespace-nowrap"
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Import .txt */}
            <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-white/40 cursor-pointer transition-all">
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

            {/* Export */}
            {rawText && (
              <button
                onClick={() => {
                  const blob = new Blob([rawText], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'guion.txt'; a.click()
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-white/40 transition-all"
              >
                <Download className="w-3 h-3" />
                Exportar
              </button>
            )}

            {/* Clear */}
            <button
              onClick={() => { setRawText(''); setParsedLines(null); setCharacters([]) }}
              className="p-1 rounded-lg hover:bg-white/[0.08] text-white/20 hover:text-white/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Textarea */}
          <div className="flex-1 overflow-hidden relative">
            {isTranslating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Traduciendo...
                </div>
              </div>
            )}
            <textarea
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={`(Narrador) Era una noche oscura...\n(Personaje 1) ¿Has escuchado lo que pasó?\n(Personaje 2) No, cuéntame.`}
              className="w-full h-full bg-transparent px-3 py-3 text-sm text-white/80 placeholder:text-white/15 outline-none resize-none font-mono leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Footer with stats */}
          <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 border-t border-white/[0.08]">
            <span className="text-[11px] text-white/20">
              {parsedLines?.length ?? 0} líneas · {totalChars.toLocaleString()} cr
            </span>
            {!rawText && (
              <button onClick={() => handleTextChange(exampleText)}
                      className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
                → Ejemplo
              </button>
            )}
            <div className="flex-1" />
            {parseError && <span className="text-[11px] text-amber-400/70">{parseError}</span>}
            {error && <span className="text-[11px] text-red-400/70 truncate max-w-[180px]">{error}</span>}
          </div>
        </div>

        {/* ── CENTER: Characters (compact) ── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden border-r border-white/[0.08]">

          <div className="flex-shrink-0 px-3 py-2 border-b border-white/[0.08]">
            <span className="text-xs font-medium text-white/50">Personajes</span>
          </div>

          {/* Scrollable character list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {characters.length === 0 ? (
              <p className="text-[11px] text-white/15 text-center py-4">
                Escribe el guión para detectar personajes
              </p>
            ) : characters.map(char => (
              <div key={char.id} className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-2">

                {/* Name */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                  <span className="text-xs font-medium text-white/80 truncate">{char.name}</span>
                  <span className="text-[10px] text-white/20 ml-auto">
                    {parsedLines?.filter(l => l.characterId === char.name).length ?? 0}
                  </span>
                </div>

                {/* Voice picker */}
                <button
                  onClick={() => setSelectingVoiceFor(char.name)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] border transition-all mb-1.5 ${
                    char.voiceId
                      ? 'border-white/10 bg-white/5 text-white/60'
                      : 'border-dashed border-white/15 text-white/25'
                  }`}
                >
                  <Mic className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{char.voiceId ? char.voiceName : 'Voz →'}</span>
                </button>

                {/* Speed + volume compact grid */}
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-[9px] text-white/20">Vel. {char.speed.toFixed(1)}x</span>
                    <input type="range" min={0.5} max={2} step={0.1}
                           value={char.speed}
                           onChange={e => updateCharacter(char.id, { speed: parseFloat(e.target.value) })}
                           className="w-full accent-white h-0.5 mt-0.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-white/20">Vol. {Math.round(char.volume * 100)}%</span>
                    <input type="range" min={0} max={2} step={0.1}
                           value={char.volume}
                           onChange={e => updateCharacter(char.id, { volume: parseFloat(e.target.value) })}
                           className="w-full accent-white h-0.5 mt-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Global settings compact */}
          <div className="flex-shrink-0 border-t border-white/[0.08] p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30">Pausa</span>
              <select value={pauseBetweenLines}
                      onChange={e => setPauseBetweenLines(Number(e.target.value))}
                      className="bg-white/5 border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] text-white/50 outline-none">
                <option value={0}>0s</option>
                <option value={300}>0.3s</option>
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30">Formato</span>
              <div className="flex gap-0.5">
                {(['mp3', 'wav'] as const).map(fmt => (
                  <button key={fmt} onClick={() => setOutputFormat(fmt)}
                          className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                            outputFormat === fmt ? 'bg-white text-black' : 'bg-white/5 text-white/30'
                          }`}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className={`flex justify-between text-[10px] px-1 ${
              credits >= totalChars ? 'text-white/20' : 'text-red-400/60'
            }`}>
              <span>{totalChars.toLocaleString()} cr</span>
              <span>{credits.toLocaleString()} disp.</span>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex-shrink-0 p-2 border-t border-white/[0.08]">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isGenerating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</>
                : <><Play className="w-3.5 h-3.5" /> Generar</>
              }
            </button>
            {!hasAllVoices && characters.length > 0 && (
              <p className="text-[10px] text-amber-400/60 text-center mt-1.5">
                Asigna voz a todos los personajes
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Audio result ── */}
        <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden">

          <div className="flex-shrink-0 px-3 py-2 border-b border-white/[0.08]">
            <span className="text-xs font-medium text-white/50">Audio</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {!audioUrl && !isGenerating ? (
              <div className="text-center">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center mb-2 mx-auto">
                  <MessageSquare className="w-5 h-5 text-white/15" />
                </div>
                <p className="text-xs text-white/20">El audio aparecerá aquí</p>
              </div>
            ) : isGenerating ? (
              <div className="text-center w-full space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-white/30 mx-auto" />
                <p className="text-xs text-white/30">Generando...</p>
                <div className="w-full bg-white/5 rounded-full h-0.5">
                  <div className="bg-white/30 h-0.5 rounded-full transition-all duration-500"
                       style={{ width: `${generationProgress}%` }} />
                </div>
                <p className="text-[10px] text-white/20">{generationProgress}%</p>
              </div>
            ) : audioUrl ? (
              <div className="w-full space-y-3">
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

                {/* Minimal player */}
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-3">
                  <div
                    className="h-0.5 bg-white/10 rounded-full mb-3 cursor-pointer"
                    onClick={e => {
                      if (!audioRef.current || !duration) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                    }}
                  >
                    <div className="h-full bg-white/60 rounded-full transition-all"
                         style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
                      className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 flex-shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                    </button>
                    <span className="text-[10px] text-white/30 font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <a
                  href={audioUrl}
                  download={`dialogo.${outputFormat}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs text-white/50 hover:text-white transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar {outputFormat.toUpperCase()}
                </a>

                <button
                  onClick={handleGenerate}
                  className="w-full py-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors"
                >
                  ↻ Regenerar
                </button>
              </div>
            ) : null}
          </div>

          {/* Preview playback */}
          {(previewLine || isPreviewLoading) && (
            <div className="flex-shrink-0 border-t border-white/[0.08] p-3">
              <p className="text-[10px] text-white/30 mb-1.5">Pre-escucha</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[11px] text-white/50 truncate">{previewLine}</p>
                {isPreviewLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40 flex-shrink-0" />
                  : previewAudio && <audio src={previewAudio} autoPlay className="hidden" />
                }
              </div>
            </div>
          )}
        </div>
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
