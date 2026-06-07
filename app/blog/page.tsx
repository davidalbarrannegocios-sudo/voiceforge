import Link from 'next/link'
import Image from 'next/image'
import { client } from '@/sanity/lib/client'
import { postsQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'

export const dynamic = "force-dynamic"

export const metadata = {
  title: 'Blog — Elite Labs',
  description: 'Artículos sobre síntesis de voz con IA, clonación de voz, text-to-speech en español y las últimas novedades de Elite Labs.',
  alternates: { canonical: 'https://www.elitelabs.es/blog' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: 'Blog — Elite Labs',
    description: 'Artículos sobre síntesis de voz con IA, clonación de voz y text-to-speech en español.',
    url: 'https://www.elitelabs.es/blog',
    locale: 'es_ES',
  },
}

type Post = {
  _id: string
  title: string
  slug: { current: string }
  excerpt?: string
  mainImage?: object
  publishedAt?: string
  categories?: string[]
  author?: string
}

const CAT_PALETTE: { bg: string; color: string }[] = [
  { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  { bg: 'rgba(14,165,233,0.15)',  color: '#38bdf8' },
  { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
]

function catStyle(cat: string, allCats: string[]) {
  const idx = allCats.indexOf(cat)
  return idx >= 0 ? CAT_PALETTE[idx % CAT_PALETTE.length] : { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category: activeCategory = 'All' } = await searchParams
  const posts: Post[] = await client.fetch(postsQuery)

  const allCats = Array.from(new Set(posts.flatMap(p => p.categories ?? [])))
  const filtered = activeCategory === 'All'
    ? posts
    : posts.filter(p => p.categories?.includes(activeCategory))

  return (
    <div style={{ background: '#0a0a0f', color: 'white', minHeight: '100vh' }}>

      {/* ── Nav ────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <Image src="/elitelabs.png" alt="Elite Labs" width={24} height={24} style={{ height: 24, width: 'auto', borderRadius: 6 }} />
            <span style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>Elite Labs</span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            ← Volver
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <div style={{ padding: '56px 0 36px' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Blog</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Guías, actualizaciones y novedades sobre síntesis de voz con IA
          </p>
        </div>

        {/* ── Category filter ────────────────────────────────────── */}
        {allCats.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 36 }}>
            {['All', ...allCats].map(cat => {
              const isActive = cat === activeCategory
              const style = cat === 'All' ? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' } : catStyle(cat, allCats)
              return (
                <Link
                  key={cat}
                  href={cat === 'All' ? '/blog' : `/blog?category=${encodeURIComponent(cat)}`}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    background: isActive ? style.bg : 'transparent',
                    color: isActive ? style.color : 'rgba(255,255,255,0.38)',
                    border: `1px solid ${isActive ? style.color + '44' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {cat}
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Post list ──────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)' }}>
            <p style={{ fontSize: 16 }}>No hay posts todavía. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <div>
            {filtered.map((post, i) => (
              <div key={post._id}>
                {i > 0 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                )}
                <Link href={`/blog/${post.slug.current}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <article
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 20,
                      padding: '24px 12px', borderRadius: 12,
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    className="blog-row"
                  >
                    {/* Thumbnail */}
                    {post.mainImage ? (
                      <div style={{
                        width: 96, height: 68, flexShrink: 0,
                        borderRadius: 10, overflow: 'hidden',
                        background: 'rgba(255,255,255,0.04)',
                      }}>
                        <Image
                          src={urlFor(post.mainImage).width(192).height(136).url()}
                          alt={post.title}
                          width={96}
                          height={68}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: 96, height: 68, flexShrink: 0,
                        borderRadius: 10, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }} />
                    )}

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {post.categories && post.categories.length > 0 && (() => {
                        const s = catStyle(post.categories[0], allCats)
                        return (
                          <span style={{
                            display: 'inline-block', marginBottom: 8,
                            padding: '2px 9px', borderRadius: 999,
                            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                            background: s.bg, color: s.color,
                          }}>
                            {post.categories[0]}
                          </span>
                        )
                      })()}
                      <h2 style={{
                        margin: '0 0 6px', fontSize: 16, fontWeight: 600,
                        color: 'rgba(255,255,255,0.92)', lineHeight: 1.4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p style={{
                          margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.42)',
                          lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {post.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div style={{
                      flexShrink: 0, textAlign: 'right',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
                      paddingTop: 2,
                    }}>
                      {post.author && (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                          {post.author}
                        </span>
                      )}
                      {post.publishedAt && (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                          {formatDate(post.publishedAt)}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ── CTA ────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 64, padding: '40px 32px',
          borderRadius: 16, textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            Genera voces con IA de calidad profesional
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
            Clonación de voz, text-to-speech y mucho más en Elite Labs
          </p>
          <Link
            href="https://www.elitelabs.es"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', borderRadius: 999,
              background: 'white', color: '#0a0a0f',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            Ir a EliteLabs.es →
          </Link>
        </div>

      </div>

      {/* Row hover via global style */}
      <style>{`
        .blog-row:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>
    </div>
  )
}
