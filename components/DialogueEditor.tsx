'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { EliteLoader } from '@/components/ui/EliteLoader'
import {
  Play, Pause, Download, Loader2, X, Upload, Plus, Music2, GripVertical, Mic, ChevronDown,
} from 'lucide-react'
import { VoiceBrowser, SelectedVoice } from '@/app/dashboard/VoiceBrowser'
import { useLang } from '@/app/dashboard/LanguageContext'
import { downloadAudio } from '@/lib/downloadAudio'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DialogueLine { id: string; characterName: string; text: string }
interface Character {
  name: string; voiceId: string; voiceName: string
  model: 'elite-pro' | 'elite-legacy' | 'elite-turbo'
  color: string
}
interface GenerationEntry { url: string; format: 'mp3' | 'wav'; createdAt: number }
interface Voice { id: string; name: string; model?: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444']

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

function uid() { return Math.random().toString(36).slice(2, 10) }

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function parseScript(raw: string): { characterName: string; text: string }[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const pattern = /^\(([^)]+)\)\s*(.+)$/
  const matched = lines.filter(l => pattern.test(l))
  if (matched.length >= Math.max(1, Math.ceil(lines.length * 0.5))) {
    return matched.map(l => {
      const m = l.match(pattern)!
      return { characterName: m[1].trim(), text: m[2].trim() }
    })
  }
  return lines.map(l => ({ characterName: 'Narrador', text: l }))
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userVoices: Voice[]
  plan: string
  credits: number
  onCreditsUpdate: (n: number) => void
  language?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DialogueEditor({ userVoices, plan, credits, onCreditsUpdate, language }: Props) {
  const { t } = useLang()

  const [lines, setLines] = useState<DialogueLine[]>(() => [
    { id: uid(), characterName: 'Narrador', text: 'Era una noche oscura y tormentosa.' },
    { id: uid(), characterName: 'Personaje 1', text: '¿Has escuchado lo que pasó anoche?' },
    { id: uid(), characterName: 'Personaje 2', text: 'No, cuéntame. Estaba durmiendo.' },
  ])
  const [characters, setCharacters] = useState<Character[]>([
    { name: 'Narrador',    voiceId: '', voiceName: '', model: 'elite-pro', color: CHAR_COLORS[0] },
    { name: 'Personaje 1', voiceId: '', voiceName: '', model: 'elite-pro', color: CHAR_COLORS[1] },
    { name: 'Personaje 2', voiceId: '', voiceName: '', model: 'elite-pro', color: CHAR_COLORS[2] },
  ])

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [pickerLineId,   setPickerLineId]   = useState<string | null>(null)
  const [newCharInput,   setNewCharInput]   = useState('')

  const [draggedIdx,  setDraggedIdx]  = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isGenerating,       setIsGenerating]       = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [audioUrl,           setAudioUrl]           = useState<string | null>(null)
  const [error,              setError]              = useState<string | null>(null)
  const [generationHistory,  setGenerationHistory]  = useState<GenerationEntry[]>([])

  const [pauseBetweenLines, setPauseBetweenLines] = useState(500)
  const [outputFormat,      setOutputFormat]      = useState<'mp3' | 'wav'>('mp3')

  const [isPlaying,   setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)

  const [selectingVoiceFor, setSelectingVoiceFor] = useState<string | null>(null)
  const [isImporting,       setIsImporting]       = useState(false)
  const [showLangPicker,    setShowLangPicker]    = useState(false)
  const [isTranslating,     setIsTranslating]     = useState(false)

  const audioRef     = useRef<HTMLAudioElement>(null)
  const pickerRef    = useRef<HTMLDivElement>(null)
  const langRef      = useRef<HTMLDivElement>(null)
  const prevLanguage = useRef(language)
  const pollingActive = useRef(false)

  // ─── Derived ────────────────────────────────────────────────────────────────

  const totalChars    = lines.reduce((s, l) => s + l.text.length, 0)
  const hasAllVoices  = lines.length > 0 && lines.every(l => characters.find(c => c.name === l.characterName)?.voiceId)
  const canGenerate   = hasAllVoices && lines.some(l => l.text.trim()) && credits >= totalChars
  const allLinesEmpty = lines.every(l => !l.text.trim())

  // ─── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  // ─── Script parsing ─────────────────────────────────────────────────────────

