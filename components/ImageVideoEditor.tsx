'use client'

import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon, Video, Sparkles, Upload, X, ChevronDown, Lock, Download, Share2, Check, Globe } from 'lucide-react'
import { useLang } from '@/app/dashboard/LanguageContext'

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
  const { t } = useLang()
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
    videoUrl?: string
    type: 'image' | 'video'
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
  const [galleryImages, setGalleryImages] = useState<{ id: string; imageUrl: string; prompt: string; model: string; aspectRatio: string; type?: string }[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [rightView, setRightView] = useState<'history' | 'explore'>('history')
  const [videoProgress, setVideoProgress] = useState(0)
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

    setVideoProgress(0)

    const pollVideo = async () => {
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000))
        try {
          const pollRes = await fetch('/api/video/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId }),
          })
          const pollData = await pollRes.json()
          console.log('[video poll]', i, pollData.status)

          if (pollData.progress != null) setVideoProgress(pollData.progress)

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
    const shareKey = `${item.id}-${imgIndex}`
    try {
      let body: Record<string, unknown>
      if (item.type === 'video') {
        if (!item.videoUrl) return
        body = { type: 'video', videoUrl: item.videoUrl, prompt: item.prompt, model: item.model, aspectRatio: item.aspectRatio }
      } else {
        const img = item.images[imgIndex]
        if (!img || !img.startsWith('data:')) return
        body = { type: 'image', imageBase64: img, prompt: item.prompt, model: item.model, aspectRatio: item.aspectRatio }
      }
      const res = await fetch('/api/gallery/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSharedIds(prev => new Set(prev).add(shareKey))
        showToast(item.type === 'video' ? t.imagevideo.videoShared : t.imagevideo.imageShared, 'success')
      } else {
        showToast(t.imagevideo.shareError, 'error')
      }
    } catch {
      showToast(t.imagevideo.shareError, 'error')
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
                {t.imagevideo.historyTab}
              </button>
              <button
                onClick={() => { setRightView('explore'); fetchGallery() }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  rightView === 'explore' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {t.imagevideo.exploreTab}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-orange-400/70">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{t.imagevideo.notSaved}</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-5 pb-4">

            {rightView === 'history' ? (
              (() => {
                // Flatten all history into individual cells, newest first
                const allItems: Array<{
                  type: 'image' | 'video'
                  url: string
                  prompt: string
                  model: string
                  aspectRatio: string
                  parentItem: ImageHistoryItem
                  index: number
                }> = []

                history.forEach(item => {
                  if (item.type === 'video' && item.videoUrl) {
                    allItems.push({ type: 'video', url: item.videoUrl, prompt: item.prompt, model: item.model, aspectRatio: item.aspectRatio, parentItem: item, index: 0 })
                  } else {
                    item.images.forEach((img, i) => {
                      allItems.push({ type: 'image', url: img, prompt: item.prompt, model: item.model, aspectRatio: item.aspectRatio, parentItem: item, index: i })
                    })
                  }
                })

                if (allItems.length === 0 && !isGenerating) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-white/20" />
                      </div>
                      <p className="text-sm text-white/25">{t.imagevideo.writePrompt}</p>
                      <p className="text-xs text-white/[0.12] mt-1">FLUX.2 · FLUX 1.1 Pro · Kontext · Grok Imagine</p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-4 gap-2 pt-2">

                    {/* Skeletons for in-progress generation — prepended at the start */}
                    {isGenerating && Array.from({ length: mode === 'video' ? 1 : pendingCount }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.08] aspect-square">
                        <div className="absolute inset-0 overflow-hidden">
                          <div
                            className="absolute inset-0 -translate-x-full"
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                              animation: 'shimmer 2s infinite',
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-lg font-bold text-white/40 font-mono tabular-nums">
                            {mode === 'video' ? `${videoProgress}%` : `${Math.min(99, Math.round(progress))}%`}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* History cells */}
                    {allItems.map((item, idx) => (
                      <div
                        key={`${item.parentItem.id}-${item.index}-${idx}`}
                        className="relative group overflow-hidden rounded-xl border border-white/[0.08] cursor-pointer aspect-square bg-white/[0.02]"
                        onClick={() => setModalImage({
                          url: item.url,
                          type: item.type,
                          prompt: item.prompt,
                          model: item.model,
                          aspectRatio: item.aspectRatio,
                          allImages: item.type === 'image' ? item.parentItem.images : [item.url],
                          currentIndex: item.index,
                        })}
                      >
                        {item.type === 'video' ? (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video src={item.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                          <p className="text-[10px] text-white/80 line-clamp-2 leading-relaxed">{item.prompt}</p>
                          <div className="flex gap-1 mt-1.5">
                            <a
                              href={item.url}
                              download
                              onClick={e => e.stopPropagation()}
                              className="p-1 bg-black/40 hover:bg-black/60 rounded-md transition-colors"
                            >
                              <Download className="w-3 h-3 text-white/70" />
                            </a>
                            <button
                              onClick={e => { e.stopPropagation(); handleShare(item.parentItem, item.index) }}
                              className="p-1 bg-black/40 hover:bg-black/60 rounded-md transition-colors"
                            >
                              <Share2 className="w-3 h-3 text-white/70" />
                            </button>
                          </div>
                        </div>

                        {/* Video badge */}
                        {item.type === 'video' && (
                          <div className="absolute top-1.5 right-1.5">
                            <div className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()
            ) : (
              /* Explore gallery — unified 4-column grid by date */
              galleryLoading ? (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-white/[0.05] animate-pulse" />
                  ))}
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-white/20 text-sm">{t.imagevideo.galleryEmpty}</p>
                  <p className="text-white/10 text-xs mt-1">{t.imagevideo.galleryEmptyHint}</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {galleryImages.map(img => (
                    <div
                      key={img.id}
                      className="relative group overflow-hidden rounded-xl border border-white/[0.08] cursor-pointer aspect-square bg-white/[0.02]"
                      onClick={() => setModalImage({
                        url: img.imageUrl,
                        type: img.imageUrl?.endsWith('.mp4') ? 'video' : 'image',
                        prompt: img.prompt,
                        model: img.model,
                        aspectRatio: img.aspectRatio,
                        allImages: [img.imageUrl],
                        currentIndex: 0,
                      })}
                    >
                      {img.imageUrl?.endsWith('.mp4') ? (
                        <>
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <video src={img.imageUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.imageUrl}
                          alt={img.prompt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[10px] text-white/80 line-clamp-2">{img.prompt}</p>
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
                    <div className="glass-menu absolute bottom-full left-0 mb-1 z-50 w-64 p-1.5 max-h-[320px] overflow-y-auto">
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
                <span className="text-[11px] text-white/30">{t.imagevideo.quantity}</span>
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
                {imageRefs.length > 0 ? `${imageRefs.length} ref` : t.imagevideo.reference}
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
                {creditsNeeded.toLocaleString()} cr · {credits.toLocaleString()} {t.imagevideo.available}
              </div>
            </div>
          )}

          {/* Video settings row */}
          {mode === 'video' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/40">Grok Imagine Video</span>

              <div className="h-4 w-px bg-white/10" />

              <span className="text-[11px] text-white/30">{t.imagevideo.duration}</span>
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
                {creditsNeeded.toLocaleString()} cr · {credits.toLocaleString()} {t.imagevideo.available}
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
                  ? t.imagevideo.imagePlaceholder
                  : t.imagevideo.videoPlaceholder}
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
              {isGenerating ? t.imagevideo.generating : t.imagevideo.generate}
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
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{t.imagevideo.prompt}</p>
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
                {t.imagevideo.recreate}
              </button>

              <button
                onClick={() => { setMode('video'); setPrompt(modalImage.prompt); setModalImage(null) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-all text-left"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {t.imagevideo.createVideo}
              </button>

              <button
                onClick={() => {
                  handleShare({ id: '', type: modalImage.type, prompt: modalImage.prompt, model: modalImage.model, aspectRatio: modalImage.aspectRatio, images: [modalImage.url], videoUrl: modalImage.videoUrl, createdAt: new Date(), expiresAt: new Date(), provider: 'bfl' }, 0)
                  setModalImage(null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-all text-left"
              >
                <Share2 className="w-4 h-4 flex-shrink-0" />
                {t.imagevideo.shareGallery}
              </button>

              <a
                href={modalImage.url}
                download="elitelabs-image.jpg"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                {t.imagevideo.download}
              </a>
            </div>

            {/* Batch thumbnails */}
            {modalImage.allImages.length > 1 && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">{t.imagevideo.batchLabel}</p>
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
