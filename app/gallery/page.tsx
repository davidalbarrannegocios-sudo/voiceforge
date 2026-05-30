'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface GalleryImage {
  id: string
  imageUrl: string
  prompt: string
  model: string
  aspectRatio: string
  createdAt: string
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/gallery?page=${page}&limit=20`)
      .then(r => r.json())
      .then(data => {
        const incoming: GalleryImage[] = data.images ?? []
        setImages(prev => page === 1 ? incoming : [...prev, ...incoming])
        setHasMore(incoming.length === 20)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition-colors text-sm">
            ← Elite Labs
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="text-sm font-semibold text-white">Galería</h1>
        </div>
        <Link
          href="/dashboard?tab=imagevideo"
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition-colors"
        >
          Crear imagen
        </Link>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && images.length === 0 ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="mb-3 rounded-xl bg-white/[0.05] animate-pulse"
                style={{ height: `${180 + (i % 3) * 80}px` }}
              />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-white/20 text-sm">La galería está vacía todavía.</p>
            <p className="text-white/10 text-xs mt-1">Sé el primero en compartir una imagen.</p>
            <Link
              href="/dashboard?tab=imagevideo"
              className="mt-6 px-5 py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition-colors"
            >
              Generar imagen
            </Link>
          </div>
        ) : (
          <>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
              {images.map(img => (
                <div
                  key={img.id}
                  className="mb-3 break-inside-avoid group relative rounded-xl overflow-hidden border border-white/[0.08]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                    <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">{img.prompt}</p>
                    <p className="text-[10px] text-white/40 mt-1">{img.model}</p>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all disabled:opacity-40"
                >
                  {loading ? 'Cargando...' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
