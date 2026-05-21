import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
      baseTheme: dark,
      variables: {
        colorBackground: '#0a0a0f',
        colorInputBackground: '#1a1a2e',
        colorText: '#ffffff',
        colorTextSecondary: '#a0a0b0',
        colorPrimary: '#3b82f6',
        colorInputText: '#ffffff',
      },
    }}>
      <html lang="es">
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
