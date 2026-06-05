import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AffiliateRefTracker } from "@/components/AffiliateRefTracker";
import { LanguageProvider } from "@/app/dashboard/LanguageContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.elitelabs.es'),
  title: {
    default: 'Elite Labs — Síntesis de Voz con IA en Español',
    template: '%s | Elite Labs',
  },
  description: 'Genera voces realistas con IA, clona cualquier voz y crea audios profesionales en español. El mejor text-to-speech en español con Fish Audio y ElevenLabs.',
  keywords: [
    'text to speech español', 'síntesis de voz IA', 'clonar voz IA',
    'narración IA español', 'voz artificial español', 'TTS español',
    'generador de voz IA', 'voice cloning español', 'audio IA',
    'elite labs', 'fish audio español', 'elevenlabs español',
    'texto a voz español', 'narración profesional IA',
    'text to speech', 'AI voice generator', 'voice cloning AI',
    'Sprachsynthese KI', 'synthèse vocale IA', 'síntese de voz IA',
    'AI语音生成', '语音克隆',
  ],
  authors: [{ name: 'Elite Labs', url: 'https://www.elitelabs.es' }],
  creator: 'Elite Labs',
  publisher: 'Elite Labs',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    alternateLocale: ['en_US', 'de_DE', 'fr_FR', 'pt_BR', 'zh_CN'],
    url: 'https://www.elitelabs.es',
    siteName: 'Elite Labs',
    title: 'Elite Labs — Síntesis de Voz con IA en Español',
    description: 'Genera voces realistas con IA, clona cualquier voz y crea audios profesionales en español.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Elite Labs — Síntesis de Voz con IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elite Labs — Síntesis de Voz con IA en Español',
    description: 'Genera voces realistas con IA, clona cualquier voz y crea audios profesionales en español.',
    images: ['/og-image.png'],
    creator: '@elitelabs_es',
  },
  alternates: {
    canonical: 'https://www.elitelabs.es',
    languages: {
      'es':        'https://www.elitelabs.es',
      'en':        'https://www.elitelabs.es/en',
      'de':        'https://www.elitelabs.es/de',
      'fr':        'https://www.elitelabs.es/fr',
      'pt':        'https://www.elitelabs.es/pt',
      'zh':        'https://www.elitelabs.es/zh',
      'x-default': 'https://www.elitelabs.es',
    },
  },
  verification: {
    google: 'VWJ5i5JnL5efRpU_OdRsXl7rU9svX2sbymC3cJkf3XA',
  },
  icons: {
    icon: '/elitelabs.png',
    apple: '/elitelabs.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={{
      baseTheme: dark,
      variables: {
        colorBackground: '#000000',
        colorInputBackground: '#1a1a1a',
        colorText: '#ffffff',
        colorTextSecondary: '#888888',
        colorPrimary: '#ffffff',
        colorInputText: '#ffffff',
        colorNeutral: '#ffffff',
        colorTextOnPrimaryBackground: '#000000',
      },
      elements: {
        card: 'bg-[#111111] text-white',
        headerTitle: 'text-white',
        headerSubtitle: 'text-gray-300',
        formFieldLabel: 'text-white',
        formFieldInput: 'bg-[#1a1a1a] text-white border-gray-700',
        footerActionLink: 'text-gray-300',
        identityPreviewText: 'text-white',
        identityPreviewEditButton: 'text-gray-300',
        userPreviewMainIdentifier: 'text-white',
        userPreviewSecondaryIdentifier: 'text-gray-300',
        navbarButton: 'text-white',
        profileSectionTitle: 'text-white',
        profileSectionContent: 'text-white',
        badge: 'text-white',
        tableHead: 'text-gray-300',
      },
    }}>
      <html lang="es">
        <body className={`${inter.className} antialiased`}>
          <LanguageProvider>
            <AffiliateRefTracker />
            {children}
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
