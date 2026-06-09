'use client'
import { useEffect } from 'react'

export default function VisitTracker() {
  useEffect(() => {
    if (!sessionStorage.getItem('visit_tracked')) {
      fetch('/api/visit', { method: 'POST' }).catch(() => {})
      sessionStorage.setItem('visit_tracked', '1')
    }
  }, [])

  return null
}
