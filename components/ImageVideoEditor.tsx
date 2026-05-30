'use client'

import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon, Video, Sparkles, Upload, X, ChevronDown, Lock, Download, Share2, Check, Globe } from 'lucide-react'

type Mode = 'image' | 'video'
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
  const [modalImage, setModalImage] = useState<{
    url: string
    prompt: string
    model: string
    aspectRatio: string
    allImages: string[]
    currentIndex: number
  } | null>(null)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set())
  const [galleryImages, setGalleryImages] = useState<{ id: string; imageUrl: string; prompt: string; model: string; aspectRatio: string }[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [rightView, setRightView] = useState<'history' | 'explore'>('history')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setModelDropdownOpen(false) }, [mode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalImage(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function fetchGallery() {
    setGalleryLoading(true)
    try {
      const res = await fetch('/api/gallery?limit=50')
      const data = await res.json()
      setGalleryImages(data.images ?? [])
    } finally {
      setGalleryLoading(false)
    }
  }

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
    setRightView('history')
    if (mode === 'video') handleGenerateVideo()
    else handleGenerateImage()
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Top area — toggle + scrollable content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Toggle Historial / Explorar + aviso naranja */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex gap-0.5 p-0.5 bg-white/[0.05] rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setRightView('history')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  rightView === 'history' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                Historial
              </button>
              <button
                onClick={() => { setRightView('explore'); fetchGallery() }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  rightView === 'explore' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                Explorar
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-orange-400/70">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Las imágenes no se guardan al cerrar la página</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-5 pb-4">

            {rightView === 'history' ? (
              <>
                {/* Empty state */}
                {history.length === 0 && !isGenerating && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-sm text-white/25">Escribe un prompt para generar</p>
                    <p className="text-xs text-white/[0.12] mt-1">
                      FLUX.2 · FLUX 1.1 Pro · Kontext · Grok Imagine
                    </p>
                  </div>
                )}

                {/* Skeleton while generating */}
                {isGenerating && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span className="truncate max-w-[400px]">{pendingPrompt}</span>
                    </div>

                    {mode === 'video' ? (
                      <div className={`${ASPECT_CLASSES[aspectRatio] ?? 'aspect-video'} max-w-sm rounded-xl bg-white/5 border border-white/[0.08] animate-pulse flex items-center justify-center`}>
                        <Video className="w-6 h-6 text-white/10" />
                      </div>
                    ) : (
                      <div className={`grid gap-2 ${
                        pendingCount === 1 ? 'grid-cols-1 max-w-[240px]' :
                        pendingCount === 2 ? 'grid-cols-2 max-w-[360px]' :
                        'grid-cols-2 max-w-[380px]'
                      }`}>
                        {Array.from({ length: pendingCount }).map((_, i) => (
                          <div
                            key={i}
                            className={`relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] ${ASPECT_CLASSES[aspectRatio] ?? 'aspect-square'}`}
                          >
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

                {/* History items */}
                {history.map(item => (
                  <div key={item.id} className="space-y-2 pt-6 max-w-2xl">
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
                        item.images.length === 1 ? 'grid-cols-1 max-w-[240px]' :
                        item.images.length === 2 ? 'grid-cols-2 max-w-[360px]' :
                        item.images.length <= 4 ? 'grid-cols-2 max-w-[380px]' :
                        'grid-cols-4 max-w-[480px]'
                      }`}>
                        {item.images.map((img, i) => (
                          <div
                            key={i}
                            className={`relative group overflow-hidden rounded-xl border border-white/[0.08] cursor-pointer ${ASPECT_CLASSES[item.aspectRatio] ?? 'aspect-square'}`}
                            onClick={() => setModalImage({
                              url: img,
                              prompt: item.prompt,
                              model: item.model,
                              aspectRatio: item.aspectRatio,
                              allImages: item.images,
                              currentIndex: i,
                            })}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={item.prompt}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              /* Explore gallery */
              galleryLoading ? (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 pt-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}
                         className="mb-2 rounded-xl bg-white/[0.05] animate-pulse break-inside-avoid"
                         style={{ height: `${180 + (i % 3) * 80}px` }} />
                  ))}
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Globe className="w-10 h-10 text-white/10 mb-3" />
                  <p className="text-sm text-white/20">La galería está vacía.</p>
                  <p className="text-xs text-white/10 mt-1">¡Sé el primero en compartir una imagen!</p>
                </div>
              ) : (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 pt-2">
                  {galleryImages.map(img => (
                    <div key={img.id}
                         className="mb-2 break-inside-avoid group relative rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer"
                         onClick={() => setModalImage({
                           url: img.imageUrl,
                           prompt: img.prompt,
                           model: img.model,
                           aspectRatio: img.aspectRatio,
                           allImages: [img.imageUrl],
                           currentIndex: 0,
                         })}>
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
              )
            )}
          </div>
        </div>

        {/* Prompt bar — always fixed at bottom */}
        <div className="flex-shrink-0 border-t border-white/[0.08] px-4 py-3 space-y-2">

          {/* Image settings row */}
          {mode === 'image' && (
            <div className="flex items-center gap-2 flex-wrap">

              {/* Model dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setModelDropdownOpen(o => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs text-white/70 transition-all"
                >
                  <span className="max-w-[110px] truncate">{selectedImageModel?.name}</span>
                  <span className="text-white/30">{selectedImageModel?.credits?.toLocaleString()} cr</span>
                  <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {modelDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModelDropdownOpen(false)} />
                    <div className="absolute bottom-full left-0 mb-1 z-50 w-64 bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl p-1.5 max-h-[320px] overflow-y-auto">
                      {Object.entries(groupedImageModels).map(([group, models]) => (
                        <div key={group}>
                          <p className="text-[9px] text-white/25 uppercase tracking-widest px-2 py-1.5 mt-1">{group}</p>
                          {models.map(model => (
                            <button
                              key={model.id}
                              onClick={() => { setImageModel(model.id); setModelDropdownOpen(false) }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all mb-0.5 ${
                                imageModel === model.id
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
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="h-4 w-px bg-white/10" />

              {/* Aspect ratio */}
              <div className="flex gap-1">
                {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      aspectRatio === ratio
                        ? 'bg-white text-black'
                        : 'bg-white/[0.05] text-white/40 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-white/10" />

              {/* Count */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/30">Cantidad</span>
                <div className="flex gap-0.5">
                  {[1, 2, 4, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`w-7 h-6 rounded-md text-[11px] font-medium transition-all ${
                        count === n
                          ? 'bg-white text-black'
                          : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-white/10" />

              {/* Image reference */}
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-[11px] text-white/40 cursor-pointer transition-all">
                <Upload className="w-3 h-3" />
                {imageRefs.length > 0 ? `${imageRefs.length} ref` : 'Referencia'}
                <input type="file" accept="image/*" className="hidden"
                       onChange={e => { const f = e.target.files?.[0]; if (f) setImageRefs(prev => [...prev, f]) }} />
              </label>

              {imageRefs.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {imageRefs.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white/[0.06] rounded-lg text-[11px] text-white/50">
                      {f.name.length > 12 ? f.name.slice(0, 12) + '…' : f.name}
                      <button onClick={() => setImageRefs(prev => prev.filter((_, j) => j !== i))} className="text-white/30 hover:text-white/60">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Credits indicator */}
              <div className={`ml-auto text-[11px] ${canAfford ? 'text-white/25' : 'text-red-400'}`}>
                {creditsNeeded.toLocaleString()} cr · {credits.toLocaleString()} disponibles
              </div>
            </div>
          )}

          {/* Video settings row */}
          {mode === 'video' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/40">Grok Imagine Video</span>

              <div className="h-4 w-px bg-white/10" />

              <span className="text-[11px] text-white/30">Duración</span>
              {[5, 10].map(d => (
                <button
                  key={d}
                  onClick={() => setVideoDuration(d)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    videoDuration === d ? 'bg-white text-black' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
                  }`}
                >
                  {d}s
                </button>
              ))}

              <div className="h-4 w-px bg-white/10" />

              {(['16:9', '9:16', '1:1'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    aspectRatio === ratio ? 'bg-white text-black' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
                  }`}
                >
                  {ratio}
                </button>
              ))}

              <div className={`ml-auto text-[11px] ${canAfford ? 'text-white/25' : 'text-red-400'}`}>
                {creditsNeeded.toLocaleString()} cr · {credits.toLocaleString()} disponibles
              </div>
            </div>
          )}

          {/* Negative prompt */}
          {showNegative && mode === 'image' && (
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="Qué quieres evitar en la imagen..."
              rows={2}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-white/20 resize-none transition-colors"
            />
          )}

          {/* Mode toggle + Textarea + Generate button */}
          <div className="flex items-end gap-2">

            {/* Image / Video toggle */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                onClick={() => setMode('image')}
                className={`p-2 rounded-lg transition-all ${
                  mode === 'image' ? 'bg-white text-black' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
                }`}
                title="Imagen"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMode('video')}
                className={`p-2 rounded-lg transition-all ${
                  mode === 'video' ? 'bg-white text-black' : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
                }`}
                title="Video"
              >
                <Video className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <div className="flex-1 flex items-end gap-2 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-colors">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() }
                }}
                placeholder={mode === 'image'
                  ? 'Describe la imagen que quieres generar...'
                  : 'Describe el vídeo que quieres generar...'}
                rows={2}
                className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 outline-none resize-none"
              />
              <button
                onClick={() => setShowNegative(p => !p)}
                className="text-white/20 hover:text-white/50 transition-colors self-end pb-0.5"
                title="Prompt negativo"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showNegative ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || !canAfford}
              className="px-5 py-3 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-white/90 transition-all self-end disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generando...' : 'Generar'}
            </button>
          </div>

          {error && (
            <p className="text-[11px] text-red-400 text-center">{error}</p>
          )}
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

      {/* Image modal — side panel + large image */}
      {modalImage && (
        <div className="fixed inset-0 z-[9999] flex bg-black/95">

          {/* Left panel */}
          <div className="w-[260px] flex-shrink-0 border-r border-white/[0.08] flex flex-col overflow-y-auto p-5 gap-4">

            <button
              onClick={() => setModalImage(null)}
              className="self-start p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Prompt</p>
              <p className="text-xs text-white/70 leading-relaxed">{modalImage.prompt}</p>
            </div>

            <div className="flex gap-2 text-[11px] text-white/30">
              <span>{modalImage.model}</span>
              <span>·</span>
              <span>{modalImage.aspectRatio}</span>
            </div>

            <div className="h-px bg-white/[0.08]" />

            <div className="space-y-2">

              <button
                onClick={() => { setPrompt(modalImage.prompt); setModalImage(null); setRightView('history') }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-all text-left"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recrear
              </button>

              <button
                onClick={() => { setMode('video'); setPrompt(modalImage.prompt); setModalImage(null) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-all text-left"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Crear vídeo
              </button>

              <button
                onClick={() => {
                  handleShare({ id: '', type: 'image', prompt: modalImage.prompt, model: modalImage.model, aspectRatio: modalImage.aspectRatio, images: [modalImage.url], createdAt: new Date(), expiresAt: new Date(), provider: 'bfl' }, 0)
                  setModalImage(null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-all text-left"
              >
                <Share2 className="w-4 h-4 flex-shrink-0" />
                Compartir en galería
              </button>

              <a
                href={modalImage.url}
                download="elitelabs-image.jpg"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                Descargar
              </a>
            </div>

            {/* Batch thumbnails */}
            {modalImage.allImages.length > 1 && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">En este batch</p>
                <div className="grid grid-cols-4 gap-1">
                  {modalImage.allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setModalImage(prev => prev ? { ...prev, url: img, currentIndex: i } : null)}
                      className={`aspect-square rounded-lg overflow-hidden border transition-all ${
                        i === modalImage.currentIndex ? 'border-white/50' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main image */}
          <div className="flex-1 relative flex items-center justify-center p-8">

            {modalImage.currentIndex > 0 && (
              <button
                onClick={() => setModalImage(prev => prev ? {
                  ...prev,
                  url: prev.allImages[prev.currentIndex - 1],
                  currentIndex: prev.currentIndex - 1,
                } : null)}
                className="absolute left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full border border-white/10 text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalImage.url}
              alt={modalImage.prompt}
              className="max-w-full max-h-full object-contain rounded-2xl"
            />

            {modalImage.currentIndex < modalImage.allImages.length - 1 && (
              <button
                onClick={() => setModalImage(prev => prev ? {
                  ...prev,
                  url: prev.allImages[prev.currentIndex + 1],
                  currentIndex: prev.currentIndex + 1,
                } : null)}
                className="absolute right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full border border-white/10 text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
