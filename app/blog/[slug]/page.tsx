import { client } from '@/sanity/lib/client'
import { postQuery, postsQuery } from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import { PortableText, type PortableTextBlock } from '@portabletext/react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600

type Params = Promise<{ slug: string }>

type Post = {
  _id: string
  title: string
  slug: { current: string }
  excerpt?: string
  mainImage?: object
  publishedAt?: string
  body?: PortableTextBlock[]
  seoTitle?: string
  seoDescription?: string
  categories?: string[]
  author?: { name: string; image?: object; bio?: string }
}

export async function generateStaticParams() {
  const posts: Post[] = await client.fetch(postsQuery)
  return posts.map((post) => ({ slug: post.slug.current }))
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const post: Post | null = await client.fetch(postQuery, { slug })
  if (!post) return {}
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    robots: { index: true, follow: true },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      url: `https://www.elitelabs.es/blog/${slug}`,
      locale: 'es_ES',
    },
  }
}

const portableTextComponents = {
  types: {
    image: ({ value }: { value: object }) => (
      <div className="my-8 rounded-xl overflow-hidden">
        <Image
          src={urlFor(value).width(800).url()}
          alt=""
          width={800}
          height={450}
          className="w-full"
        />
      </div>
    ),
    code: ({ value }: { value: { code?: string; language?: string } }) => (
      <pre className="my-6 p-4 rounded-xl overflow-x-auto text-sm" style={{ background: '#0a0a0a', border: '1px solid #222' }}>
        <code style={{ color: '#e5e7eb' }}>{value.code}</code>
      </pre>
    ),
  },
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params
  const post: Post | null = await client.fetch(postQuery, { slug })
  if (!post) notFound()

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: 'white' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-10" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: '#222222' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} style={{ height: '28px', width: 'auto', objectFit: 'contain' }} className="rounded-lg" />
            <span className="font-bold text-white">Elite Labs</span>
          </Link>
          <Link href="/blog" className="text-sm transition-colors hover:text-white" style={{ color: '#8888a8' }}>← Blog</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {post.categories && post.categories.length > 0 && (
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6366f1' }}>
            {post.categories.join(' · ')}
          </span>
        )}

        <h1 className="text-4xl font-bold mt-4 mb-6 leading-tight">{post.title}</h1>

        <div className="flex items-center gap-4 mb-10 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {post.author?.name && <span>By {post.author.name}</span>}
          {post.publishedAt && (
            <span>
              {new Date(post.publishedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
        </div>

        {post.mainImage && (
          <div className="aspect-video relative rounded-2xl overflow-hidden mb-12">
            <Image
              src={urlFor(post.mainImage).width(900).height(506).url()}
              alt={post.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {post.body && (
          <div className="prose prose-invert prose-lg max-w-none">
            <PortableText value={post.body} components={portableTextComponents} />
          </div>
        )}
      </article>
    </div>
  )
}
