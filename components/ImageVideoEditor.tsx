'use client'

import { useState } from 'react'
import { Image as ImageIcon, Video, Sparkles, Upload, X, ChevronDown, Lock } from 'lucide-react'

type Mode = 'image' | 'video'
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
type Quality = '1K' | '2K' | '4K'
type ImageModel = 'flux-pro-1.1' | 'flux-2-pro' | 'flux-kontext' | 'flux-dev'
type VideoModel = 'sora' | 'runway' | 'kling'

const IMAGE_MODELS: { id: ImageModel; name: string; badge?: string; locked?: boolean }[] = [
  { id: 'flux-pro-1.1', name: 'FLUX 1.1 Pro',    badge: 'Recomendado' },
  { id: 'flux-2-pro',   name: 'FLUX 2 Pro',       badge: 'Mejor calidad' },
  { id: 'flux-kontext', name: 'FLUX Kontext Pro',  badge: 'Con referencia' },
  { id: 'flux-dev',     name: 'FLUX Dev',          badge: 'Rápido' },
]

const VIDEO_MODELS: { id: VideoModel; name: string; badge?: string; locked?: boolean }[] = [
  { id: 'sora',   name: 'Sora',   locked: true },
  { id: 'runway', name: 'Runway', locked: true },
  { id: 'kling',  name: 'Kling',  locked: true },
]

const ASPECT_RATIOS: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4']
const QUALITIES: Quality[] = ['1K', '2K', '4K']

export function ImageVideoEditor() {
  const [mode, setMode] = useState<Mode>('image')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [showNegative, setShowNegative] = useState(false)
  const [imageModel, setImageModel] = useState<ImageModel>('flux-pro-1.1')
  const [videoModel, setVideoModel] = useState<VideoModel>('sora')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [quality, setQuality] = useState<Quality>('1K')
  const [count, setCount] = useState(4)
  const [imageRefs, setImageRefs] = useState<File[]>([])
  const [results, setResults] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentModels = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const activeModel = mode === 'image' ? imageModel : videoModel

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setResults([])
    setError(null)
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt: showNegative ? negativePrompt : undefined,
          model: imageModel,
          aspectRatio,
          count,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al generar')
        return
      }
      setResults(data.images)
    } catch {
      setError('Error de conexión')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
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
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: '8px' }}>
              Modelo
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentModels.map(model => {
                const isActive = activeModel === model.id
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (model.locked) return
                      if (mode === 'image') setImageModel(model.id as ImageModel)
                      else setVideoModel(model.id as VideoModel)
                    }}
                    disabled={model.locked}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '10px 12px',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 500,
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : model.locked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isActive ? '#fff' : model.locked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                      cursor: model.locked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    <span>{model.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {model.locked && <Lock size={11} />}
                      {model.badge && !model.locked && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                          {model.badge}
                        </span>
                      )}
                      {model.locked && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Pronto
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Solo imagen: ratio, calidad, cantidad */}
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
                  Resolución
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {QUALITIES.map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      style={{
                        flex: 1, padding: '6px', borderRadius: '8px', fontSize: '12px',
                        fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: quality === q ? '#ffffff' : 'rgba(255,255,255,0.06)',
                        color: quality === q ? '#000000' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {q}
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

      {/* Columna derecha — resultados + prompt */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Área de resultados */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {results.length === 0 && !isGenerating ? (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              }}>
                <Sparkles size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>
                Escribe un prompt y genera tu primera imagen
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)', marginTop: '6px' }}>
                Flux 1.1 Pro · Flux 2 Pro · Flux Kontext · Flux Dev
              </p>
            </div>
          ) : isGenerating ? (
            <div style={{
              display: 'grid', gap: '12px',
              gridTemplateColumns: count <= 1 ? '1fr' : count <= 2 ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
            }}>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: '16px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 2s ease-in-out infinite',
                }}>
                  <Sparkles size={24} style={{ color: 'rgba(255,255,255,0.1)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'grid', gap: '12px',
              gridTemplateColumns: results.length <= 1 ? '1fr' : results.length <= 2 ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
            }}>
              {results.map((url, i) => (
                <div key={i} style={{
                  position: 'relative', aspectRatio: '1',
                  borderRadius: '16px', overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Generated ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
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
              disabled={!prompt.trim() || isGenerating}
              style={{
                padding: '0 20px', background: '#ffffff', color: '#000000',
                fontSize: '13px', fontWeight: 600, borderRadius: '12px', border: 'none',
                cursor: !prompt.trim() || isGenerating ? 'not-allowed' : 'pointer',
                opacity: !prompt.trim() || isGenerating ? 0.3 : 1,
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
  )
}
