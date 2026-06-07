import Link from 'next/link'
import Image from 'next/image'
import { client } from '@/sanity/lib/client'
import { postsQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'

export const dynamic = "force-dynamic"

export const metadata = {
  title: 'Blog — Elite Labs',
  description: 'Artículos sobre síntesis de voz con IA, clonación de voz, text-to-speech en español y las últimas novedades de Elite Labs.',
  alternates: {
    canonical: 'https://www.elitelabs.es/blog',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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

export default async function BlogPage() {
  const posts: Post[] = await client.fetch(postsQuery)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: 'white' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-10" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: '#222222' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} style={{ height: '28px', width: 'auto', objectFit: 'contain' }} className="rounded-lg" />
            <span className="font-bold text-white">Elite Labs</span>
          </Link>
          <Link href="/" className="text-sm transition-colors hover:text-white" style={{ color: '#8888a8' }}>← Volver</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Blog</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-lg">Guides, updates and insights about AI voice synthesis</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-24" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <p className="text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug.current}`} className="group block">
                <article
                  className="rounded-2xl overflow-hidden transition-all duration-200 h-full"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {post.mainImage ? (
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={urlFor(post.mainImage).width(600).height(340).url()}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  )}
                  <div className="p-6">
                    {post.categories && post.categories.length > 0 && (
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6366f1' }}>
                        {post.categories[0]}
                      </span>
                    )}
                    <h2 className="text-lg font-semibold mt-2 mb-3 leading-snug group-hover:text-white/80 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      {post.publishedAt && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(post.publishedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                      {post.author && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{post.author}</span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
