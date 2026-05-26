'use client'
import { useState, useEffect } from 'react'
import { translations, getLocale, type Locale } from '@/lib/i18n'

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>('es')

  useEffect(() => {
    setLocale(getLocale())
  }, [])

  const t = (key: string): string => {
    return translations[locale]?.[key] ?? translations['es'][key] ?? key
  }

  return { t, locale }
}
