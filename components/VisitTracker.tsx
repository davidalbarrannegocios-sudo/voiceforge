'use client'
import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

export default function VisitTracker() {
  const { isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      fetch('/api/visit', { method: 'POST' }).catch(() => {})
    }
  }, [isLoaded, isSignedIn])

  return null
}
