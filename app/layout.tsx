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
        colorTextSecondary: '#a8b2c7',
        colorInputBackground: '#1a1a2e',
        colorInputText: '#ffffff',
        colorNeutral: '#ffffff',
        borderRadius: '12px',
      },
    }}>
      <html lang="es">
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
