import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elite Labs — Narración con IA de calidad profesional",
  description:
    "Genera voces realistas con IA y clona cualquier voz con solo 10 segundos de audio. Powered by Chatterbox TTS.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

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
        colorNeutral: '#ffffff',
        colorTextOnPrimaryBackground: '#ffffff',
      },
      elements: {
        card: 'bg-[#0a0a0f] text-white',
        headerTitle: 'text-white',
        headerSubtitle: 'text-gray-300',
        formFieldLabel: 'text-white',
        formFieldInput: 'bg-[#1a1a2e] text-white border-gray-600',
        footerActionLink: 'text-blue-400',
        identityPreviewText: 'text-white',
        identityPreviewEditButton: 'text-blue-400',
        userPreviewMainIdentifier: 'text-white',
        userPreviewSecondaryIdentifier: 'text-gray-300',
        navbarButton: 'text-white',
        profileSectionTitle: 'text-white',
        profileSectionContent: 'text-white',
        badge: 'text-white',
        tableHead: 'text-gray-300',
      },
    }}>
      <html lang={locale}>
        <body className={`${inter.className} antialiased`}>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
