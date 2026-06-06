"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import esData from "@/messages/es.json";
import enData from "@/messages/en.json";
import frData from "@/messages/fr.json";
import deData from "@/messages/de.json";
import ptData from "@/messages/pt.json";

export type Lang = "es" | "en" | "fr" | "de" | "pt";

export interface Translations {
  nav: {
    home: string; customVoice: string; generate: string; transcribe: string;
    translate: string; history: string; billing: string; referrals: string;
    account: string; products: string; platform: string; characters: string;
    buy: string; upgradePlan: string; signOut: string; discover: string;
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
  pricing: { [key: string]: string };
  voicesPage: { [key: string]: string };
  sidebar: { [key: string]: string };
  history: { [key: string]: string };
  translate: { [key: string]: string };
  transcribe: { [key: string]: string };
  dialogue: { [key: string]: string };
  imagevideo: { [key: string]: string };
  referral: { [key: string]: string };
  affiliate: { [key: string]: string };
  support: { [key: string]: string };
  [key: string]: Record<string, string>;
}

const STORAGE_KEY = "elitelabs_lang";
const VALID_LANGS: Lang[] = ["es", "en", "fr", "de", "pt"];

const ALL: Record<Lang, Translations> = {
  es: esData as unknown as Translations,
  en: enData as unknown as Translations,
  fr: frData as unknown as Translations,
  de: deData as unknown as Translations,
  pt: ptData as unknown as Translations,
};

interface LangCtx {
  lang: Lang;
  t: Translations;
  toggle: () => void;
  setLang: (lang: string) => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: "en", t: ALL.en, toggle: () => {}, setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && (VALID_LANGS as string[]).includes(stored)) {
      setLangState(stored);
      return;
    }
    // No stored preference: fetch from DB
    fetch("/api/credits")
      .then(r => r.json())
      .then(d => {
        const dbLang = d.language as Lang | undefined;
        if (dbLang && (VALID_LANGS as string[]).includes(dbLang)) {
          setLangState(dbLang);
          localStorage.setItem(STORAGE_KEY, dbLang);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: string) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l as Lang);
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: l }),
    }).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "es" ? "en" : "es");
  }, [lang, setLang]);

  return (
    <LanguageContext.Provider value={{ lang, t: ALL[lang], toggle, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LangCtx {
  return useContext(LanguageContext);
}
