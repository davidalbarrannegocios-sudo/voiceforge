import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crear cuenta gratis',
  description: 'Crea tu cuenta en Elite Labs y empieza a generar voces con IA gratis. 5.000 caracteres gratuitos al registrarte.',
  alternates: {
    canonical: 'https://www.elitelabs.es/sign-up',
    languages: {
      'es':        'https://www.elitelabs.es/sign-up',
      'en':        'https://www.elitelabs.es/en/sign-up',
      'de':        'https://www.elitelabs.es/de/sign-up',
      'fr':        'https://www.elitelabs.es/fr/sign-up',
      'pt':        'https://www.elitelabs.es/pt/sign-up',
      'zh':        'https://www.elitelabs.es/zh/sign-up',
      'x-default': 'https://www.elitelabs.es/sign-up',
    },
  },
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children
}
