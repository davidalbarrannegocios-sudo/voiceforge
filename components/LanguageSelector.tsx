"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

const LANGUAGES = [
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "pt", flag: "🇵🇹", label: "Português" },
];

const STORAGE_KEY = "elitelabs_lang";

export function LanguageSelector() {
  const { isSignedIn } = useUser();
  const [lang, setLangState] = useState("en");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setLangState(stored);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (code: string) => {
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
    setOpen(false);
    if (isSignedIn) {
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code }),
      }).catch(() => {});
    }
  };

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
        style={{ color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer" }}
        onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: "15px" }}>{current.flag}</span>
        <span style={{ fontSize: "12px", fontWeight: 500 }}>{current.code.toUpperCase()}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="glass-menu"
          style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: "160px", zIndex: 9999, padding: "4px" }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                color: l.code === lang ? "#fff" : "#9ca3af",
                background: l.code === lang ? "rgba(255,255,255,0.06)" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => {
                e.currentTarget.style.background = l.code === lang ? "rgba(255,255,255,0.06)" : "transparent";
                e.currentTarget.style.color = l.code === lang ? "#fff" : "#9ca3af";
              }}
            >
              <span style={{ fontSize: "15px" }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.label}</span>
              {l.code === lang && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
