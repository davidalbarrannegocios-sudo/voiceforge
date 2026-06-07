import { MetadataRoute } from 'next'

const BASE_URL = 'https://www.elitelabs.es'
const LOCALES = ['', '/en', '/de', '/fr', '/pt', '/zh']

const PAGES = [
  { path: '',          changeFrequency: 'weekly'  as const, priority: 1.0 },
  { path: '/pricing',  changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/blog',     changeFrequency: 'weekly'  as const, priority: 0.8 },
  { path: '/voices',   changeFrequency: 'weekly'  as const, priority: 0.8 },
  { path: '/about',    changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/docs',     changeFrequency: 'weekly'  as const, priority: 0.7 },
  { path: '/support',  changeFrequency: 'monthly' as const, priority: 0.5 },
  { path: '/sign-up',  changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/sign-in',  changeFrequency: 'yearly'  as const, priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const page of PAGES) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${locale}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: locale === '' ? page.priority : page.priority * 0.9,
      })
    }
  }

  return entries
}