  function applyParsed(parsed: { characterName: string; text: string }[]) {
    if (!parsed.length) return
    setCharacters(prev => {
      const next = [...prev]
      for (const { characterName } of parsed) {
        if (!next.find(c => c.name === characterName)) {
          next.push({ name: characterName, voiceId: '', voiceName: '', model: 'elite-pro', color: CHAR_COLORS[next.length % CHAR_COLORS.length] })
        }
      }
      return next
    })
    setLines(parsed.map(({ characterName, text: t }) => ({ id: uid(), characterName, text: t })))
    setAudioUrl(null)
    setError(null)
    const uniqueChars = new Set(parsed.map(p => p.characterName)).size
    showToast(t.dialogue.linesFound.replace('{n}', String(parsed.length)).replace('{m}', String(uniqueChars)))
  }

  function handlePasteText(raw: string) {
    const parsed = parseScript(raw)
    if (parsed.length) applyParsed(parsed)
  }

  // ─── Line helpers ────────────────────────────────────────────────────────────

  function addLine(charName?: string) {
    const name = charName ?? lines[lines.length - 1]?.characterName ?? 'Personaje 1'
    setCharacters(prev => prev.find(c => c.name === name) ? prev : [...prev, { name, voiceId: '', voiceName: '', model: 'elite-pro', color: CHAR_COLORS[prev.length % CHAR_COLORS.length] }])
    const newLine: DialogueLine = { id: uid(), characterName: name, text: '' }
    setLines(prev => [...prev, newLine])
    setSelectedLineId(newLine.id)
    setTimeout(() => document.getElementById(`di-${newLine.id}`)?.focus(), 30)
  }

  function deleteLine(id: string) {
    setLines(prev => {
      const next = prev.filter(l => l.id !== id)
      return next.length > 0 ? next : [{ id: uid(), characterName: prev[0]?.characterName ?? 'Personaje 1', text: '' }]
    })
    if (selectedLineId === id) setSelectedLineId(null)
  }

