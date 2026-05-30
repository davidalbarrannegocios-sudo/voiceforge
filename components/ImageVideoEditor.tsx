'use client'

import { useState } from 'react'
import { Image as ImageIcon, Video, Sparkles, Upload, X, ChevronDown, Lock, Download } from 'lucide-react'

type Mode = 'image' | 'video'
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
type VideoModel = 'sora' | 'runway' | 'kling'

const IMAGE_MODELS = [
  // FLUX.2
  { id: 'flux-2-klein-4b', name: 'FLUX.2 Klein 4B', badge: 'Más barato',   credits: 571,  priceUsd: 0.02, group: 'FLUX.2' },
  { id: 'flux-2-pro',      name: 'FLUX.2 Pro',      badge: 'Rápido',        credits: 2285, priceUsd: 0.08, group: 'FLUX.2' },
  { id: 'flux-2-flex',     name: 'FLUX.2 Flex',     badge: null,            credits: 3142, priceUsd: 0.11, group: 'FLUX.2' },
  { id: 'flux-2-max',      name: 'FLUX.2 Max',      badge: 'Alta calidad',  credits: 3428, priceUsd: 0.12, group: 'FLUX.2' },
  { id: 'flux-2-klein-9b', name: 'FLUX.2 Klein 9B', badge: null,            credits: 6000, priceUsd: 0.21, group: 'FLUX.2' },
  // FLUX.1
  { id: 'flux-pro-1.1',       name: 'FLUX 1.1 Pro',       badge: 'Recomendado', credits: 2000, priceUsd: 0.07, group: 'FLUX.1' },
  { id: 'flux-pro-1.1-ultra', name: 'FLUX 1.1 Pro Ultra', badge: '4K',          credits: 2857, priceUsd: 0.10, group: 'FLUX.1' },
  { id: 'flux-kontext-pro',   name: 'FLUX Kontext Pro',   badge: 'Con edición', credits: 2000, priceUsd: 0.07, group: 'FLUX.1' },
  { id: 'flux-kontext-max',   name: 'FLUX Kontext Max',   badge: null,          credits: 3428, priceUsd: 0.12, group: 'FLUX.1' },
  { id: 'flux-pro-1.0-fill',  name: 'FLUX.1 Fill Pro',    badge: 'Inpainting',  credits: 2571, priceUsd: 0.09, group: 'FLUX.1' },
]

const VIDEO_MODELS: { id: VideoModel; name: string; locked: boolean }[] = [
  { id: 'sora',   name: 'Sora',   locked: true },
  { id: 'runway', name: 'Runway', locked: true },
  { id: 'kling',  name: 'Kling',  locked: true },
]

const ASPECT_RATIOS: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4']

const ASPECT_CLASSES: Record<string, string> = {
  '1:1':  'aspect-square',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '4:3':  'aspect-[4/3]',
  '3:4':  'aspect-[3/4]',
}

const groupedImageModels: Record<string, typeof IMAGE_MODELS> = {
  'FLUX.2': IMAGE_MODELS.filter(m => m.group === 'FLUX.2'),
  'FLUX.1': IMAGE_MODELS.filter(m => m.group === 'FLUX.1'),
}

interface HistoryItem {
  id: string
  prompt: string
  model: string
  aspectRatio: string
  images: string[]
  createdAt: Date
}

interface Props {
  credits: number
  onCreditsUpdate: (newCredits: number) => void
}

