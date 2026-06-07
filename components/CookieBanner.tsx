'use client'
import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent_v2')
    if (!consent) setVisible(true)
  }, [])

  const saveConsent = async (type: string) => {
    localStorage.setItem('cookie_consent_v2', type)
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
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'calc(100% - 48px)',
      maxWidth: '900px',
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0, maxWidth: '620px', lineHeight: '1.5' }}>
        Usamos cookies esenciales para el funcionamiento del servicio y cookies analíticas para mejorar tu experiencia.
        {' '}
        <a href="/privacy" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'underline' }}>Política de privacidad</a>.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => saveConsent('necessary')} style={{
          padding: '8px 16px',
          borderRadius: '10px',
          fontSize: '13px',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s',
        }}>
          Solo necesarias
        </button>
        <button onClick={() => saveConsent('all')} style={{
          padding: '8px 18px',
          borderRadius: '10px',
          fontSize: '13px',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#000000',
          fontWeight: 600,
        }}>
          Aceptar todo
        </button>
      </div>
    </div>
  )
}
