import type { Metadata } from "next";
import { Suspense } from "react";
import DesignVoiceClient from "./DesignVoiceClient";

export const metadata: Metadata = {
  title: "Diseño de Voz con IA | Crea voces originales sin grabar | Elite Labs",
  description:
    "Describe la voz que quieres y la IA la crea en 15 segundos. Sin micrófonos, sin actores de voz. Crea personajes, narradores y locutores únicos con Elite Labs.",
  keywords: [
    "diseño de voz IA",
    "crear voz IA sin grabar",
    "generador de voz artificial",
    "voz para personajes IA",
    "narrador IA español",
    "locutor IA",
    "fish audio s2",
    "text to speech personalizado",
    "voz original IA",
    "elite labs diseño voz",
  ],
  openGraph: {
    title: "Diseño de Voz con IA | Crea voces originales sin grabar | Elite Labs",
    description:
      "Describe la voz que quieres y la IA la crea en 15 segundos. Sin micrófonos, sin actores de voz.",
    url: "https://www.elitelabs.es/design-voice",
    siteName: "Elite Labs",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Diseño de Voz con IA — Elite Labs",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diseño de Voz con IA | Crea voces originales sin grabar | Elite Labs",
    description:
      "Describe la voz que quieres y la IA la crea en 15 segundos. Sin micrófonos, sin actores de voz.",
    images: ["/og-image.png"],
    creator: "@elitelabs_es",
  },
  alternates: {
    canonical: "https://www.elitelabs.es/design-voice",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function DesignVoicePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <DesignVoiceClient />
    </Suspense>
  );
}
