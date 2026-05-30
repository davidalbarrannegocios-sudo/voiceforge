'use client'

import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon, Video, Sparkles, Upload, X, ChevronDown, Lock, Download, Share2, Check, Globe } from 'lucide-react'

type Mode = 'image' | 'video' | 'explore'
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
type VideoModel = 'grok-imagine-video' | 'sora' | 'runway' | 'kling'

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
  // xAI Grok
  { id: 'grok-imagine-image',         name: 'Grok Imagine',     badge: 'Rápido',       credits: 800,  priceUsd: 0.02, group: 'xAI Grok' },
  { id: 'grok-imagine-image-quality', name: 'Grok Imagine Pro', badge: 'Alta calidad', credits: 900,  priceUsd: 0.02, group: 'xAI Grok' },
]

const VIDEO_MODELS: { id: VideoModel; name: string; badge?: string; credits?: number; locked: boolean }[] = [
  { id: 'grok-imagine-video', name: 'Grok Imagine Video', badge: 'Con audio', credits: 1500, locked: false },
  { id: 'sora',               name: 'Sora',               locked: true },
  { id: 'runway',             name: 'Runway',             locked: true },
  { id: 'kling',              name: 'Kling',              locked: true },
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
  'FLUX.2':   IMAGE_MODELS.filter(m => m.group === 'FLUX.2'),
  'FLUX.1':   IMAGE_MODELS.filter(m => m.group === 'FLUX.1'),
  'xAI Grok': IMAGE_MODELS.filter(m => m.group === 'xAI Grok'),
}

export interface ImageHistoryItem {
  id: string
  type: 'image' | 'video'
  prompt: string
  model: string
  aspectRatio: string
  images: string[]
  videoUrl?: string
  createdAt: Date
  expiresAt: Date
  provider: 'bfl' | 'xai'
}

interface Props {
  credits: number
  onCreditsUpdate: (newCredits: number) => void
  history: ImageHistoryItem[]
  onHistoryUpdate: (item: ImageHistoryItem) => void
}

