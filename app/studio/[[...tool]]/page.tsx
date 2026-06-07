'use client'
import dynamic from 'next/dynamic'

const Studio = dynamic(() => import('./Studio'), { ssr: false, loading: () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#101112', color: '#fff' }}>
    <p>Loading Studio…</p>
  </div>
) })

export default function StudioPage() {
  return <Studio />
}
