import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Galería — Imágenes generadas con IA',
  description: 'Explora imágenes creadas por la comunidad de Elite Labs con inteligencia artificial.',
  alternates: { canonical: 'https://www.elitelabs.es/gallery' },
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children
}