export function ImageVideoEditor({ credits, onCreditsUpdate, history, onHistoryUpdate }: Props) {
  const [mode, setMode] = useState<Mode>('image')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [showNegative, setShowNegative] = useState(false)
  const [imageModel, setImageModel] = useState('flux-pro-1.1')
  const [videoModel, setVideoModel] = useState<VideoModel>('grok-imagine-video')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [count, setCount] = useState(4)
  const [videoDuration, setVideoDuration] = useState(5)
  const [imageRefs, setImageRefs] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingPrompt, setPendingPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [view, setView] = useState<'empty' | 'chat'>('empty')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set())
  const [galleryImages, setGalleryImages] = useState<{ id: string; imageUrl: string; prompt: string; model: string; aspectRatio: string }[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setModelDropdownOpen(false) }, [mode])

  useEffect(() => {
    if (mode !== 'explore') return
    setGalleryLoading(true)
    fetch('/api/gallery?limit=50')
      .then(r => r.json())
      .then(data => {
        setGalleryImages(data.images ?? [])
        setGalleryLoading(false)
      })
      .catch(() => setGalleryLoading(false))
  }, [mode])

  useEffect(() => {
    if (history.length > 0 && chatRef.current) {
      chatRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [history.length])

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      return
    }
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 80) return prev + Math.random() * 8
        if (prev < 95) return prev + Math.random() * 0.5
        return prev
      })
    }, 400)
    return () => clearInterval(interval)
  }, [isGenerating])

  const selectedImageModel = IMAGE_MODELS.find(m => m.id === imageModel)
  const selectedVideoModel = VIDEO_MODELS.find(m => m.id === videoModel)

  const currentModelLabel = mode === 'image'
    ? selectedImageModel?.name ?? imageModel
    : selectedVideoModel?.name ?? videoModel
  const currentModelCr = mode === 'image'
    ? selectedImageModel?.credits
    : selectedVideoModel?.credits

  const creditsNeeded = mode === 'video'
    ? 1500 * videoDuration
    : (selectedImageModel?.credits ?? 0) * count
  const canAfford = credits >= creditsNeeded

  async function handleGenerateImage() {
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
        return
      }

      if (data.creditsRemaining !== undefined) onCreditsUpdate(data.creditsRemaining)

      // xAI: synchronous result
      if (data.images) {
        setProgress(100)
        await new Promise(r => setTimeout(r, 300))
        onHistoryUpdate({
          id: Date.now().toString(),
          type: 'image',
          prompt: currentPrompt,
          model: currentModel,
          aspectRatio: currentAspectRatio,
          images: data.images as string[],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          provider: 'xai',
        })
        return
      }

      // BFL: polling
      const { jobs } = data as { jobs: { id: string; polling_url: string }[] }
      const images: (string | null)[] = new Array(jobs.length).fill(null)

      await Promise.all(jobs.map(async (job, index) => {
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 2000))
          const pollRes = await fetch('/api/image/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ polling_url: job.polling_url }),
          })
          const pollData = await pollRes.json()
          if (pollData.status === 'Ready') { images[index] = pollData.image; break }
          if (pollData.status === 'Failed') break
        }
      }))

      const completed = images.filter((img): img is string => img !== null)
      if (completed.length > 0) {
        setProgress(100)
        await new Promise(r => setTimeout(r, 300))
        onHistoryUpdate({
          id: Date.now().toString(),
          type: 'image',
          prompt: currentPrompt,
          model: currentModel,
          aspectRatio: currentAspectRatio,
          images: completed,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          provider: 'bfl',
        })
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateVideo() {
    const currentPrompt = prompt
    const currentAspectRatio = aspectRatio
    const currentModel = videoModel

    setIsGenerating(true)
    setPendingCount(1)
    setPendingPrompt(currentPrompt)
    setError(null)

    let taskId: string

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, aspectRatio: currentAspectRatio, duration: videoDuration }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al generar vídeo')
        setIsGenerating(false)
        return
      }

      if (data.creditsRemaining !== undefined) onCreditsUpdate(data.creditsRemaining)

      taskId = data.taskId as string
    } catch {
      setError('Error de conexión')
      setIsGenerating(false)
      return
    }

    const pollVideo = async () => {
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000))

        try {
          const pollRes = await fetch('/api/video/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId }),
          })
          const pollData = await pollRes.json()
          console.log('[video poll]', i, pollData.status)

          if (pollData.status === 'Ready' && pollData.videoUrl) {
            onHistoryUpdate({
              id: Date.now().toString(),
              type: 'video',
              prompt: currentPrompt,
              model: currentModel,
              aspectRatio: currentAspectRatio,
              images: [],
              videoUrl: pollData.videoUrl,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              provider: 'xai',
            })
            setIsGenerating(false)
            return
          }

          if (pollData.status === 'Failed') {
            setError('El vídeo falló al generarse')
            setIsGenerating(false)
            return
          }
        } catch {
          // network error during poll, keep retrying
        }
      }
      setError('Timeout — el vídeo tardó demasiado')
      setIsGenerating(false)
    }

    pollVideo()
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleShare(item: ImageHistoryItem, imgIndex: number) {
    const img = item.images[imgIndex]
    if (!img || !img.startsWith('data:')) return

    const shareKey = `${item.id}-${imgIndex}`
    try {
      const res = await fetch('/api/gallery/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: img,
          prompt: item.prompt,
          model: item.model,
          aspectRatio: item.aspectRatio,
        }),
      })
      if (res.ok) {
        setSharedIds(prev => new Set(prev).add(shareKey))
        showToast('¡Imagen compartida en la galería!', 'success')
      } else {
        showToast('Error al compartir', 'error')
      }
    } catch {
      showToast('Error al compartir', 'error')
    }
  }

  function handleGenerate() {
    if (!prompt.trim() || isGenerating || !canAfford) return
    setView('chat')
    if (mode === 'video') handleGenerateVideo()
    else handleGenerateImage()
  }

  return (
    <>
      <div className="flex h-full overflow-hidden">

        {/* Left column — controls (hidden in explore mode) */}
        {mode !== 'explore' && (
        <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-white/[0.06]">

          {/* Fixed top: toggle + model dropdown + credits */}
          <div className="flex-shrink-0 p-4 space-y-4">

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-white/[0.05] border border-white/[0.08] rounded-xl">
              {(['image', 'video', 'explore'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    mode === m ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {m === 'image' ? <><ImageIcon size={13} /> Imagen</>
                  : m === 'video' ? <><Video size={13} /> Video</>
                  : <><Globe size={13} /> Explorar</>}
                </button>
              ))}
            </div>

            {/* Model dropdown */}
            <div ref={dropdownRef} className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-1.5">Modelo</p>
              <button
                onClick={() => setModelDropdownOpen(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium bg-white/[0.05] border border-white/[0.1] text-white/80 hover:bg-white/[0.08] transition-all"
              >
                <span className="truncate">{currentModelLabel}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {currentModelCr && (
                    <span className="text-[10px] text-white/30">{currentModelCr.toLocaleString()}</span>
                  )}
                  <ChevronDown
                    size={13}
                    className={`text-white/40 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Dropdown panel */}
              <div className={`absolute top-full left-0 right-0 z-50 mt-1 bg-[#111] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl transition-all duration-200 origin-top ${
                modelDropdownOpen
                  ? 'opacity-100 scale-y-100 pointer-events-auto'
                  : 'opacity-0 scale-y-95 pointer-events-none'
              }`}>
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {mode === 'image' ? (
                    Object.entries(groupedImageModels).map(([group, models]) => (
                      <div key={group}>
                        <p className="text-[9px] text-white/25 uppercase tracking-widest px-2 py-1.5 mt-1">{group}</p>
                        {models.map(model => {
                          const isActive = imageModel === model.id
                          return (
                            <button
                              key={model.id}
                              onClick={() => { setImageModel(model.id); setModelDropdownOpen(false) }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all mb-0.5 ${
                                isActive
                                  ? 'bg-white/[0.1] text-white border border-white/20'
                                  : 'text-white/55 hover:bg-white/[0.05] border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{model.name}</span>
                                {model.badge && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/35 flex-shrink-0">
                                    {model.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-white/30 flex-shrink-0 ml-2">{model.credits.toLocaleString()}</span>
                            </button>
                          )
                        })}
                      </div>
                    ))
                  ) : (
                    VIDEO_MODELS.map(model => (
                      <button
                        key={model.id}
                        disabled={model.locked}
                        onClick={() => { if (!model.locked) { setVideoModel(model.id); setModelDropdownOpen(false) } }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all mb-0.5 ${
                          !model.locked && videoModel === model.id
                            ? 'bg-white/[0.1] text-white border border-white/20'
                            : model.locked
                            ? 'text-white/20 border border-transparent cursor-not-allowed'
                            : 'text-white/55 hover:bg-white/[0.05] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {model.locked && <Lock size={10} />}
                          <span>{model.name}</span>
                          {model.badge && !model.locked && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/35">
                              {model.badge}
                            </span>
                          )}
                        </div>
                        {model.locked ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/20 border border-white/[0.08]">
                            Pronto
                          </span>
                        ) : model.credits ? (
                          <span className="text-[10px] text-white/30">{model.credits.toLocaleString()}</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Compact credit indicator */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
              canAfford
                ? 'border-white/[0.08] bg-white/[0.03] text-white/40'
                : 'border-red-400/20 bg-red-400/[0.05] text-red-400'
            }`}>
              <span>
                {mode === 'video'
                  ? `${videoDuration}s · ${creditsNeeded.toLocaleString()} cr`
                  : `${count} img · ${creditsNeeded.toLocaleString()} cr`}
              </span>
              <span className={canAfford ? 'text-white/50' : 'text-red-400'}>
                {credits.toLocaleString()} disponibles
              </span>
            </div>
          </div>

          {/* Scrollable secondary controls */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

            {mode === 'image' && (
              <>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2">Proporción</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ASPECT_RATIOS.map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          aspectRatio === ratio ? 'bg-white text-black' : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2">
                    Cantidad — {count} imagen{count > 1 ? 'es' : ''}
                  </p>
                  <input
                    type="range" min={1} max={8} value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2">Referencia (opcional)</p>
                  <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border border-dashed border-white/15 text-white/30 cursor-pointer hover:border-white/25 transition-all">
                    <Upload size={12} />
                    Subir imagen
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) setImageRefs(prev => [...prev, f])
                      }} />
                  </label>
                  {imageRefs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {imageRefs.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white/[0.06] rounded-lg text-[11px] text-white/50">
                          {f.name.length > 14 ? f.name.slice(0, 14) + '…' : f.name}
                          <button
                            onClick={() => setImageRefs(prev => prev.filter((_, j) => j !== i))}
                            className="text-white/30 hover:text-white/60 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === 'video' && (
              <>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2">Proporción</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['16:9', '9:16', '1:1'] as AspectRatio[]).map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          aspectRatio === ratio ? 'bg-white text-black' : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedVideoModel?.id === 'grok-imagine-video' && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#444] mb-2">Duración</p>
                    <div className="flex gap-2">
                      {[5, 10].map(d => (
                        <button
                          key={d}
                          onClick={() => setVideoDuration(d)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                            videoDuration === d ? 'bg-white text-black' : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )} {/* end left column */}

        {/* Right column — history + prompt (or explore gallery) */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Explore tab toggle (shown when in explore mode, inside right column header) */}
          {mode === 'explore' && (
            <div className="flex-shrink-0 p-4 pb-0">
              <div className="flex gap-1 p-1 bg-white/[0.05] border border-white/[0.08] rounded-xl w-fit">
                {(['image', 'video', 'explore'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      mode === m ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {m === 'image' ? <><ImageIcon size={13} /> Imagen</>
                    : m === 'video' ? <><Video size={13} /> Video</>
                    : <><Globe size={13} /> Explorar</>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Explore gallery view */}
          {mode === 'explore' && (
            <div className="flex-1 overflow-y-auto p-4">
              {galleryLoading ? (
                <div className="columns-2 lg:columns-3 xl:columns-4 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i}
                         className="mb-3 rounded-xl bg-white/[0.05] animate-pulse break-inside-avoid"
                         style={{ height: `${180 + (i % 3) * 80}px` }} />
                  ))}
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Globe className="w-10 h-10 text-white/10 mb-3" />
                  <p className="text-sm text-white/20">La galería está vacía.</p>
                  <p className="text-xs text-white/10 mt-1">¡Sé el primero en compartir una imagen!</p>
                </div>
              ) : (
                <div className="columns-2 lg:columns-3 xl:columns-4 gap-3">
                  {galleryImages.map(img => (
                    <div key={img.id}
                         className="mb-3 break-inside-avoid group relative rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer"
                         onClick={() => setExpandedImage(img.imageUrl)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                        <p className="text-xs text-white/90 line-clamp-2">{img.prompt}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{img.model}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fixed warning banner — only in image/video mode */}
          {mode !== 'explore' && (
          <div className="flex-shrink-0 mx-4 mt-3 mb-1">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-orange-500/[0.08] border border-orange-500/20">
              <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-orange-400/90 leading-relaxed">
                Las imágenes y vídeos se mantienen mientras no recargues o cierres la página.
                <strong className="text-orange-400 font-semibold"> Descárgalos antes de salir.</strong>
              </p>
            </div>
          </div>
          )} {/* end warning banner */}

          {/* Scrollable history — only in image/video mode */}
          {mode !== 'explore' && (
          <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            {view === 'empty' && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-sm text-white/30">
                  {mode === 'video'
                    ? 'Describe el vídeo que quieres generar'
                    : 'Escribe un prompt y genera tu primera imagen'}
                </p>
                <p className="text-xs text-white/15 mt-1">
                  {mode === 'video'
                    ? 'Grok Imagine Video · 720p · 5s o 10s'
                    : 'FLUX.2 · FLUX 1.1 Pro · Kontext · Grok Imagine'}
                </p>
              </div>
            ) : (
              <>

            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span className="truncate max-w-[300px]">{pendingPrompt}</span>
                </div>

                {mode === 'video' ? (
                  <div className={`${ASPECT_CLASSES[aspectRatio] ?? 'aspect-video'} max-w-sm rounded-xl bg-white/5 border border-white/[0.08] animate-pulse flex items-center justify-center`}>
                    <Video className="w-6 h-6 text-white/10" />
                  </div>
                ) : (
                  <div className={`grid gap-3 ${
                    pendingCount === 1 ? 'grid-cols-1 max-w-sm' :
                    pendingCount === 2 ? 'grid-cols-2 max-w-lg' :
                    pendingCount <= 4 ? 'grid-cols-2' :
                    'grid-cols-4'
                  }`}>
                    {Array.from({ length: pendingCount }).map((_, i) => (
                      <div
                        key={i}
                        className={`relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] ${ASPECT_CLASSES[aspectRatio] ?? 'aspect-square'}`}
                      >
                        {/* Animated progress bars */}
                        <div className="absolute inset-0 flex flex-col justify-end p-4 gap-2">
                          {[85, 60, 75, 45, 90, 55].map((width, j) => (
                            <div
                              key={j}
                              className="h-1 rounded-full bg-white/[0.08] overflow-hidden"
                              style={{ width: `${width}%` }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, progress + j * 5)}%`,
                                  transition: 'width 0.4s ease',
                                  background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3))',
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div
                            className="absolute inset-0 -translate-x-full"
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                              animation: 'shimmer 2s infinite',
                              animationDelay: `${i * 0.3}s`,
                            }}
                          />
                        </div>

                        {/* Percentage */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white/60 font-mono tabular-nums">
                              {Math.min(99, Math.round(progress))}%
                            </p>
                            <p className="text-xs text-white/25 mt-1">
                              {i === 0 ? 'Generando...' : `Imagen ${i + 1}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

                {item.type === 'video' && (
                  item.videoUrl ? (
                    <>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        src={item.videoUrl}
                        controls
                        className="w-full max-w-sm rounded-xl border border-white/[0.08]"
                        style={{ aspectRatio: item.aspectRatio.replace(':', '/') }}
                      />
                      <a
                        href={item.videoUrl}
                        download="elitelabs-video.mp4"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar vídeo
                      </a>
                    </>
                  ) : (
                    <div className="w-full max-w-sm aspect-video rounded-xl bg-white/[0.03] border border-dashed border-white/[0.08] flex items-center justify-center">
                      <p className="text-xs text-white/20">Vídeo no disponible</p>
                    </div>
                  )
                )}

                {item.type === 'image' && (
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
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2 gap-1.5">
                          <button
                            onClick={e => { e.stopPropagation(); handleShare(item, i) }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
                            title="Compartir en galería"
                          >
                            {sharedIds.has(`${item.id}-${i}`)
                              ? <Check className="w-3.5 h-3.5 text-green-400" />
                              : <Share2 className="w-3.5 h-3.5 text-white" />
                            }
                          </button>
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
                )}
              </div>
            ))}

              </>
            )}
          </div>
          )} {/* end scrollable history */}

          {/* Fixed prompt bar — only in image/video mode */}
          {mode !== 'explore' && (
          <div className="flex-shrink-0 border-t border-white/[0.06] p-4 flex flex-col gap-2">
            {showNegative && mode === 'image' && (
              <textarea
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                placeholder="Prompt negativo — qué quieres evitar..."
                rows={2}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white/70 outline-none resize-none placeholder:text-white/25"
              />
            )}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl px-3">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
                  }}
                  placeholder={mode === 'video'
                    ? 'Describe el vídeo que quieres generar...'
                    : 'Describe la imagen que quieres generar...'}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-white/90 resize-none font-[inherit] placeholder:text-white/25"
                />
                {mode === 'image' && (
                  <button
                    onClick={() => setShowNegative(p => !p)}
                    title="Prompt negativo"
                    className="flex-shrink-0 p-1 text-white/20 hover:text-white/50 transition-colors"
                  >
                    <ChevronDown
                      size={15}
                      className={`transition-transform duration-200 ${showNegative ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || !canAfford}
                className="flex-shrink-0 flex items-center gap-1.5 px-5 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
              >
                {mode === 'video' ? <Video size={13} /> : <Sparkles size={13} />}
                {isGenerating ? 'Generando…' : 'Generar'}
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-red-400 text-center">{error}</p>
            )}
          </div>
          )} {/* end prompt bar */}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9998] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success'
            ? <Check className="w-4 h-4 flex-shrink-0" />
            : <X className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Expanded image modal */}
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
