"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/app/dashboard/LanguageContext";

const LANGUAGES = [
  { code: "en", flag: "https://flagcdn.com/w20/us.png", label: "English" },
  { code: "es", flag: "https://flagcdn.com/w20/es.png", label: "Español" },
  { code: "de", flag: "https://flagcdn.com/w20/de.png", label: "Deutsch" },
  { code: "fr", flag: "https://flagcdn.com/w20/fr.png", label: "Français" },
  { code: "pt", flag: "https://flagcdn.com/w20/pt.png", label: "Português" },
];

export function LanguageSelector() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (code: string) => {
    setLang(code);
    setOpen(false);
  };

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px", borderRadius: "8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer", color: "#ffffff", fontSize: "13px",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.flag}
          alt={current.code}
          width={16}
          height={12}
          style={{ objectFit: "cover", borderRadius: "2px", display: "block" }}
        />
        <span style={{ fontWeight: 500 }}>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          minWidth: "140px", zIndex: 9999,
          background: "rgba(18,18,18,0.92)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "12px", overflow: "hidden",
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          padding: "4px",
        }}>
          {LANGUAGES.map(l => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => handleSelect(l.code)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "none", cursor: "pointer", textAlign: "left",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.6)",
                  fontSize: "13px", transition: "background 0.12s, color 0.12s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = active ? "rgba(255,255,255,0.08)" : "transparent";
                  e.currentTarget.style.color = active ? "#ffffff" : "rgba(255,255,255,0.6)";
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.flag}
                  alt={l.code}
                  width={16}
                  height={12}
                  style={{ objectFit: "cover", borderRadius: "2px", flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontWeight: active ? 600 : 400 }}>{l.label}</span>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
                    <path d="M1.5 5.5L4 8L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
