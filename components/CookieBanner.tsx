'use client'
import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const saveConsent = async (type: string) => {
    localStorage.setItem('cookie_consent', type)
    setVisible(false)
    try {
      await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: type }),
      })
    } catch {}
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#111111', borderTop: '1px solid #222222',
      padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '12px',
    }}>
      <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0, maxWidth: '700px' }}>
        Usamos cookies esenciales para el funcionamiento del servicio y cookies analíticas para mejorar tu experiencia.
        Consulta nuestra{' '}
        <a href="/privacy" style={{ color: '#ffffff', textDecoration: 'underline' }}>política de privacidad</a>.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => saveConsent('necessary')} style={{
          padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
          background: 'transparent', border: '1px solid #333333', color: '#888888',
        }}>
          Solo necesarias
        </button>
        <button onClick={() => saveConsent('all')} style={{
          padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
          background: '#ffffff', border: 'none', color: '#000000', fontWeight: 600,
        }}>
          Aceptar todo
        </button>
      </div>
    </div>
  )
}
