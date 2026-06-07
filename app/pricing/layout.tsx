import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Precios — Planes de Text-to-Speech con IA',
  description: 'Planes desde 7$/mes. Genera voces realistas con IA en español. Free, Starter, Pro, Elite y Enterprise. Sin compromiso, cancela cuando quieras.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://www.elitelabs.es/pricing',
    languages: {
      'es':        'https://www.elitelabs.es/pricing',
      'en':        'https://www.elitelabs.es/en/pricing',
      'de':        'https://www.elitelabs.es/de/pricing',
      'fr':        'https://www.elitelabs.es/fr/pricing',
      'pt':        'https://www.elitelabs.es/pt/pricing',
      'zh':        'https://www.elitelabs.es/zh/pricing',
      'x-default': 'https://www.elitelabs.es/pricing',
    },
  },
  openGraph: {
    title: 'Precios Elite Labs — Text-to-Speech IA en Español',
    description: 'Planes desde 7$/mes para síntesis de voz con IA. Empieza gratis.',
    url: 'https://www.elitelabs.es/pricing',
    locale: 'es_ES',
    alternateLocale: ['en_US', 'de_DE', 'fr_FR', 'pt_BR', 'zh_CN'],
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
