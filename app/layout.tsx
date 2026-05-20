import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elite Labs — Narración con IA de calidad profesional",
  description:
    "Genera voces realistas con IA y clona cualquier voz con solo 10 segundos de audio. Powered by Chatterbox TTS.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={{
      variables: {
        colorPrimary: '#0078ff',
        colorBackground: '#0a0a0f',
        colorText: '#ffffff',
        colorTextSecondary: '#c0c8d8',
        colorInputBackground: '#1a1a2e',
        colorInputText: '#000000',
        colorNeutral: '#ffffff',
        borderRadius: '12px',
      },
      elements: {
        card: { backgroundColor: '#0f0f1a', border: '1px solid #1e2a4a' },
        headerTitle: { color: '#ffffff' },
        headerSubtitle: { color: '#c0c8d8' },
        socialButtonsBlockButton: { color: '#ffffff', borderColor: '#1e2a4a' },
        dividerText: { color: '#c0c8d8' },
        formFieldLabel: { color: '#ffffff' },
        footerActionText: { color: '#c0c8d8' },
        footerActionLink: { color: '#0078ff' },
        identityPreviewText: { color: '#ffffff' },
        identityPreviewEditButton: { color: '#0078ff' },
        badge: { backgroundColor: '#0078ff', color: '#ffffff' },
      },
    }}>
      <html lang="es">
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
