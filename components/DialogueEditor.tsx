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

          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-semibold text-white">Guión</h2>
            {parsedLines && (
              <span className="text-xs text-white/30">
                {parsedLines.length} líneas · {totalChars.toLocaleString()} cr
              </span>
            )}
            <div className="flex-1" />

            {/* Translate */}
            {parsedLines && (
              <div className="relative">
                <button
                  onClick={() => setShowLangPicker(p => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 transition-all"
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
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" />
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar
              </button>
            )}

            {/* Clear */}
            {rawText && (
              <button
                onClick={() => { setRawText(''); setParsedLines(null); setCharacters([]) }}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/30 hover:text-white transition-colors"
                title="Limpiar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
              placeholder={`Escribe tu diálogo aquí...\n\nFormato:\n(Personaje) Texto de la línea`}
              className="w-full h-full bg-transparent p-4 text-sm text-white/85 placeholder:text-white/20 outline-none resize-none font-mono leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Parsed lines preview */}
          {parsedLines && parsedLines.length > 0 && (
            <div className="flex-shrink-0 border-t border-white/[0.08] max-h-[220px] overflow-y-auto">
              <div className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider sticky top-0 bg-black/80 backdrop-blur-sm">
                Vista previa — {parsedLines.length} líneas
              </div>
              {parsedLines.map((line, i) => {
                const char = characters.find(c => c.name === line.characterId)
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-1.5 hover:bg-white/[0.02] group">
                    <span className="text-xs font-semibold w-24 flex-shrink-0 truncate mt-0.5"
                          style={{ color: char?.color ?? 'rgba(255,255,255,0.25)' }}>
                      {line.characterId}
                    </span>
                    <span className="text-xs text-white/60 flex-1 leading-relaxed">{line.text}</span>
                    <button
                      onClick={() => handlePreviewLine(line, char)}
                      disabled={!char?.voiceId}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/40 transition-all disabled:cursor-not-allowed"
                      title="Pre-escuchar"
                    >
                      {isPreviewLoading && previewLine === line.text
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.08]">
            {!rawText && (
              <button onClick={() => handleTextChange(exampleText)} className="text-xs text-white/25 hover:text-white/50 transition-colors">
                → Cargar ejemplo
              </button>
            )}
            <div className="flex-1" />
            {parseError && <span className="text-xs text-amber-400/70">{parseError}</span>}
            {error && <span className="text-xs text-red-400/70 truncate max-w-[200px]">{error}</span>}
          </div>
        </div>

        {/* ── CENTER: Characters + settings ── */}
        <div className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden border-r border-white/[0.08]">

          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.08]">
            <p className="text-sm font-semibold text-white">Personajes</p>
            {characters.length > 0 && (
              <p className="text-xs text-white/30 mt-0.5">
                {characters.length} detectados · {hasAllVoices ? '✓ Listos' : 'Asigna voces'}
              </p>
            )}
          </div>

          {/* Character list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {characters.length === 0 ? (
              <div className="text-center py-8 text-white/[0.15] text-xs">
                Los personajes aparecerán aquí
              </div>
            ) : characters.map(char => (
              <div key={char.id} className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-3">

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                  <span className="text-sm font-medium text-white">{char.name}</span>
                  <span className="text-[10px] text-white/25 ml-auto">
                    {parsedLines?.filter(l => l.characterId === char.name).length ?? 0} líneas
                  </span>
                </div>

                <button
                  onClick={() => setSelectingVoiceFor(char.name)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border transition-all mb-3 ${
                    char.voiceId
                      ? 'border-white/10 bg-white/[0.05] text-white/70'
                      : 'border-dashed border-white/20 text-white/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mic className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{char.voiceId ? char.voiceName : 'Seleccionar voz →'}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 w-16">Velocidad</span>
                    <input type="range" min={0.5} max={2} step={0.1} value={char.speed}
                           onChange={e => updateCharacter(char.id, { speed: parseFloat(e.target.value) })}
                           className="flex-1 accent-white h-1" />
                    <span className="text-[10px] text-white/40 w-8 text-right">{char.speed.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 w-16">Volumen</span>
                    <input type="range" min={0} max={2} step={0.1} value={char.volume}
                           onChange={e => updateCharacter(char.id, { volume: parseFloat(e.target.value) })}
                           className="flex-1 accent-white h-1" />
                    <span className="text-[10px] text-white/40 w-8 text-right">{Math.round(char.volume * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Global settings */}
          <div className="flex-shrink-0 border-t border-white/[0.08] p-3 space-y-2.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Ajustes globales</p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 flex-1">Pausa entre líneas</span>
              <select
                value={pauseBetweenLines}
                onChange={e => setPauseBetweenLines(Number(e.target.value))}
                className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 outline-none"
              >
                <option value={0}>Sin pausa</option>
                <option value={300}>0.3s</option>
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 flex-1">Formato</span>
              <div className="flex gap-1">
                {(['mp3', 'wav'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                      outputFormat === fmt ? 'bg-white text-black font-medium' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className={`flex justify-between text-xs px-2 py-1.5 rounded-lg ${
              credits >= totalChars ? 'bg-white/[0.03] text-white/30' : 'bg-red-500/[0.08] text-red-400/70'
            }`}>
              <span>{totalChars.toLocaleString()} créditos</span>
              <span>{credits.toLocaleString()} disponibles</span>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex-shrink-0 p-3 border-t border-white/[0.08]">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              ) : (
                <><Play className="w-4 h-4" /> Generar diálogo</>
              )}
            </button>
            {!hasAllVoices && characters.length > 0 && (
              <p className="text-[11px] text-amber-400/60 text-center mt-2">
                Asigna voz a todos los personajes
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Audio result ── */}
        <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden">

          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.08]">
            <p className="text-sm font-semibold text-white">Audio</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            {!audioUrl && !isGenerating ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-3 mx-auto">
                  <MessageSquare className="w-7 h-7 text-white/[0.15]" />
                </div>
                <p className="text-sm text-white/20">El audio aparecerá aquí</p>
                <p className="text-xs text-white/10 mt-1">Genera el diálogo para escucharlo</p>
              </div>
            ) : isGenerating ? (
              <div className="text-center space-y-3 w-full">
                <Loader2 className="w-8 h-8 animate-spin text-white/30 mx-auto" />
                <p className="text-sm text-white/40">Generando diálogo...</p>
                <div className="w-full bg-white/[0.05] rounded-full h-1">
                  <div className="bg-white/40 h-1 rounded-full transition-all duration-500"
                       style={{ width: `${generationProgress}%` }} />
                </div>
                <p className="text-xs text-white/25">{generationProgress}% completado</p>
              </div>
            ) : audioUrl ? (
              <div className="w-full space-y-4">
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
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

                  {/* Progress bar */}
                  <div
                    className="h-1 bg-white/10 rounded-full mb-4 cursor-pointer"
                    onClick={e => {
                      if (!audioRef.current || !duration) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                    }}
                  >
                    <div className="h-full bg-white rounded-full transition-all"
                         style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (isPlaying) audioRef.current?.pause()
                        else audioRef.current?.play()
                      }}
                      className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 flex-shrink-0"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <p className="text-xs text-white/50 font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </p>
                  </div>
                </div>

                <a
                  href={audioUrl}
                  download={`dialogo.${outputFormat}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar {outputFormat.toUpperCase()}
                </a>

                <button
                  onClick={handleGenerate}
                  className="w-full py-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  ↻ Regenerar
                </button>
              </div>
            ) : null}
          </div>

          {/* Preview section */}
          {(previewLine || isPreviewLoading) && (
            <div className="flex-shrink-0 border-t border-white/[0.08] p-3">
              <p className="text-[10px] text-white/30 mb-1.5">Pre-escucha</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-white/50 truncate">{previewLine}</p>
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
