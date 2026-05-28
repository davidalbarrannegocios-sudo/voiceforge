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
  icons: {
    icon: "/elitelabs.png",
    apple: "/elitelabs.png",
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
