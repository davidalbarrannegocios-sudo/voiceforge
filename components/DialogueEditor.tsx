'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Play, Pause, Download, Loader2, ChevronDown,
  Mic, X, Upload, Plus, Music2,
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

  // Right panel tab (mirrors TTS pattern)
  const [rightTab, setRightTab] = useState<'personajes' | 'audio'>('personajes')

  const prevLanguage = useRef(language)
  const langPickerRef = useRef<HTMLDivElement>(null)

  // ─── Derived ────────────────────────────────────────────────────────────────

  const totalChars = parsedLines?.reduce((sum, l) => sum + l.text.length, 0) ?? 0
  const hasAllVoices = characters.length > 0 && characters.every(c => c.voiceId)
  const canGenerate = hasAllVoices && parsedLines && parsedLines.length > 0 && credits >= totalChars

  // ─── Lang picker close on outside click ─────────────────────────────────────

  useEffect(() => {
    if (!showLangPicker) return
    function handleClick(e: MouseEvent) {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
        setShowLangPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showLangPicker])

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
        setRightTab('audio')
      }
    } catch (err) {
      clearInterval(progressInterval)
      console.error('Generate error:', err)
      setError('Error de red al generar el diálogo')
    } finally {
      setIsGenerating(false)
    }
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
      <div style={{ minHeight: 'calc(100vh - 88px)', overflow: 'auto' }}>
        <div
          className="flex flex-col lg:flex-row"
          style={{
            flex: 1, minHeight: 0, maxHeight: 'calc(100vh - 120px)',
            background: '#000000', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', overflow: 'hidden',
          }}
        >

          {/* ── LEFT COLUMN: Script editor ── */}
          <div
            className="flex-1 min-w-0 flex flex-col min-h-64 lg:min-h-0 border-b lg:border-b-0 lg:border-r"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Import .txt */}
              <label
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Importar
                <input type="file" accept=".txt" className="hidden"
                       onChange={e => {
                         const f = e.target.files?.[0]
                         if (!f) return
                         const reader = new FileReader()
                         reader.onload = ev => handleTextChange(ev.target?.result as string)
                         reader.readAsText(f)
                         e.target.value = ''
                       }} />
              </label>

              {/* Example */}
              {!rawText && (
                <button
                  onClick={() => handleTextChange(exampleText)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}
                >
                  Ejemplo
                </button>
              )}

              {/* Translate */}
              {parsedLines && (
                <div style={{ position: 'relative' }} ref={langPickerRef}>
                  <button
                    onClick={() => setShowLangPicker(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: showLangPicker ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}
                  >
                    Traducir
                    <ChevronDown style={{ width: '12px', height: '12px' }} />
                  </button>
                  {showLangPicker && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', minWidth: '140px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                      {DIALOGUE_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setShowLangPicker(false)
                            translateText(LANG_MAP[lang.code] ?? lang.code.toUpperCase())
                          }}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: '13px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af' }}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ flex: 1 }} />

              {/* Export */}
              {rawText && (
                <button
                  onClick={() => {
                    const blob = new Blob([rawText], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'guion.txt'; a.click()
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', cursor: 'pointer' }}
                >
                  Exportar
                </button>
              )}

              {/* Clear */}
              {rawText && (
                <button
                  onClick={() => { setRawText(''); setParsedLines(null); setCharacters([]); setAudioUrl(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', cursor: 'pointer' }}
                >
                  <X style={{ width: '13px', height: '13px' }} />
                  Limpiar
                </button>
              )}
            </div>

            {/* Textarea area */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
              {isTranslating && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    Traduciendo...
                  </div>
                </div>
              )}
              <textarea
                value={rawText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`(Narrador) Era una noche oscura y tormentosa.\n(Personaje 1) ¿Has escuchado lo que pasó anoche?\n(Personaje 2) No, cuéntame. Estaba durmiendo.\n(Personaje 1) Alguien entró en la casa abandonada.\n(Narrador) Y así comenzó la aventura.`}
                spellCheck={false}
                style={{
                  width: '100%', height: '100%', background: 'transparent', border: 'none',
                  outline: 'none', resize: 'none', padding: '16px',
                  fontSize: '14px', lineHeight: '1.75', color: 'rgba(255,255,255,0.85)',
                  fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                }}
                className="placeholder:text-white/20"
              />
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0 }}>
              {/* Progress bar while generating */}
              {isGenerating && (
                <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#aaaaaa' }}>Generando diálogo... {Math.round(generationProgress)}%</span>
                  </div>
                  <div style={{ height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '9999px', width: `${generationProgress}%`, background: '#ffffff', transition: 'width 0.8s linear' }} />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ margin: '10px 16px 0', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  {error}
                </div>
              )}
              {parseError && (
                <div style={{ margin: '10px 16px 0', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                  {parseError}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {parsedLines?.length ?? 0} líneas
                  {totalChars > 0 && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#444444' }}>
                      · {totalChars.toLocaleString('es-ES')} créditos
                    </span>
                  )}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      color: '#000000', border: 'none',
                      cursor: (!canGenerate || isGenerating) ? 'not-allowed' : 'pointer',
                      background: '#ffffff',
                      boxShadow: (!canGenerate || isGenerating) ? 'none' : '0 4px 15px rgba(255,255,255,0.1)',
                      opacity: (!canGenerate || isGenerating) ? 0.5 : 1,
                    }}
                  >
                    {isGenerating
                      ? <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Generando</>
                      : <><Play style={{ width: '14px', height: '14px' }} /> Generar</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Personajes + Audio ── */}
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col min-h-0">

            {/* Sliding pill tabs (mirrors TTS pattern exactly) */}
            <div style={{ padding: '12px', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', background: '#111111', borderRadius: '8px', padding: '4px' }}>
                <div style={{
                  position: 'absolute', top: '4px', bottom: '4px', left: '4px',
                  width: 'calc(50% - 4px)', background: '#222222', borderRadius: '6px',
                  transform: rightTab === 'personajes' ? 'translateX(0)' : 'translateX(100%)',
                  transition: 'transform 200ms ease-out',
                }} />
                <button
                  onClick={() => setRightTab('personajes')}
                  style={{ position: 'relative', zIndex: 10, flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: rightTab === 'personajes' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}
                >
                  Personajes
                </button>
                <button
                  onClick={() => setRightTab('audio')}
                  style={{ position: 'relative', zIndex: 10, flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: rightTab === 'audio' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}
                >
                  Audio
                </button>
              </div>
            </div>

            {/* ── Personajes tab ── */}
            {rightTab === 'personajes' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '20px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

                {/* Character list */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>
                    Personajes detectados
                  </p>

                  {characters.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#111111', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <Mic style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p style={{ fontSize: '12px', color: '#4b5563' }}>Escribe el guión para detectar personajes</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {characters.map(char => (
                        <div key={char.id} style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                          {/* Avatar + name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                              background: char.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: 700, color: '#000',
                            }}>
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char.name}</p>
                              <p style={{ fontSize: '11px', color: '#4b5563' }}>
                                {parsedLines?.filter(l => l.characterId === char.name).length ?? 0} líneas
                              </p>
                            </div>
                          </div>

                          {/* Voice button */}
                          <button
                            onClick={() => setSelectingVoiceFor(char.name)}
                            style={{
                              width: '100%', textAlign: 'left',
                              background: char.voiceId ? '#0d0d0d' : 'transparent',
                              border: char.voiceId ? '1px solid rgba(255,255,255,0.08)' : '1px dashed rgba(255,255,255,0.15)',
                              borderRadius: '8px', padding: '8px 10px', marginBottom: '10px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = char.voiceId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)')}
                          >
                            <Mic style={{ width: '13px', height: '13px', color: '#6b7280', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: char.voiceId ? '#9ca3af' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {char.voiceId ? char.voiceName : 'Seleccionar voz →'}
                            </span>
                            {char.voiceId && (
                              <button
                                onClick={e => { e.stopPropagation(); updateCharacter(char.id, { voiceId: '', voiceName: 'Voz estándar' }) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0, flexShrink: 0 }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                              >
                                <X style={{ width: '12px', height: '12px' }} />
                              </button>
                            )}
                          </button>

                          {/* Sliders */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                              { label: 'Velocidad', key: 'speed' as const, min: 0.5, max: 2, step: 0.05, val: char.speed, fmt: (v: number) => `${v.toFixed(1)}x` },
                              { label: 'Volumen', key: 'volume' as const, min: 0, max: 2, step: 0.05, val: char.volume, fmt: (v: number) => `${Math.round(v * 100)}%` },
                            ].map(({ label, key, min, max, step, val, fmt }) => (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '0 4px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', height: '36px', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888', width: '64px', flexShrink: 0 }}>{label}</span>
                                <input
                                  type="range" min={min} max={max} step={step} value={val}
                                  onChange={e => updateCharacter(char.id, { [key]: parseFloat(e.target.value) })}
                                  className="flex-1 accent-white h-1"
                                />
                                <span style={{ fontSize: '11px', color: '#6b7280', width: '32px', textAlign: 'right', flexShrink: 0 }}>{fmt(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual character button */}
                  <div style={{ marginTop: '8px' }}>
                    {showManualInput ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          autoFocus
                          value={manualCharName}
                          onChange={e => setManualCharName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addManualCharacter(); if (e.key === 'Escape') { setShowManualInput(false); setManualCharName('') } }}
                          placeholder="Nombre"
                          style={{ flex: 1, background: '#111111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#e2e8f0', outline: 'none' }}
                        />
                        <button
                          onClick={addManualCharacter}
                          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#9ca3af', cursor: 'pointer' }}
                        >OK</button>
                        <button
                          onClick={() => { setShowManualInput(false); setManualCharName('') }}
                          style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#4b5563' }}
                        ><X style={{ width: '14px', height: '14px' }} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowManualInput(true)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#4b5563' }}
                      >
                        <Plus style={{ width: '13px', height: '13px' }} />
                        Personaje manual
                      </button>
                    )}
                  </div>
                </div>

                {/* Audio settings */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>
                    Configuración de audio
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Pause between lines */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111111', borderRadius: '10px', height: '40px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>Pausa entre líneas</span>
                      <select
                        value={pauseBetweenLines}
                        onChange={e => setPauseBetweenLines(Number(e.target.value))}
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer' }}
                      >
                        <option value={0} style={{ background: '#111' }}>Sin pausa</option>
                        <option value={300} style={{ background: '#111' }}>0.3s</option>
                        <option value={500} style={{ background: '#111' }}>0.5s</option>
                        <option value={1000} style={{ background: '#111' }}>1s</option>
                        <option value={1500} style={{ background: '#111' }}>1.5s</option>
                        <option value={2000} style={{ background: '#111' }}>2s</option>
                      </select>
                    </div>

                    {/* Format toggle (sliding pill, same as TTS normalize) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111111', borderRadius: '10px', height: '40px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>Formato</span>
                      <div style={{ position: 'relative', display: 'flex', background: '#000000', borderRadius: '6px', padding: '2px' }}>
                        <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc(50% - 2px)', background: '#222222', borderRadius: '4px', transform: outputFormat === 'mp3' ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 200ms ease-out' }} />
                        <button onClick={() => setOutputFormat('mp3')} style={{ position: 'relative', zIndex: 10, padding: '2px 10px', fontSize: '11px', fontWeight: 500, color: outputFormat === 'mp3' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>MP3</button>
                        <button onClick={() => setOutputFormat('wav')} style={{ position: 'relative', zIndex: 10, padding: '2px 10px', fontSize: '11px', fontWeight: 500, color: outputFormat === 'wav' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>WAV</button>
                      </div>
                    </div>

                    {/* Credits row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 14px', background: credits < totalChars && totalChars > 0 ? 'rgba(239,68,68,0.08)' : '#111111',
                      borderRadius: '10px', height: '40px',
                      border: credits < totalChars && totalChars > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>Créditos</span>
                      <span style={{ fontSize: '12px', color: credits < totalChars && totalChars > 0 ? '#f87171' : '#6b7280' }}>
                        {credits.toLocaleString()} disponibles
                      </span>
                    </div>
                  </div>

                  {/* Hint */}
                  {!hasAllVoices && characters.length > 0 && (
                    <p style={{ fontSize: '11px', color: '#d97706', marginTop: '10px', padding: '8px 12px', background: 'rgba(251,191,36,0.06)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.15)' }}>
                      Asigna una voz a cada personaje para generar
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Audio tab ── */}
            {rightTab === 'audio' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

                {!audioUrl && !isGenerating ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#111111', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Music2 style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                    <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>El audio aparecerá aquí</p>
                    <p style={{ fontSize: '11px', color: '#374151', marginTop: '4px' }}>Genera el diálogo para escucharlo</p>
                  </div>
                ) : isGenerating ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 0', gap: '12px' }}>
                    <Loader2 style={{ width: '28px', height: '28px', color: 'rgba(255,255,255,0.3)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>Generando diálogo...</p>
                    <div style={{ width: '100%', maxWidth: '180px' }}>
                      <div style={{ height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '9999px', width: `${generationProgress}%`, background: '#ffffff', transition: 'width 0.8s linear' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: '#374151', marginTop: '6px' }}>{generationProgress}%</p>
                    </div>
                  </div>
                ) : audioUrl ? (
                  <>
                    {/* Hidden audio element */}
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

                    {/* Player card */}
                    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
                      {/* Progress bar */}
                      <div
                        style={{ height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '14px', cursor: 'pointer' }}
                        onClick={e => {
                          if (!audioRef.current || !duration) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                        }}
                      >
                        <div style={{ height: '100%', borderRadius: '9999px', width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: '#ffffff', transition: 'width 0.1s linear' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', color: '#000000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          {isPlaying ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px', marginLeft: '2px' }} />}
                        </button>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', flex: 1 }}>
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <button
                          onClick={handleGenerate}
                          disabled={!canGenerate || isGenerating}
                          style={{ fontSize: '11px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                        >
                          ↻ Regenerar
                        </button>
                      </div>
                    </div>

                    {/* Download */}
                    <a
                      href={audioUrl}
                      download={`dialogo.${outputFormat}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af' }}
                    >
                      <Download style={{ width: '14px', height: '14px' }} />
                      Descargar {outputFormat.toUpperCase()}
                    </a>

                    {/* Generation history */}
                    {generationHistory.length > 1 && (
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b5563', marginBottom: '8px' }}>
                          Anteriores
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {generationHistory.slice(1).map((entry, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#111111', borderRadius: '8px' }}>
                              <Music2 style={{ width: '13px', height: '13px', color: '#4b5563', flexShrink: 0 }} />
                              <span style={{ fontSize: '11px', color: '#6b7280', flex: 1 }}>
                                {new Date(entry.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {entry.format.toUpperCase()}
                              </span>
                              <a
                                href={entry.url}
                                download={`dialogo-${i + 2}.${entry.format}`}
                                style={{ color: '#4b5563', textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                              >
                                <Download style={{ width: '13px', height: '13px' }} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                {/* Preview audio autoplay */}
                {previewAudio && <audio src={previewAudio} autoPlay className="hidden" />}
              </div>
            )}
          </div>
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
