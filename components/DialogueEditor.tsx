'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Play, Pause, Download, Loader2, ChevronDown,
  Mic, X, Upload, Plus, Music2, GripVertical,
} from 'lucide-react'
import { VoiceBrowser, SelectedVoice } from '@/app/dashboard/VoiceBrowser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DialogueLine {
  id: string
  characterName: string
  text: string
}

interface Character {
  name: string
  voiceId: string
  voiceName: string
  model: 'elite-pro' | 'elite-legacy' | 'elite-turbo'
  color: string
  speed: number
  volume: number
}

interface GenerationEntry {
  url: string
  format: 'mp3' | 'wav'
  createdAt: number
}

interface Voice {
  id: string
  name: string
  model?: string
}

const CHARACTER_COLORS = [
  '#60a5fa', '#34d399', '#fb923c', '#f472b6',
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

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function parseImportText(text: string): { characterName: string; text: string }[] | null {
  const lines = text.split('\n').filter(l => l.trim())
  const pattern = /^\(([^)]+)\)\s*(.+)$/
  const result: { characterName: string; text: string }[] = []
  for (const line of lines) {
    const match = line.trim().match(pattern)
    if (!match) return null
    result.push({ characterName: match[1].trim(), text: match[2].trim() })
  }
  return result.length > 0 ? result : null
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
  // Lines + characters
  const [lines, setLines] = useState<DialogueLine[]>([
    { id: uid(), characterName: 'Narrador', text: 'Era una noche oscura y tormentosa.' },
    { id: uid(), characterName: 'Personaje 1', text: '¿Has escuchado lo que pasó anoche?' },
    { id: uid(), characterName: 'Personaje 2', text: 'No, cuéntame. Estaba durmiendo.' },
  ])
  const [characters, setCharacters] = useState<Character[]>([
    { name: 'Narrador', voiceId: '', voiceName: 'Voz estándar', model: 'elite-pro', color: CHARACTER_COLORS[0], speed: 1, volume: 1 },
    { name: 'Personaje 1', voiceId: '', voiceName: 'Voz estándar', model: 'elite-pro', color: CHARACTER_COLORS[1], speed: 1, volume: 1 },
    { name: 'Personaje 2', voiceId: '', voiceName: 'Voz estándar', model: 'elite-pro', color: CHARACTER_COLORS[2], speed: 1, volume: 1 },
  ])
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [pickerLineId, setPickerLineId] = useState<string | null>(null)
  const [newCharInput, setNewCharInput] = useState('')

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

  // VoiceBrowser
  const [selectingVoiceFor, setSelectingVoiceFor] = useState<string | null>(null)

  // Drag & drop
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Right panel tab
  const [rightTab, setRightTab] = useState<'personajes' | 'audio'>('personajes')

  const langPickerRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const prevLanguage = useRef(language)

  // ─── Derived ────────────────────────────────────────────────────────────────

  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0)
  const hasAllVoices = lines.length > 0 && lines.every(l => {
    const char = characters.find(c => c.name === l.characterName)
    return char?.voiceId
  })
  const canGenerate = hasAllVoices && lines.some(l => l.text.trim()) && credits >= totalChars

  // ─── Character helpers ───────────────────────────────────────────────────────

  function ensureCharacter(name: string): Character {
    const existing = characters.find(c => c.name === name)
    if (existing) return existing
    const newChar: Character = {
      name,
      voiceId: '',
      voiceName: 'Voz estándar',
      model: 'elite-pro',
      color: CHARACTER_COLORS[characters.length % CHARACTER_COLORS.length],
      speed: 1,
      volume: 1,
    }
    setCharacters(prev => [...prev, newChar])
    return newChar
  }

  function updateCharacter(name: string, updates: Partial<Character>) {
    setCharacters(prev => prev.map(c => c.name === name ? { ...c, ...updates } : c))
  }

  const assignVoice = useCallback((charName: string, voiceId: string, voiceName: string) => {
    updateCharacter(charName, { voiceId, voiceName })
    setSelectingVoiceFor(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Line helpers ────────────────────────────────────────────────────────────

  function addLine(characterName?: string) {
    const lastChar = lines[lines.length - 1]?.characterName ?? 'Personaje 1'
    const name = characterName ?? lastChar
    ensureCharacter(name)
    const newLine: DialogueLine = { id: uid(), characterName: name, text: '' }
    setLines(prev => [...prev, newLine])
    setSelectedLineId(newLine.id)
    setTimeout(() => {
      document.getElementById(`line-input-${newLine.id}`)?.focus()
    }, 30)
  }

  function updateLine(id: string, updates: Partial<DialogueLine>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  function deleteLine(id: string) {
    setLines(prev => {
      const next = prev.filter(l => l.id !== id)
      return next.length > 0 ? next : [{ id: uid(), characterName: prev[0]?.characterName ?? 'Personaje 1', text: '' }]
    })
    if (selectedLineId === id) setSelectedLineId(null)
  }

  function changeLineCharacter(lineId: string, charName: string) {
    ensureCharacter(charName)
    updateLine(lineId, { characterName: charName })
    setPickerLineId(null)
    setNewCharInput('')
  }

  // ─── Import ──────────────────────────────────────────────────────────────────

  function importText(text: string) {
    const parsed = parseImportText(text)
    if (!parsed) return

    // Build character map
    const newChars: Character[] = [...characters]
    const newLines: DialogueLine[] = parsed.map(({ characterName, text: lineText }) => {
      if (!newChars.find(c => c.name === characterName)) {
        newChars.push({
          name: characterName,
          voiceId: '', voiceName: 'Voz estándar', model: 'elite-pro',
          color: CHARACTER_COLORS[newChars.length % CHARACTER_COLORS.length],
          speed: 1, volume: 1,
        })
      }
      return { id: uid(), characterName, text: lineText }
    })

    setCharacters(newChars)
    setLines(newLines)
    setAudioUrl(null)
    setError(null)
  }

  // ─── Translation ─────────────────────────────────────────────────────────────

  const translateText = useCallback(async (targetLang: string) => {
    if (!lines.some(l => l.text.trim())) return
    setIsTranslating(true)
    const rawText = lines.map(l => `(${l.characterName}) ${l.text}`).join('\n')
    try {
      const res = await fetch('/api/translate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, targetLang }),
      })
      const data = await res.json()
      if (data.translatedText) importText(data.translatedText)
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setIsTranslating(false)
    }
  }, [lines]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (language && language !== prevLanguage.current && lines.some(l => l.text.trim())) {
      const deeplLang = LANG_MAP[language] ?? language.toUpperCase()
      translateText(deeplLang)
    }
    prevLanguage.current = language
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Outside click handlers ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showLangPicker) return
    const handler = (e: MouseEvent) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) setShowLangPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showLangPicker])

  useEffect(() => {
    if (!pickerLineId) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerLineId(null); setNewCharInput('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerLineId])

  // ─── Generate ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!canGenerate) return
    setIsGenerating(true)
    setAudioUrl(null)
    setError(null)
    setGenerationProgress(0)

    const filteredLines = lines.filter(l => l.text.trim())
    const estimatedMs = filteredLines.length * 3500
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
          lines: filteredLines.map(line => {
            const char = characters.find(c => c.name === line.characterName)!
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
        setIsPlaying(false); setCurrentTime(0); setDuration(0)
        onCreditsUpdate(data.creditsRemaining)
        setGenerationHistory(prev => [
          { url: data.audioUrl, format: outputFormat, createdAt: Date.now() }, ...prev,
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

  const EXAMPLE = `(Narrador) Era una noche oscura y tormentosa.
(Personaje 1) ¿Has escuchado lo que pasó anoche?
(Personaje 2) No, cuéntame. Estaba durmiendo.
(Personaje 1) Alguien entró en la casa abandonada.
(Personaje 2) ¡No puede ser!
(Narrador) Y así comenzó la aventura.`

  // ─── Drag helpers ────────────────────────────────────────────────────────────

  function handleDrop(overIdx: number) {
    if (draggedIdx === null || draggedIdx === overIdx) return
    const next = [...lines]
    const [removed] = next.splice(draggedIdx, 1)
    next.splice(overIdx, 0, removed)
    setLines(next)
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

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

          {/* ── LEFT: Line editor ── */}
          <div
            className="flex-1 min-w-0 flex flex-col min-h-64 lg:min-h-0 border-b lg:border-b-0 lg:border-r"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>Guión</span>
              <div style={{ flex: 1 }} />

              {/* Translate */}
              {lines.some(l => l.text.trim()) && (
                <div style={{ position: 'relative' }} ref={langPickerRef}>
                  <button
                    onClick={() => setShowLangPicker(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: showLangPicker ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}
                  >
                    Traducir <ChevronDown style={{ width: '12px', height: '12px' }} />
                  </button>
                  {showLangPicker && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', minWidth: '140px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                      {DIALOGUE_LANGUAGES.map(lang => (
                        <button key={lang.code}
                          onClick={() => { setShowLangPicker(false); translateText(LANG_MAP[lang.code] ?? lang.code.toUpperCase()) }}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: '13px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af' }}
                        >{lang.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Import */}
              <label
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Importar
                <input type="file" accept=".txt,.pdf,.doc,.docx" className="hidden"
                       onChange={async e => {
                         const f = e.target.files?.[0]
                         if (!f) return
                         if (f.name.toLowerCase().endsWith('.txt')) {
                           const reader = new FileReader()
                           reader.onload = ev => importText(ev.target?.result as string ?? '')
                           reader.readAsText(f)
                         } else {
                           const formData = new FormData()
                           formData.append('file', f)
                           const res = await fetch('/api/extract-text', { method: 'POST', body: formData })
                           const data = await res.json()
                           if (data.text) importText(data.text)
                         }
                         e.target.value = ''
                       }} />
              </label>

              {/* Example */}
              <button
                onClick={() => importText(EXAMPLE)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                Ejemplo
              </button>

              {/* Clear */}
              {lines.some(l => l.text.trim()) && (
                <button
                  onClick={() => { setLines([{ id: uid(), characterName: lines[0]?.characterName ?? 'Personaje 1', text: '' }]); setAudioUrl(null); setError(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', cursor: 'pointer' }}
                >
                  <X style={{ width: '13px', height: '13px' }} /> Limpiar
                </button>
              )}
            </div>

            {/* Line list */}
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {isTranslating && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', fontSize: '12px', color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
                  Traduciendo...
                </div>
              )}

              {lines.map((line, idx) => {
                const char = characters.find(c => c.name === line.characterName)
                const isActive = selectedLineId === line.id
                const isDraggingOver = dragOverIdx === idx

                return (
                  <div
                    key={line.id}
                    draggable
                    onDragStart={() => setDraggedIdx(idx)}
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null) }}
                    onClick={() => setSelectedLineId(line.id)}
                    className="group"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 16px 10px 12px',
                      borderLeft: isActive ? '2px solid rgba(255,255,255,0.35)' : '2px solid transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isDraggingOver ? 'rgba(255,255,255,0.04)' : isActive ? 'rgba(255,255,255,0.03)' : 'transparent',
                      cursor: 'text',
                      opacity: draggedIdx === idx ? 0.4 : 1,
                      transition: 'background 0.1s, border-color 0.1s, opacity 0.15s',
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      style={{ cursor: 'grab', color: 'rgba(255,255,255,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      className="group-hover:text-white/30 transition-colors"
                    >
                      <GripVertical style={{ width: '14px', height: '14px' }} />
                    </div>

                    {/* Character avatar (click to change) */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setPickerLineId(pickerLineId === line.id ? null : line.id); setNewCharInput('') }}
                        title={line.characterName}
                        style={{
                          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                          background: char?.color ?? '#60a5fa',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, color: '#000',
                        }}
                      >
                        {line.characterName.charAt(0).toUpperCase()}
                      </button>

                      {/* Character picker dropdown */}
                      {pickerLineId === line.id && (
                        <div
                          ref={pickerRef}
                          onClick={e => e.stopPropagation()}
                          style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100, background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px', minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
                        >
                          {characters.map(c => (
                            <button
                              key={c.name}
                              onClick={() => changeLineCharacter(line.id, c.name)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: line.characterName === c.name ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = line.characterName === c.name ? 'rgba(255,255,255,0.06)' : 'transparent')}
                            >
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#000' }}>
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '13px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                              {line.characterName === c.name && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7280' }}>✓</span>}
                            </button>
                          ))}
                          {/* New character */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '4px' }}>
                            {newCharInput !== null && (
                              <div style={{ display: 'flex', gap: '4px', padding: '2px' }}>
                                <input
                                  autoFocus
                                  value={newCharInput}
                                  onChange={e => setNewCharInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && newCharInput.trim()) changeLineCharacter(line.id, newCharInput.trim())
                                    if (e.key === 'Escape') { setNewCharInput(''); setPickerLineId(null) }
                                  }}
                                  placeholder="Nuevo personaje..."
                                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', color: '#e2e8f0', outline: 'none' }}
                                />
                              </div>
                            )}
                            <button
                              onClick={() => setNewCharInput(prev => prev === '' ? ' ' : '')}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280' }}
                            >
                              <Plus style={{ width: '12px', height: '12px' }} />
                              Nuevo personaje
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text input */}
                    <input
                      id={`line-input-${line.id}`}
                      type="text"
                      value={line.text}
                      onChange={e => updateLine(line.id, { text: e.target.value })}
                      onFocus={() => setSelectedLineId(line.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addLine(line.characterName) }
                        if (e.key === 'Backspace' && !line.text && lines.length > 1) {
                          e.preventDefault()
                          deleteLine(line.id)
                          const prevLine = lines[idx - 1]
                          if (prevLine) {
                            setSelectedLineId(prevLine.id)
                            setTimeout(() => document.getElementById(`line-input-${prevLine.id}`)?.focus(), 10)
                          }
                        }
                      }}
                      placeholder="Escribe el texto..."
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'rgba(255,255,255,0.85)', minWidth: 0 }}
                      className="placeholder:text-white/20"
                    />

                    {/* Delete button (hover) */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteLine(line.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', flexShrink: 0, borderRadius: '4px' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                    >
                      <X style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                )
              })}

              {/* Add line button */}
              <button
                onClick={() => addLine()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px 10px 40px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              >
                <Plus style={{ width: '14px', height: '14px' }} />
                Añadir línea
              </button>
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {lines.length} {lines.length === 1 ? 'línea' : 'líneas'}
                  {totalChars > 0 && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#444444' }}>
                      · {totalChars.toLocaleString('es-ES')} créditos
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Personajes + Audio ── */}
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col min-h-0">

            {/* Sliding pill tabs */}
            <div style={{ padding: '12px', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', background: '#111111', borderRadius: '8px', padding: '4px' }}>
                <div style={{ position: 'absolute', top: '4px', bottom: '4px', left: '4px', width: 'calc(50% - 4px)', background: '#222222', borderRadius: '6px', transform: rightTab === 'personajes' ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 200ms ease-out' }} />
                <button onClick={() => setRightTab('personajes')} style={{ position: 'relative', zIndex: 10, flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: rightTab === 'personajes' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>
                  Personajes
                </button>
                <button onClick={() => setRightTab('audio')} style={{ position: 'relative', zIndex: 10, flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: rightTab === 'audio' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>
                  Audio
                </button>
              </div>
            </div>

            {/* Personajes tab */}
            {rightTab === 'personajes' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '20px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>Personajes</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {characters.map(char => (
                      <div key={char.name} style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: char.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#000', flexShrink: 0 }}>
                            {char.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char.name}</p>
                            <p style={{ fontSize: '11px', color: '#4b5563' }}>
                              {lines.filter(l => l.characterName === char.name).length} líneas
                            </p>
                          </div>
                        </div>

                        {/* Voice button */}
                        <button
                          onClick={() => setSelectingVoiceFor(char.name)}
                          style={{ width: '100%', textAlign: 'left', background: char.voiceId ? '#0d0d0d' : 'transparent', border: char.voiceId ? '1px solid rgba(255,255,255,0.08)' : '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = char.voiceId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)')}
                        >
                          <Mic style={{ width: '13px', height: '13px', color: '#6b7280', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: char.voiceId ? '#9ca3af' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {char.voiceId ? char.voiceName : 'Seleccionar voz →'}
                          </span>
                          {char.voiceId && (
                            <button
                              onClick={e => { e.stopPropagation(); updateCharacter(char.name, { voiceId: '', voiceName: 'Voz estándar' }) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0, flexShrink: 0 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                            >
                              <X style={{ width: '12px', height: '12px' }} />
                            </button>
                          )}
                        </button>

                        {/* Speed + Volume sliders */}
                        {[
                          { label: 'Velocidad', key: 'speed' as const, min: 0.5, max: 2, step: 0.05, val: char.speed, fmt: (v: number) => `${v.toFixed(1)}x` },
                          { label: 'Volumen',   key: 'volume' as const, min: 0,   max: 2, step: 0.05, val: char.volume, fmt: (v: number) => `${Math.round(v * 100)}%` },
                        ].map(({ label, key, min, max, step, val, fmt }) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '0 4px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', height: '36px', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888', width: '60px', flexShrink: 0 }}>{label}</span>
                            <input type="range" min={min} max={max} step={step} value={val}
                                   onChange={e => updateCharacter(char.name, { [key]: parseFloat(e.target.value) })}
                                   className="flex-1 accent-white h-1" />
                            <span style={{ fontSize: '11px', color: '#6b7280', width: '32px', textAlign: 'right', flexShrink: 0 }}>{fmt(val)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio settings */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>Configuración de audio</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111111', borderRadius: '10px', height: '40px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>Pausa entre líneas</span>
                      <select value={pauseBetweenLines} onChange={e => setPauseBetweenLines(Number(e.target.value))} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer' }}>
                        <option value={0} style={{ background: '#111' }}>Sin pausa</option>
                        <option value={300} style={{ background: '#111' }}>0.3s</option>
                        <option value={500} style={{ background: '#111' }}>0.5s</option>
                        <option value={1000} style={{ background: '#111' }}>1s</option>
                        <option value={1500} style={{ background: '#111' }}>1.5s</option>
                        <option value={2000} style={{ background: '#111' }}>2s</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111111', borderRadius: '10px', height: '40px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>Formato</span>
                      <div style={{ position: 'relative', display: 'flex', background: '#000000', borderRadius: '6px', padding: '2px' }}>
                        <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc(50% - 2px)', background: '#222222', borderRadius: '4px', transform: outputFormat === 'mp3' ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 200ms ease-out' }} />
                        <button onClick={() => setOutputFormat('mp3')} style={{ position: 'relative', zIndex: 10, padding: '2px 10px', fontSize: '11px', fontWeight: 500, color: outputFormat === 'mp3' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>MP3</button>
                        <button onClick={() => setOutputFormat('wav')} style={{ position: 'relative', zIndex: 10, padding: '2px 10px', fontSize: '11px', fontWeight: 500, color: outputFormat === 'wav' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>WAV</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: credits < totalChars && totalChars > 0 ? 'rgba(239,68,68,0.08)' : '#111111', border: credits < totalChars && totalChars > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent', borderRadius: '10px', height: '40px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>Créditos</span>
                      <span style={{ fontSize: '12px', color: credits < totalChars && totalChars > 0 ? '#f87171' : '#6b7280' }}>{credits.toLocaleString()} disponibles</span>
                    </div>
                  </div>
                  {!hasAllVoices && characters.length > 0 && (
                    <p style={{ fontSize: '11px', color: '#d97706', marginTop: '10px', padding: '8px 12px', background: 'rgba(251,191,36,0.06)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.15)' }}>
                      Asigna una voz a cada personaje para generar
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Audio tab */}
            {rightTab === 'audio' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {!audioUrl && !isGenerating ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 0', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#111111', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music2 style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                    <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>El audio aparecerá aquí</p>
                    <p style={{ fontSize: '11px', color: '#374151' }}>Genera el diálogo para escucharlo</p>
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
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio ref={audioRef} src={audioUrl}
                           onPlay={() => setIsPlaying(true)}
                           onPause={() => setIsPlaying(false)}
                           onEnded={() => { setIsPlaying(false); setCurrentTime(0) }}
                           onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                           onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)} />

                    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '14px', cursor: 'pointer' }}
                           onClick={e => { if (!audioRef.current || !duration) return; const rect = e.currentTarget.getBoundingClientRect(); audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration }}>
                        <div style={{ height: '100%', borderRadius: '9999px', width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: '#ffffff', transition: 'width 0.1s linear' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
                                style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isPlaying ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px', marginLeft: '2px' }} />}
                        </button>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', flex: 1 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        <button onClick={handleGenerate} disabled={!canGenerate || isGenerating} style={{ fontSize: '11px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')} onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}>
                          ↻
                        </button>
                      </div>
                    </div>

                    <a href={audioUrl} download={`dialogo.${outputFormat}`}
                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}
                       onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
                       onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af' }}>
                      <Download style={{ width: '14px', height: '14px' }} />
                      Descargar {outputFormat.toUpperCase()}
                    </a>

                    {generationHistory.length > 1 && (
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b5563', marginBottom: '8px' }}>Anteriores</p>
                        {generationHistory.slice(1).map((entry, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#111111', borderRadius: '8px', marginBottom: '4px' }}>
                            <Music2 style={{ width: '13px', height: '13px', color: '#4b5563', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#6b7280', flex: 1 }}>
                              {new Date(entry.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {entry.format.toUpperCase()}
                            </span>
                            <a href={entry.url} download={`dialogo-${i + 2}.${entry.format}`} style={{ color: '#4b5563', textDecoration: 'none' }}
                               onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')} onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}>
                              <Download style={{ width: '13px', height: '13px' }} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

          {/* Generate button — pinned to bottom of right panel */}
          <div style={{ flexShrink: 0, padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {error && (
              <div style={{ marginBottom: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
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

      {/* VoiceBrowser modal */}
      {selectingVoiceFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectingVoiceFor(null)} />
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-white">Seleccionar voz</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Para: <span style={{ color: characters.find(c => c.name === selectingVoiceFor)?.color }}>{selectingVoiceFor}</span>
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
                  assignVoice(selectingVoiceFor, voice.referenceId, voice.name)
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