export function ImageVideoEditor({ credits, onCreditsUpdate }: Props) {
  const [mode, setMode] = useState<Mode>('image')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [showNegative, setShowNegative] = useState(false)
  const [imageModel, setImageModel] = useState('flux-pro-1.1')
  const [videoModel, setVideoModel] = useState<VideoModel>('sora')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [count, setCount] = useState(4)
  const [imageRefs, setImageRefs] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingPrompt, setPendingPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const selectedModelData = IMAGE_MODELS.find(m => m.id === imageModel)
  const totalCreditsNeeded = (selectedModelData?.credits ?? 2000) * count
  const canAfford = credits >= totalCreditsNeeded

  // suppress unused-variable warning for videoModel setter
  void setVideoModel

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating || !canAfford) return

    const currentPrompt = prompt
    const currentModel = imageModel
    const currentAspectRatio = aspectRatio
    const currentCount = count

    setIsGenerating(true)
    setPendingCount(currentCount)
    setPendingPrompt(currentPrompt)
    setError(null)

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          negativePrompt: showNegative ? negativePrompt : undefined,
          model: currentModel,
          aspectRatio: currentAspectRatio,
          count: currentCount,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al generar')
        setIsGenerating(false)
        return
      }

      if (data.creditsRemaining !== undefined) {
        onCreditsUpdate(data.creditsRemaining)
      }

      const { jobs } = data as { jobs: { id: string; polling_url: string }[] }
      const images: (string | null)[] = new Array(jobs.length).fill(null)

      const pollJob = async (job: { id: string; polling_url: string }, index: number) => {
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 2000))

          const pollRes = await fetch('/api/image/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ polling_url: job.polling_url }),
          })
          const pollData = await pollRes.json()

          if (pollData.status === 'Ready') {
            images[index] = pollData.image
            break
          }

          if (pollData.status === 'Failed') break
        }
      }

      await Promise.all(jobs.map((job, i) => pollJob(job, i)))

      const completedImages = images.filter((img): img is string => img !== null)
      if (completedImages.length > 0) {
        setHistory(prev => [{
          id: Date.now().toString(),
          prompt: currentPrompt,
          model: currentModel,
          aspectRatio: currentAspectRatio,
          images: completedImages,
          createdAt: new Date(),
        }, ...prev])
      }

    } catch {
      setError('Error de conexión')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', height: '100%', gap: 0 }}>

        {/* Columna izquierda — controles */}
        <div style={{
          width: '300px', flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Toggle Imagen / Video */}
            <div style={{
              display: 'flex', gap: '4px', padding: '4px',
              background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {(['image', 'video'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', padding: '8px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: mode === m ? '#ffffff' : 'transparent',
                    color: mode === m ? '#000000' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {m === 'image' ? <><ImageIcon size={14} /> Imagen</> : <><Video size={14} /> Video</>}
                </button>
              ))}
            </div>

            {/* Selector de modelo */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: '4px' }}>
                Modelo
              </p>

              {mode === 'image' ? (
                <>
                  {Object.entries(groupedImageModels).map(([group, models], gi) => (
                    <div key={group}>
                      <p style={{
                        fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
                        letterSpacing: '0.08em', padding: '0 4px', marginBottom: '6px',
                        marginTop: gi === 0 ? '8px' : '12px',
                      }}>
                        {group}
                      </p>
                      {models.map(model => {
                        const isActive = imageModel === model.id
                        return (
                          <button
                            key={model.id}
                            onClick={() => setImageModel(model.id)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', padding: '9px 12px',
                              borderRadius: '10px', fontSize: '12px', fontWeight: 500,
                              border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
                              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                              cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                              marginBottom: '4px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {model.name}
                              </span>
                              {model.badge && (
                                <span style={{
                                  fontSize: '9px', padding: '1px 5px', borderRadius: '999px',
                                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)',
                                  flexShrink: 0,
                                }}>
                                  {model.badge}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', flexShrink: 0, marginLeft: '8px' }}>
                              {model.credits.toLocaleString()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ))}

                  {/* Indicador de créditos */}
                  {selectedModelData && (
                    <div style={{
                      marginTop: '12px', padding: '10px 12px', borderRadius: '10px', fontSize: '12px',
                      border: canAfford ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(248,113,113,0.2)',
                      background: canAfford ? 'rgba(255,255,255,0.03)' : 'rgba(248,113,113,0.05)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: canAfford ? 'rgba(255,255,255,0.4)' : '#f87171' }}>
                        <span>{count} imagen{count > 1 ? 'es' : ''}</span>
                        <span>{totalCreditsNeeded.toLocaleString()} cr</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
                        <span>Disponibles</span>
                        <span style={{ color: canAfford ? 'rgba(255,255,255,0.5)' : '#f87171' }}>
                          {credits.toLocaleString()} cr
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {VIDEO_MODELS.map(model => (
                    <button
                      key={model.id}
                      disabled
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '10px 12px',
                        borderRadius: '10px', fontSize: '13px', fontWeight: 500,
                        border: '1px solid rgba(255,255,255,0.05)', background: 'transparent',
                        color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={11} />
                        <span>{model.name}</span>
                      </div>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Pronto
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Solo imagen: ratio y cantidad */}
            {mode === 'image' && (
              <>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: '8px' }}>
                    Proporción
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ASPECT_RATIOS.map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        style={{
                          padding: '5px 10px', borderRadius: '8px', fontSize: '12px',
                          fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                          background: aspectRatio === ratio ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          color: aspectRatio === ratio ? '#000000' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: '8px' }}>
                    Cantidad — {count} imagen{count > 1 ? 'es' : ''}
                  </p>
                  <input
                    type="range" min={1} max={8} value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ffffff' }}
                  />
                </div>
              </>
            )}

            {/* Imagen de referencia */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: '8px' }}>
                Imagen de referencia (opcional)
              </p>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: '10px', fontSize: '13px',
                border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <Upload size={14} />
                Subir referencia
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setImageRefs(prev => [...prev, f])
                  }} />
              </label>
              {imageRefs.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {imageRefs.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', background: 'rgba(255,255,255,0.06)',
                      borderRadius: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)',
                    }}>
                      {f.name.length > 15 ? f.name.slice(0, 15) + '…' : f.name}
                      <button onClick={() => setImageRefs(prev => prev.filter((_, j) => j !== i))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Columna derecha — chat + prompt */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Área de chat/historial */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">

            {/* Estado vacío */}
            {history.length === 0 && !isGenerating && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-sm text-white/30">
                  Escribe un prompt y genera tu primera imagen
                </p>
                <p className="text-xs text-white/15 mt-1">
                  FLUX.2 · FLUX 1.1 Pro · Kontext · Fill
                </p>
              </div>
            )}

            {/* Generación en curso */}
            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span className="truncate max-w-[300px]">{pendingPrompt}</span>
                </div>
                <div className={`grid gap-2 ${
                  pendingCount === 1 ? 'grid-cols-1 max-w-sm' :
                  pendingCount === 2 ? 'grid-cols-2 max-w-lg' :
                  pendingCount <= 4 ? 'grid-cols-2' :
                  'grid-cols-4'
                }`}>
                  {Array.from({ length: pendingCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`${ASPECT_CLASSES[aspectRatio] ?? 'aspect-square'} rounded-xl bg-white/5 border border-white/[0.08] animate-pulse flex items-center justify-center`}
                    >
                      <Sparkles className="w-5 h-5 text-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial — más reciente arriba */}
            {history.map(item => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span>
                    {item.createdAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {item.createdAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>·</span>
                  <span className="truncate max-w-[400px] text-white/40">{item.prompt}</span>
                </div>

                <div className={`grid gap-2 ${
                  item.images.length === 1 ? 'grid-cols-1 max-w-xs' :
                  item.images.length === 2 ? 'grid-cols-2 max-w-sm' :
                  item.images.length <= 4 ? 'grid-cols-2 max-w-md' :
                  'grid-cols-4'
                }`}>
                  {item.images.map((img, i) => (
                    <div
                      key={i}
                      className={`relative group overflow-hidden rounded-xl border border-white/[0.08] cursor-pointer ${ASPECT_CLASSES[item.aspectRatio] ?? 'aspect-square'}`}
                      onClick={() => setExpandedImage(img)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={item.prompt}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                        <a
                          href={img}
                          download={`elitelabs-${item.id}-${i}.jpg`}
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>

          {/* Prompt bar */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            {showNegative && (
              <textarea
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                placeholder="Prompt negativo — qué quieres evitar..."
                rows={2}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                  padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.7)',
                  outline: 'none', resize: 'none', boxSizing: 'border-box',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '0 12px',
              }}>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
                  }}
                  placeholder={`Describe la ${mode === 'image' ? 'imagen' : 'el vídeo'} que quieres generar...`}
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    padding: '12px 0', fontSize: '13px', color: 'rgba(255,255,255,0.9)',
                    resize: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => setShowNegative(p => !p)}
                  title="Prompt negativo"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    color: 'rgba(255,255,255,0.2)', display: 'flex', padding: '4px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                >
                  <ChevronDown size={16} style={{ transform: showNegative ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || !canAfford}
                style={{
                  padding: '0 20px', background: '#ffffff', color: '#000000',
                  fontSize: '13px', fontWeight: 600, borderRadius: '12px', border: 'none',
                  cursor: !prompt.trim() || isGenerating || !canAfford ? 'not-allowed' : 'pointer',
                  opacity: !prompt.trim() || isGenerating || !canAfford ? 0.3 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                  transition: 'opacity 0.15s',
                }}
              >
                <Sparkles size={14} />
                {isGenerating ? 'Generando…' : 'Generar'}
              </button>
            </div>

            {error && (
              <p style={{ fontSize: '11px', color: '#f87171', textAlign: 'center' }}>{error}</p>
            )}
          </div>
        </div>

      </div>

      {/* Modal imagen expandida */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImage}
            alt="Imagen expandida"
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <a
            href={expandedImage}
            download="elitelabs-image.jpg"
            className="absolute bottom-4 right-4 px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            Descargar
          </a>
        </div>
      )}
    </>
  )
}
