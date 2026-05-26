"use client";

import { createContext, useContext, useCallback } from "react";
import { useMessages, useLocale } from "next-intl";

export type Lang = "es" | "en" | "fr" | "de" | "pt";

// Typed to match messages/es.json structure
export interface Translations {
  nav: {
    home: string; customVoice: string; generate: string; transcribe: string;
    translate: string; history: string; billing: string; referrals: string;
    account: string; products: string; platform: string; characters: string;
    buy: string; upgradePlan: string; signOut: string;
    [key: string]: string;
  };
  tabs: {
    home: string; generate: string; transcribe: string; translate: string;
    history: string; billing: string; voices: string; referral: string;
    [key: string]: string;
  };
  home: {
    greeting: string; defaultName: string; available: string;
    cardGenerate: string; cardGenerateDesc: string; cardVoices: string;
    cardVoicesDesc: string; cardHistory: string; cardHistoryDesc: string;
    cardTranscribe: string; cardTranscribeDesc: string;
    cardTranslate: string; cardTranslateDesc: string;
    [key: string]: string;
  };
  generate: { [key: string]: string };
  voices: { [key: string]: string };
  account: { [key: string]: string };
  billing: { [key: string]: string };
  landing: { [key: string]: string };
  auth: { [key: string]: string };
  [key: string]: Record<string, string>;
}

const COOKIE_KEY = "vf_locale";
const STORAGE_KEY = "elitelabs_lang";

interface LangCtx {
  lang: Lang;
  t: Translations;
  toggle: () => void;
  setLang: (lang: string) => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: "es",
  t: {} as Translations,
  toggle: () => {},
  setLang: () => {},
});

// Pass-through provider — locale state lives in next-intl (cookie → server)
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useLang(): LangCtx {
  const locale = useLocale() as Lang;
  const messages = useMessages() as unknown as Translations;

  const setLang = useCallback((lang: string) => {
    document.cookie = `${COOKIE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem(STORAGE_KEY, lang);
    window.location.reload();
  }, []);

  const toggle = useCallback(() => {
    setLang(locale === "es" ? "en" : "es");
  }, [locale, setLang]);

  return { lang: locale, t: messages, toggle, setLang };
}
