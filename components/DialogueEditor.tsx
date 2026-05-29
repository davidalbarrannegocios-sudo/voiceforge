'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Download, Loader2, ChevronDown, AlertCircle, Mic } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────
interface Character {
  id: string
  name: string
  voiceId: string
  voiceName: string
  model: 'elite-pro' | 'elite-legacy' | 'elite-turbo'
  color: string
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
    if (!seen.has(line.characterId)) {
      seen.add(line.characterId)
      chars.push(line.characterId)
    }
  }
  return chars
}

interface Props {
  userVoices: Voice[]
  plan: string
  credits: number
  onCreditsUpdate: (newCredits: number) => void
  language?: string
}

export function DialogueEditor({ userVoices, plan, credits, onCreditsUpdate, language }: Props) {
  const [rawText, setRawText] = useState('')
  const [parsedLines, setParsedLines] = useState<DialogueLine[] | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [showVoicePicker, setShowVoicePicker] = useState<string | null>(null)
  const [dialogueLang, setDialogueLang] = useState('es')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const prevLanguage = useRef(language)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleTextChange = useCallback((text: string) => {
    setRawText(text)
    setAudioUrl(null)
    setParseError(null)

    if (!text.trim()) {
      setParsedLines(null)
      setCharacters([])
      return
    }

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
          voiceName: 'Sin voz asignada',
          model: 'elite-pro' as const,
          color: CHARACTER_COLORS[i % CHARACTER_COLORS.length],
        }
      })
    })
  }, [])

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

  // Auto-translate when external language prop changes
  useEffect(() => {
    if (language && language !== prevLanguage.current && rawText && parsedLines) {
      const deeplLang = LANG_MAP[language] ?? language.toUpperCase()
      translateText(deeplLang)
    }
    prevLanguage.current = language
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const assignVoice = useCallback((
    charName: string,
    voiceId: string,
    voiceName: string,
    model: Character['model']
  ) => {
    setCharacters(prev => prev.map(c =>
      c.name === charName ? { ...c, voiceId, voiceName, model } : c
    ))
    setShowVoicePicker(null)
  }, [])

  const totalChars = parsedLines?.reduce((sum, l) => sum + l.text.length, 0) ?? 0
  const hasAllVoices = characters.length > 0 && characters.every(c => c.voiceId)
  const canGenerate = hasAllVoices && parsedLines && parsedLines.length > 0 && credits >= totalChars

  async function handleGenerate() {
    if (!canGenerate || !parsedLines) return
    setIsGenerating(true)
    setAudioUrl(null)

    try {
      const res = await fetch('/api/dialogue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: parsedLines.map(line => {
            const char = characters.find(c => c.name === line.characterId)!
            return {
              text: line.text,
              voiceId: char.voiceId,
              model: char.model,
              characterName: char.name,
            }
          }),
        }),
      })

      const data = await res.json()
      if (res.status === 402) return

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl)
        onCreditsUpdate(data.creditsRemaining)
      } else if (data.jobId) {
        setJobId(data.jobId)
        pollJob(data.jobId)
      }
    } catch (err) {
      console.error('Generate error:', err)
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

  const exampleText = `(Narrador) Era una noche oscura y tormentosa.
(Personaje 1) ¿Has escuchado lo que pasó anoche?
(Personaje 2) No, cuéntame. Estaba durmiendo.
(Personaje 1) [angry] Alguien entró en la casa abandonada.
(Personaje 2) [surprised] ¡No puede ser!
(Narrador) Y así comenzó la aventura.`

  return (
    <div className="flex flex-col h-full gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Texto a Diálogo</h2>
          <p className="text-sm text-white/40 mt-0.5">
            Asigna voces distintas a cada personaje.
            Formato: <code className="bg-white/8 px-1 rounded text-white/60">(Nombre) Texto</code>
          </p>
        </div>

        {/* Translate to language */}
        {parsedLines && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowLangPicker(p => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10
                         bg-white/5 text-white/60 hover:text-white hover:bg-white/8
                         text-sm transition-colors"
            >
              Traducir a
              <span className="font-medium text-white/80">
                {DIALOGUE_LANGUAGES.find(l => l.code === dialogueLang)?.label ?? dialogueLang}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showLangPicker && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-[#111] border
                              border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {DIALOGUE_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setDialogueLang(lang.code)
                      setShowLangPicker(false)
                      const deeplLang = LANG_MAP[lang.code] ?? lang.code.toUpperCase()
                      translateText(deeplLang)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-white/70
                               hover:bg-white/8 hover:text-white transition-colors whitespace-nowrap"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1">

        {/* Left — textarea */}
        <div className="flex flex-col gap-4">

          <div className="relative">
            <textarea
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={`Escribe tu diálogo aquí...\n\nEjemplo:\n${exampleText}`}
              className="w-full min-h-[380px] bg-white/[0.02] border border-white/10
                         rounded-xl p-4 text-sm text-white/90 leading-relaxed
                         placeholder-white/20 outline-none focus:border-white/20
                         resize-none font-mono transition-colors"
              spellCheck={false}
            />
            {isTranslating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traduciendo...
                </div>
              </div>
            )}
          </div>

          {parseError && (
            <div className="flex items-center gap-2 text-amber-400/80 text-sm
                            bg-amber-400/5 border border-amber-400/15 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {parseError}
            </div>
          )}

          {!rawText && (
            <button
              onClick={() => handleTextChange(exampleText)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors text-left"
            >
              → Cargar texto de ejemplo
            </button>
          )}

          {parsedLines && (
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span>{parsedLines.length} líneas</span>
              <span>{totalChars.toLocaleString()} caracteres</span>
              <span>{characters.length} personajes</span>
              {totalChars > credits && (
                <span className="text-red-400">
                  Sin créditos suficientes ({credits.toLocaleString()} disponibles)
                </span>
              )}
            </div>
          )}

          {parsedLines && parsedLines.length > 0 && (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto border border-white/8 rounded-xl p-3">
              {parsedLines.map((line, i) => {
                const char = characters.find(c => c.name === line.characterId)
                return (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className="font-medium text-xs mt-0.5 flex-shrink-0 w-24 truncate"
                      style={{ color: char?.color ?? '#ffffff60' }}
                    >
                      {line.characterId}
                    </span>
                    <span className="text-white/60 leading-snug">{line.text}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — characters + controls */}
        <div className="flex flex-col gap-4">

          {characters.length > 0 ? (
            <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">
                Personajes detectados
              </p>
              <div className="space-y-3">
                {characters.map(char => (
                  <div key={char.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                      <span className="text-sm text-white font-medium">{char.name}</span>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowVoicePicker(showVoicePicker === char.name ? null : char.name)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                                   text-sm transition-colors border ${char.voiceId
                                     ? 'border-white/10 bg-white/5 text-white/80'
                                     : 'border-dashed border-white/20 text-white/30'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Mic className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate text-xs">
                            {char.voiceId ? char.voiceName : 'Seleccionar voz'}
                          </span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                      </button>

                      {showVoicePicker === char.name && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50
                                        bg-[#111] border border-white/10 rounded-xl
                                        shadow-2xl max-h-[200px] overflow-y-auto">

                          {/* Elite Pro voices */}
                          <p className="px-3 pt-2 pb-1 text-[10px] text-white/30 uppercase tracking-wider sticky top-0 bg-[#111]">
                            Elite Pro
                          </p>
                          {userVoices.map(voice => (
                            <button
                              key={`pro-${voice.id}`}
                              onClick={() => assignVoice(char.name, voice.id, voice.name, 'elite-pro')}
                              className="w-full text-left px-3 py-2 text-xs text-white/70
                                         hover:bg-white/8 hover:text-white transition-colors"
                            >
                              {voice.name}
                            </button>
                          ))}

                          {/* Elite Legacy voices */}
                          <p className="px-3 pt-2 pb-1 text-[10px] text-white/30 uppercase tracking-wider sticky top-0 bg-[#111]">
                            Elite Legacy
                          </p>
                          {userVoices.map(voice => (
                            <button
                              key={`legacy-${voice.id}`}
                              onClick={() => assignVoice(char.name, voice.id, voice.name, 'elite-legacy')}
                              className="w-full text-left px-3 py-2 text-xs text-white/70
                                         hover:bg-white/8 hover:text-white transition-colors"
                            >
                              {voice.name} <span className="text-white/30">(Legacy)</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-dashed border-white/8 rounded-xl p-6 text-center">
              <p className="text-white/20 text-sm">
                Los personajes aparecerán aquí cuando escribas el diálogo
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full py-3 bg-white text-black text-sm font-semibold
                       rounded-xl hover:bg-white/90 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isGenerating || jobId ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando diálogo...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generar diálogo
              </>
            )}
          </button>

          {characters.length > 0 && !hasAllVoices && (
            <p className="text-xs text-amber-400/70 text-center">
              Asigna una voz a todos los personajes
            </p>
          )}

          {audioUrl && (
            <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4">
              <p className="text-xs text-white/40 mb-3">Diálogo generado</p>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full h-10"
              />
              <a
                href={audioUrl}
                download="dialogo.mp3"
                className="mt-3 flex items-center justify-center gap-2
                           w-full py-2 rounded-lg bg-white/5 hover:bg-white/10
                           border border-white/8 text-white/60 hover:text-white
                           text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar MP3
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
