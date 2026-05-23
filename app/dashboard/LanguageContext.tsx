"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Lang = "es" | "en";

const T = {
  es: {
    nav: {
      home: "Inicio",
      customVoice: "Voz personalizada",
      generate: "Texto a voz",
      transcribe: "Audio a Texto",
      translate: "Traducción de audio",
      history: "Historial",
      billing: "Facturación",
      referrals: "Referidos",
      account: "Mi cuenta",
      products: "Productos",
      platform: "Plataforma",
      characters: "Caracteres",
      buy: "+ Comprar",
    },
    tabs: {
      home: "Inicio",
      generate: "Texto a Voz",
      transcribe: "Audio a Texto",
      translate: "Traducción de Audio",
      history: "Historial",
      billing: "Facturación",
      voices: "Mis Voces",
      referral: "Referidos",
    },
    home: {
      greeting: "Hola,",
      defaultName: "de nuevo",
      available: "caracteres disponibles",
      cardGenerate: "Texto a Voz",
      cardGenerateDesc: "Convierte texto en voz natural al instante",
      cardVoices: "Mis Voces",
      cardVoicesDesc: "Gestiona y clona tus voces personalizadas",
      cardHistory: "Historial",
      cardHistoryDesc: "Revisa todas tus generaciones anteriores",
      cardTranscribe: "Audio a Texto",
      cardTranscribeDesc: "Transcribe cualquier audio a texto al instante",
      cardTranslate: "Traducción de Audio",
      cardTranslateDesc: "Traduce tus audios a otros idiomas automáticamente",
    },
    generate: {
      placeholder: "Escribe el texto a narrar...",
      generateBtn: "Generar audio",
      generating: "Generando...",
      settingsTab: "Ajustes",
      historyTab: "Historial",
      voiceLabel: "Voz",
      randomVoice: "Voz aleatoria",
      paidOnly: "Solo en planes de pago",
      paidOnlyLong: "Solo disponible en planes de pago",
      defaultVoice: "Voz por defecto",
      clonedVoice: "Voz clonada",
      systemVoice: "Sistema",
      audioControls: "Controles de audio",
      speed: "Velocidad",
      volume: "Volumen",
      pitch: "Tono (Pitch)",
      characters: "caracteres",
      credits: "créditos",
    },
  },
  en: {
    nav: {
      home: "Home",
      customVoice: "Custom Voice",
      generate: "Text to Speech",
      transcribe: "Audio to Text",
      translate: "Audio Translation",
      history: "History",
      billing: "Billing",
      referrals: "Referrals",
      account: "My Account",
      products: "Products",
      platform: "Platform",
      characters: "Characters",
      buy: "+ Buy",
    },
    tabs: {
      home: "Home",
      generate: "Text to Speech",
      transcribe: "Audio to Text",
      translate: "Audio Translation",
      history: "History",
      billing: "Billing",
      voices: "My Voices",
      referral: "Referrals",
    },
    home: {
      greeting: "Hello,",
      defaultName: "again",
      available: "characters available",
      cardGenerate: "Text to Speech",
      cardGenerateDesc: "Convert text to natural voice instantly",
      cardVoices: "My Voices",
      cardVoicesDesc: "Manage and clone your custom voices",
      cardHistory: "History",
      cardHistoryDesc: "Review all your previous generations",
      cardTranscribe: "Audio to Text",
      cardTranscribeDesc: "Transcribe any audio to text instantly",
      cardTranslate: "Audio Translation",
      cardTranslateDesc: "Translate your audio to other languages automatically",
    },
    generate: {
      placeholder: "Write the text to narrate...",
      generateBtn: "Generate audio",
      generating: "Generating...",
      settingsTab: "Settings",
      historyTab: "History",
      voiceLabel: "Voice",
      randomVoice: "Random voice",
      paidOnly: "Paid plans only",
      paidOnlyLong: "Only available on paid plans",
      defaultVoice: "Default voice",
      clonedVoice: "Cloned voice",
      systemVoice: "System",
      audioControls: "Audio controls",
      speed: "Speed",
      volume: "Volume",
      pitch: "Pitch",
      characters: "characters",
      credits: "credits",
    },
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends object ? Widen<T[K]> : string };
export type Translations = Widen<typeof T.es>;

interface LangCtx {
  lang: Lang;
  t: Translations;
  toggle: () => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: "es",
  t: T.es,
  toggle: () => {},
});

const STORAGE_KEY = "elitelabs_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "es" ? "en" : "es";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: T[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