  function changeLineChar(lineId: string, charName: string) {
    setCharacters(prev => prev.find(c => c.name === charName) ? prev : [...prev, { name: charName, voiceId: '', voiceName: '', model: 'elite-pro', color: CHAR_COLORS[prev.length % CHAR_COLORS.length] }])
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, characterName: charName } : l))
    setPickerLineId(null)
    setNewCharInput('')
  }

  function updateChar(name: string, updates: Partial<Character>) {
    setCharacters(prev => prev.map(c => c.name === name ? { ...c, ...updates } : c))
  }

  function handleDrop(overIdx: number) {
    if (draggedIdx === null || draggedIdx === overIdx) return
    const next = [...lines]
    const [removed] = next.splice(draggedIdx, 1)
    next.splice(overIdx, 0, removed)
    setLines(next)
    setDraggedIdx(null); setDragOverIdx(null)
  }

  const assignVoice = useCallback((charName: string, voiceId: string, voiceName: string) => {
    updateChar(charName, { voiceId, voiceName })
    setSelectingVoiceFor(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(file: File) {
    setIsImporting(true)
    try {
      let text = ''
      if (file.name.toLowerCase().endsWith('.txt')) {
        text = await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onload = ev => resolve(ev.target?.result as string ?? '')
          reader.readAsText(file)
        })
      } else {
        const fd = new FormData(); fd.append('file', file)
        const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
        const data = await res.json()
        text = data.text ?? ''
      }
      if (text) handlePasteText(text)
    } catch (err) { console.error('Import failed:', err) }
    finally { setIsImporting(false) }
  }

  // ─── Translation ─────────────────────────────────────────────────────────────

  const translateLines = useCallback(async (targetLang: string) => {
    if (!lines.some(l => l.text.trim())) return
    setIsTranslating(true)
    const rawText = lines.map(l => `(${l.characterName}) ${l.text}`).join('\n')
    try {
      const res = await fetch('/api/translate-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, targetLang }),
      })
      const data = await res.json()
      if (data.translatedText) {
        const parsed = parseScript(data.translatedText)
        if (parsed.length) setLines(parsed.map(({ characterName, text: t }) => ({ id: uid(), characterName, text: t })))
      }
    } catch (err) { console.error('Translation error:', err) }
    finally { setIsTranslating(false) }
  }, [lines]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (language && language !== prevLanguage.current && lines.some(l => l.text.trim())) {
      translateLines(LANG_MAP[language] ?? language.toUpperCase())
    }
    prevLanguage.current = language
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Outside click handlers ──────────────────────────────────────────────────

  useEffect(() => {
    if (!pickerLineId) return
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) { setPickerLineId(null); setNewCharInput('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [pickerLineId])

  useEffect(() => {
    if (!showLangPicker) return
    const h = (e: MouseEvent) => { if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangPicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showLangPicker])

  // ─── Generate (async: fire-and-forget + polling) ─────────────────────────────

  async function handleGenerate() {
    if (!canGenerate) return
    setIsGenerating(true); setAudioUrl(null); setError(null); setGenerationProgress(5)
    pollingActive.current = true

    const filteredLines = lines.filter(l => l.text.trim())
    const estimatedMs = filteredLines.length * 3500

    try {
      // Step 1: Start job — returns immediately with jobId
      const res = await fetch('/api/dialogue/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: filteredLines.map(line => {
            const char = characters.find(c => c.name === line.characterName)!
            return { text: line.text, voiceId: char.voiceId, model: char.model, characterName: char.name }
          }),
          outputFormat, pauseBetweenLines,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al generar'); return }

      const { jobId, creditsRemaining } = data
      onCreditsUpdate(creditsRemaining)

      // Step 2: Poll /api/dialogue/status/{jobId} every 3 s, max 10 min
      const MAX_ATTEMPTS = 200
      const startTime = Date.now()

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, 3000))
        if (!pollingActive.current) return

        // Animate progress based on elapsed time vs estimate
        const elapsed = Date.now() - startTime
        setGenerationProgress(Math.min(90, Math.round(10 + (elapsed / estimatedMs) * 80)))

        try {
          const statusRes = await fetch(`/api/dialogue/status/${jobId}`)
          if (!statusRes.ok) continue
          const statusData = await statusRes.json()

          if (statusData.status === 'done') {
            setGenerationProgress(100)
            setAudioUrl(statusData.audioUrl)
            setIsPlaying(false); setCurrentTime(0); setDuration(0)
            setGenerationHistory(prev =>
              [{ url: statusData.audioUrl, format: outputFormat, createdAt: Date.now() }, ...prev].slice(0, 5)
            )
            return
          }

          if (statusData.status === 'error') {
            setError(statusData.error ?? 'Error al generar')
            return
          }
          // pending | processing → keep polling
        } catch {
          // Network error during poll — continue
        }
      }

      // Timeout after 10 min
      setError(t.dialogue.networkError)
    } catch {
      setError(t.dialogue.networkError)
    } finally {
      setIsGenerating(false)
      pollingActive.current = false
    }
  }

  // ─── Example ─────────────────────────────────────────────────────────────────

  const EXAMPLE = `(Narrador) Era una noche oscura y tormentosa.
(Personaje 1) ¿Has escuchado lo que pasó anoche?
(Personaje 2) No, cuéntame. Estaba durmiendo.
(Personaje 1) Alguien entró en la casa abandonada.
(Personaje 2) ¡No puede ser!
(Narrador) Y así comenzó la aventura.`

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ background: '#000000', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}
      >
        {/* Top bar — full width, no scroll */}
        <div className="flex items-center gap-2 flex-shrink-0 border-b border-white/[0.06]" style={{ padding: '10px 16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>{t.dialogue.script}</span>
              <div style={{ flex: 1 }} />

              {/* Translate */}
              {lines.some(l => l.text.trim()) && (
                <div style={{ position: 'relative' }} ref={langRef}>
                  <button
                    onClick={() => setShowLangPicker(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: showLangPicker ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}
                  >
                    {isTranslating
                      ? <><Loader2 style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} /> {t.dialogue.translating}</>
                      : <>{t.dialogue.translate} <ChevronDown style={{ width: '11px', height: '11px' }} /></>
                    }
                  </button>
                  {showLangPicker && (
                    <div className="glass-menu" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, padding: '4px', minWidth: '140px' }}>
                      {DIALOGUE_LANGUAGES.map(lang => (
                        <button key={lang.code}
                          onClick={() => { setShowLangPicker(false); translateLines(LANG_MAP[lang.code] ?? lang.code.toUpperCase()) }}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: '13px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                        >{lang.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Import */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                {t.dialogue.import}
                <input type="file" accept=".txt,.pdf,.doc,.docx" className="hidden"
                  onChange={async e => { const f = e.target.files?.[0]; if (f) await handleImport(f); e.target.value = '' }}
                />
              </label>

              {/* Ejemplo */}
              <button
                onClick={() => handlePasteText(EXAMPLE)}
                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >{t.dialogue.example}</button>

              {/* Limpiar */}
              {lines.some(l => l.text.trim()) && (
                <button
                  onClick={() => { setLines([{ id: uid(), characterName: lines[0]?.characterName ?? 'Narrador', text: '' }]); setAudioUrl(null); setError(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', cursor: 'pointer' }}
                >
                  <X style={{ width: '13px', height: '13px' }} /> {t.dialogue.clear}
                </button>
              )}
        </div>

        {/* Two-column area */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Line editor ── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-white/[0.08]">

            {/* Paste zone — shown when all lines are empty */}
            {allLinesEmpty && (
              <div className="flex-shrink-0 px-4 pt-3">
                <textarea
                  placeholder={t.dialogue.scriptPlaceholder}
                  rows={3}
                  onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text'); if (t.trim()) handlePasteText(t) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      const val = (e.target as HTMLTextAreaElement).value.trim()
                      if (val) { e.preventDefault(); handlePasteText(val) }
                    }
                  }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
                  className="placeholder:text-white/20"
                />
              </div>
            )}

            {/* Line list */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
              {lines.map((line, idx) => {
                const char = characters.find(c => c.name === line.characterName)
                const isActive = selectedLineId === line.id
                const isDragOver = dragOverIdx === idx
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
                      borderLeft: isActive ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isDragOver ? 'rgba(255,255,255,0.04)' : isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                      opacity: draggedIdx === idx ? 0.4 : 1,
                      transition: 'background 0.1s, border-color 0.1s',
                      cursor: 'text',
                    }}
                  >
                    {/* Drag handle */}
                    <div style={{ cursor: 'grab', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}
                      className="group-hover:!text-white/30 transition-colors">
                      <GripVertical style={{ width: '14px', height: '14px' }} />
                    </div>

                    {/* Avatar + picker */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setPickerLineId(pickerLineId === line.id ? null : line.id); setNewCharInput('') }}
                        title={line.characterName}
                        style={{ width: '30px', height: '30px', borderRadius: '50%', background: char?.color ?? CHAR_COLORS[0], border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}
                      >
                        {line.characterName.charAt(0).toUpperCase()}
                      </button>

                      {pickerLineId === line.id && (
                        <div
                          ref={pickerRef}
                          onClick={e => e.stopPropagation()}
                          className="glass-menu"
                          style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100, padding: '6px', minWidth: '180px' }}
                        >
                          {characters.map(c => (
                            <button key={c.name} onClick={() => changeLineChar(line.id, c.name)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: line.characterName === c.name ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = line.characterName === c.name ? 'rgba(255,255,255,0.06)' : 'transparent')}
                            >
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff' }}>
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '13px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                              {line.characterName === c.name && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7280' }}>✓</span>}
                            </button>
                          ))}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '4px', padding: '4px 4px 2px' }}>
                            <input
                              value={newCharInput}
                              onChange={e => setNewCharInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && newCharInput.trim()) changeLineChar(line.id, newCharInput.trim())
                                if (e.key === 'Escape') { setNewCharInput(''); setPickerLineId(null) }
                              }}
                              placeholder={t.dialogue.newCharPlaceholder}
                              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', color: '#e2e8f0', outline: 'none', marginBottom: '4px' }}
                            />
                            <button
                              onClick={() => { if (newCharInput.trim()) changeLineChar(line.id, newCharInput.trim()) }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9ca3af' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' }}
                            >
                              <Plus style={{ width: '12px', height: '12px' }} /> {t.dialogue.newChar}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text input */}
                    <input
                      id={`di-${line.id}`}
                      type="text"
                      value={line.text}
                      onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, text: e.target.value } : l))}
                      onFocus={() => setSelectedLineId(line.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addLine(line.characterName) }
                        if (e.key === 'Backspace' && !line.text && lines.length > 1) {
                          e.preventDefault()
                          deleteLine(line.id)
                          const prev = lines[idx - 1]
                          if (prev) { setSelectedLineId(prev.id); setTimeout(() => document.getElementById(`di-${prev.id}`)?.focus(), 10) }
                        }
                      }}
                      onPaste={e => {
                        const text = e.clipboardData.getData('text')
                        if (text.includes('\n') && /^\(([^)]+)\)\s*(.+)$/.test(text.split('\n')[0].trim())) {
                          e.preventDefault(); handlePasteText(text)
                        }
                      }}
                      placeholder={t.dialogue.lineInputPlaceholder}
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'rgba(255,255,255,0.85)', minWidth: 0 }}
                      className="placeholder:text-white/20"
                    />

                    {/* Delete (hover) */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteLine(line.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', flexShrink: 0, borderRadius: '4px' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'none' }}
                    >
                      <X style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>
                )
              })}

              {/* Add line */}
              <button
                onClick={() => addLine()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px 10px 40px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
              >
                <Plus style={{ width: '14px', height: '14px' }} /> {t.dialogue.addLine.replace('+ ', '')}
              </button>
            </div>

            {/* Bottom status bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 border-t border-white/[0.06]" style={{ padding: '10px 16px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                {lines.length} {lines.length === 1 ? t.dialogue.lineSingular : t.dialogue.linePlural}
                {totalChars > 0 && <span style={{ marginLeft: '8px', color: 'rgba(255,255,255,0.2)' }}>· {totalChars.toLocaleString('es-ES')} {t.generate.credits}</span>}
              </span>
              {isGenerating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px' }}>
                  <div style={{ flex: 1, height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '9999px', width: `${generationProgress}%`, background: '#ffffff', transition: 'width 0.8s linear' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>{generationProgress}%</span>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Panel ── */}
          <div className="w-[300px] flex-shrink-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-3 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '20px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

              {/* PERSONAJES */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>{t.dialogue.characters}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {characters.map(char => (
                    <div key={char.name} style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: char.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {char.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char.name}</p>
                          <p style={{ fontSize: '11px', color: '#4b5563' }}>{lines.filter(l => l.characterName === char.name).length} {t.dialogue.linePlural}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectingVoiceFor(char.name)}
                        style={{ width: '100%', textAlign: 'left', background: char.voiceId ? '#0d0d0d' : 'transparent', border: char.voiceId ? '1px solid rgba(255,255,255,0.08)' : '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = char.voiceId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)')}
                      >
                        <Mic style={{ width: '13px', height: '13px', color: '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: char.voiceId ? '#9ca3af' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {char.voiceId ? char.voiceName : t.dialogue.assignVoice}
                        </span>
                        {char.voiceId && (
                          <button onClick={e => { e.stopPropagation(); updateChar(char.name, { voiceId: '', voiceName: '' }) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0, flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                          >
                            <X style={{ width: '12px', height: '12px' }} />
                          </button>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                {!hasAllVoices && characters.length > 0 && (
                  <p style={{ fontSize: '11px', color: '#d97706', marginTop: '10px', padding: '8px 12px', background: 'rgba(251,191,36,0.06)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.15)' }}>
                    {t.dialogue.assignVoiceHint}
                  </p>
                )}
              </div>

              {/* CONFIGURACIÓN DE AUDIO */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>{t.dialogue.audioConfig}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111111', borderRadius: '10px', height: '40px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>{t.dialogue.pauseBetween}</span>
                    <select value={pauseBetweenLines} onChange={e => setPauseBetweenLines(Number(e.target.value))} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer' }}>
                      <option value={0} style={{ background: '#111' }}>{t.dialogue.noPause}</option>
                      <option value={300} style={{ background: '#111' }}>0.3s</option>
                      <option value={500} style={{ background: '#111' }}>0.5s</option>
                      <option value={1000} style={{ background: '#111' }}>1s</option>
                      <option value={1500} style={{ background: '#111' }}>1.5s</option>
                      <option value={2000} style={{ background: '#111' }}>2s</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#111111', borderRadius: '10px', height: '40px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>{t.dialogue.format}</span>
                    <div style={{ position: 'relative', display: 'flex', background: '#000000', borderRadius: '6px', padding: '2px' }}>
                      <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc(50% - 2px)', background: '#222222', borderRadius: '4px', transform: outputFormat === 'mp3' ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 200ms ease-out' }} />
                      <button onClick={() => setOutputFormat('mp3')} style={{ position: 'relative', zIndex: 10, padding: '2px 10px', fontSize: '11px', fontWeight: 500, color: outputFormat === 'mp3' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>MP3</button>
                      <button onClick={() => setOutputFormat('wav')} style={{ position: 'relative', zIndex: 10, padding: '2px 10px', fontSize: '11px', fontWeight: 500, color: outputFormat === 'wav' ? '#fff' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 200ms ease-out' }}>WAV</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: credits < totalChars && totalChars > 0 ? 'rgba(239,68,68,0.08)' : '#111111', border: credits < totalChars && totalChars > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent', borderRadius: '10px', height: '40px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#888888' }}>{t.dialogue.credits}</span>
                    <span style={{ fontSize: '12px', color: credits < totalChars && totalChars > 0 ? '#f87171' : '#6b7280' }}>{credits.toLocaleString()} {t.dialogue.creditsAvailable}</span>
                  </div>
                </div>
              </div>

              {/* AUDIO */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>{t.dialogue.audio}</p>
                {error && (
                  <div style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>{error}</div>
                )}
                {!audioUrl && !isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '28px 0', gap: '10px', background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music2 style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{t.dialogue.audioHere}</p>
                  </div>
                ) : isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '28px 0', gap: '12px', background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                    <Loader2 style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.3)', animation: 'spin 1s linear infinite' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>{t.dialogue.generating}</p>
                      <p style={{ fontSize: '11px', color: '#374151', marginTop: '4px' }}>{generationProgress}%</p>
                    </div>
                  </div>
                ) : audioUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio ref={audioRef} src={audioUrl}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => { setIsPlaying(false); setCurrentTime(0) }}
                      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                      onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
                    />
                    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '14px', cursor: 'pointer' }}
                        onClick={e => { if (!audioRef.current || !duration) return; const r = e.currentTarget.getBoundingClientRect(); audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration }}>
                        <div style={{ height: '100%', borderRadius: '9999px', width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: '#ffffff', transition: 'width 0.1s linear' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isPlaying ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px', marginLeft: '2px' }} />}
                        </button>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', flex: 1 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadAudio(audioUrl, `dialogo.${outputFormat}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px', color: '#9ca3af', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#9ca3af'; }}
                    >
                      <Download style={{ width: '14px', height: '14px' }} />
                      {t.dialogue.download} {outputFormat.toUpperCase()}
                    </button>
                    {generationHistory.length > 1 && (
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b5563', marginBottom: '6px' }}>{t.dialogue.previous}</p>
                        {generationHistory.slice(1).map((entry, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#111111', borderRadius: '8px', marginBottom: '4px' }}>
                            <Music2 style={{ width: '13px', height: '13px', color: '#4b5563', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#6b7280', flex: 1 }}>
                              {new Date(entry.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {entry.format.toUpperCase()}
                            </span>
                            <button
                              onClick={() => downloadAudio(entry.url, `dialogo-${i + 2}.${entry.format}`)}
                              style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; }}
                            >
                              <Download style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Generate button — pinned bottom */}
            <div className="flex-shrink-0 p-3 border-t border-white/[0.06]" style={{ background: '#000000' }}>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#000000', border: 'none', cursor: !canGenerate || isGenerating ? 'not-allowed' : 'pointer', background: '#ffffff', boxShadow: !canGenerate || isGenerating ? 'none' : '0 4px 15px rgba(255,255,255,0.1)', opacity: !canGenerate || isGenerating ? 0.5 : 1 }}
              >
                {isGenerating
                  ? <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> {t.dialogue.generating}</>
                  : <><Play style={{ width: '14px', height: '14px' }} /> {t.dialogue.generateBtn}</>
                }
              </button>
            </div>
          </div>
        </div>{/* end two-column area */}
      </div>{/* end h-full container */}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#111111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', color: '#e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          ✓ {toast}
        </div>
      )}

      {/* VoiceBrowser modal */}
      {selectingVoiceFor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectingVoiceFor(null)} />
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-white">{t.dialogue.selectVoice}</h3>
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

      {/* Importing overlay */}
      {isImporting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#111] border border-white/10 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <EliteLoader />
            <p className="text-sm text-white/70 font-medium">{t.dialogue.importingFile}</p>
            <p className="text-xs text-white/30">{t.dialogue.extractingText}</p>
          </div>
        </div>
      )}
    </>
  )
}
