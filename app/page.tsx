"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ChevronDown, Check, Lock } from "lucide-react";
import { AudioPlayer } from "./dashboard/AudioPlayer";
import { VoiceAvatarGenerative } from "@/components/VoiceAvatarGenerative";
import { useLang } from "@/app/dashboard/LanguageContext";
import VisitTracker from "@/components/VisitTracker";

/* ─── Types ─────────────────────────────────────────────────── */

interface DemoVoice {
  _id: string;
  title: string;
  cover_image?: string;
}

const STAT_AVATARS = [
  { color: "#aaaaaa", initials: "AL" },
  { color: "#aaaaaa", initials: "MR" },
  { color: "#EC4899", initials: "JG" },
  { color: "#14B8A6", initials: "PC" },
  { color: "#F97316", initials: "SL" },
];

/* ─── Waveform bars (use-case cards) ────────────────────────── */
const WAVE_BARS: [number, number][] = [
  [4,15],[12,30],[20,45],[28,38],[36,22],[44,50],[52,32],[60,55],
  [68,28],[76,42],[84,58],[92,38],[100,22],[108,48],[116,34],
  [124,52],[132,42],[140,28],[148,38],[156,52],[164,32],[172,48],[180,22],[188,18],
];

/* ─── Sub-components ────────────────────────────────────────── */

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 1.5L12.5 7 3 12.5V1.5z" />
    </svg>
  );
}

function FaqItem({ item, open, onToggle, onOpen, onClose }: {
  item: { q: string; a: string };
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "#111111", borderColor: "#222222" }}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ color: open ? "#aaaaaa" : "white" }}
      >
        <span className="font-medium pr-4 text-sm md:text-base">{item.q}</span>
        <ChevronDown
          size={18}
          className="flex-shrink-0"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 200ms ease-out",
            color: "#888888",
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? "200px" : "0",
          overflow: "hidden",
          transition: "max-height 200ms ease-out",
        }}
      >
        <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t" style={{ borderColor: "#222222" }}>
          {item.a}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { t, lang } = useLang();
  const [activeNav, setActiveNav] = useState<"products" | "empresa" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileEmpresaOpen, setMobileEmpresaOpen] = useState(false);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoVoices, setDemoVoices] = useState<DemoVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoAudioUrl, setDemoAudioUrl] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoTab, setDemoTab] = useState<"tts" | "clone" | "stt">("tts");
  const [demoText, setDemoText] = useState(t.hero.demoText);

  // Reset demo text when language changes
  useEffect(() => {
    setDemoText(t.hero.demoText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Features card state
  const [featuresAudioUrl, setFeaturesAudioUrl] = useState<string | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresPlaying, setFeaturesPlaying] = useState(false);
  const featuresAudioRef = useRef<HTMLAudioElement | null>(null);

  /* ── Translated data arrays ─────────────────────────────────── */
  const USE_CASES = [
    {
      title: t.features.useCase1,
      tags: ["Expresivo", "Dinámico", "Profesional"],
      bg: "linear-gradient(135deg,#1a0535 0%,#2d1b69 60%,#1e0a3c 100%)",
      accent: "#aaaaaa",
    },
    {
      title: t.features.useCase2,
      tags: ["Profesional", "Calmado", "Articulado"],
      bg: "linear-gradient(135deg,#030b1a 0%,#0c2461 60%,#0a1628 100%)",
      accent: "#bbbbbb",
    },
    {
      title: t.features.useCase3,
      tags: ["Natural", "Versátil", "Multiidioma"],
      bg: "linear-gradient(135deg,#1a0318 0%,#6b0f4e 60%,#2d0a22 100%)",
      accent: "#f472b6",
    },
  ];

  const FEATURES = [t.features.bullet1, t.features.bullet2, t.features.bullet3];

  const FAQ_ITEMS = [
    { q: t.faq.q1, a: t.faq.a1 },
    { q: t.faq.q2, a: t.faq.a2 },
    { q: t.faq.q3, a: t.faq.a3 },
    { q: t.faq.q4, a: t.faq.a4 },
    { q: t.faq.q5, a: t.faq.a5 },
  ];

  const NAV_PRODUCTS_LEFT = [
    { title: t.nav.tts,       desc: t.nav.ttsDesc,       href: "/dashboard" },
    { title: t.nav.stt,       desc: t.nav.sttDesc,       href: "/dashboard" },
    { title: t.nav.voiceClone,desc: t.nav.voiceCloneDesc, href: "/dashboard" },
  ];
  const NAV_PRODUCTS_RIGHT = [
    { title: t.nav.dialogue,  desc: t.nav.dialogueDesc,  href: "/dashboard" },
    { title: t.nav.imageVideo,desc: t.nav.imageVideoDesc, href: "/dashboard" },
    { title: t.nav.gallery,   desc: t.nav.galleryDesc,   href: "/gallery" },
  ];

  const NAV_EMPRESA = [
    { title: t.nav.about,   desc: t.nav.aboutDesc,   href: "/about" },
    { title: t.nav.blog,    desc: t.nav.blogDesc,    href: "/blog" },
    { title: t.nav.support, desc: t.nav.supportDesc, href: "/support" },
  ];

  function openNav(which: "products" | "empresa") {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
    setActiveNav(which);
  }
  function closeNav() {
    navCloseTimer.current = setTimeout(() => setActiveNav(null), 80);
  }

  const HOME_DEMO_VOICES: DemoVoice[] = [
    { _id: "dfa5b230c8054f429e434f4a6e9bbdec", title: "Farid Dieck" },
    { _id: "35199d5438854f5d9157c500479ab684", title: "Valentino" },
    { _id: "43e1948b1a544700bd88250916cd31e8", title: "Hatsune Miku" },
    { _id: "bfed5c0810a347dbb62e8ccce7f59c48", title: "Kasane Teto" },
    { _id: "53042fcee6b84e138e72db017d9e50a6", title: "Idea Vilariño" },
    { _id: "05100dcc9dfd4af49ea96dc5affbe5b1", title: "Narrador v2" },
  ];

  useEffect(() => {
    setDemoVoices(HOME_DEMO_VOICES);
    setSelectedVoice(HOME_DEMO_VOICES[0]._id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerateDemo() {
    if (!demoText.trim()) return;
    setDemoLoading(true);
    setDemoAudioUrl(null);
    try {
      const res = await fetch("/api/demo-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: selectedVoice, section: "hero", text: demoText }),
      });
      const data = await res.json();
      if (data.audioUrl) setDemoAudioUrl(data.audioUrl);
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleFeaturesPlay() {
    const voiceId = demoVoices[0]?._id;
    if (!voiceId) return;

    if (featuresAudioRef.current && featuresAudioUrl) {
      if (featuresPlaying) {
        featuresAudioRef.current.pause();
      } else {
        featuresAudioRef.current.play();
      }
      return;
    }

    setFeaturesLoading(true);
    try {
      const res = await fetch("/api/demo-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, section: "features" }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setFeaturesAudioUrl(data.audioUrl);
        const audio = new Audio(data.audioUrl);
        audio.onplay  = () => setFeaturesPlaying(true);
        audio.onpause = () => setFeaturesPlaying(false);
        audio.onended = () => setFeaturesPlaying(false);
        featuresAudioRef.current = audio;
        audio.play();
      }
    } finally {
      setFeaturesLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#000000", color: "white" }}>
      <VisitTracker />

      {/* ── Nav ────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "transparent" }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/elitelabs.png" alt="Elite Labs" width={32} height={32} style={{ height: "32px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }} className="rounded-lg" />
            <span className="font-bold text-white text-lg">Elite Labs</span>
          </Link>

          {/* Center links — desktop pill */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "999px", padding: "4px 16px" }}>
            {/* Products — mega menu */}
            <div
              className="relative"
              onMouseEnter={() => openNav("products")}
              onMouseLeave={closeNav}
            >
              <button
                onClick={() => setActiveNav(activeNav === "products" ? null : "products")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              >
                {t.nav.products}
                <ChevronDown size={13} style={{ transition: "transform 0.15s ease", transform: activeNav === "products" ? "rotate(180deg)" : "none" }} />
              </button>

              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: `translateX(-50%) translateY(${activeNav === "products" ? "0px" : "4px"})`,
                  opacity: activeNav === "products" ? 1 : 0,
                  pointerEvents: activeNav === "products" ? "auto" : "none",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                  width: "500px",
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "10px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  backdropFilter: "blur(20px)",
                  zIndex: 60,
                }}
              >
                <div style={{ display: "flex", gap: "4px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {NAV_PRODUCTS_LEFT.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="hover:bg-white/5 rounded-xl transition-colors"
                        style={{ display: "block", padding: "10px 12px", textDecoration: "none" }}
                      >
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "2px" }}>{item.title}</p>
                        <p style={{ fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                  <div style={{ width: "1px", background: "rgba(255,255,255,0.06)", flexShrink: 0, margin: "8px 0" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {NAV_PRODUCTS_RIGHT.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="hover:bg-white/5 rounded-xl transition-colors"
                        style={{ display: "block", padding: "10px 12px", textDecoration: "none" }}
                      >
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "2px" }}>{item.title}</p>
                        <p style={{ fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Company — mega menu */}
            <div
              className="relative"
              onMouseEnter={() => openNav("empresa")}
              onMouseLeave={closeNav}
            >
              <button
                onClick={() => setActiveNav(activeNav === "empresa" ? null : "empresa")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              >
                {t.nav.company}
                <ChevronDown size={13} style={{ transition: "transform 0.15s ease", transform: activeNav === "empresa" ? "rotate(180deg)" : "none" }} />
              </button>

              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: `translateX(-50%) translateY(${activeNav === "empresa" ? "0px" : "4px"})`,
                  opacity: activeNav === "empresa" ? 1 : 0,
                  pointerEvents: activeNav === "empresa" ? "auto" : "none",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                  width: "240px",
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "10px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  backdropFilter: "blur(20px)",
                  zIndex: 60,
                }}
              >
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 12px 6px" }}>{t.nav.company}</p>
                {NAV_EMPRESA.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="hover:bg-white/5 rounded-xl transition-colors"
                    style={{ display: "block", padding: "10px 12px", textDecoration: "none" }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "2px" }}>{item.title}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">{t.nav.pricing}</Link>
            <Link href="/voices" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">{t.nav.voices}</Link>
          </nav>

          {/* Right: hamburger (mobile) + auth */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              className="md:hidden p-2"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Menu"
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                {mobileNavOpen
                  ? <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                  : <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                }
              </svg>
            </button>

            <div className="hidden md:flex"><LanguageSelector /></div>
            {isLoaded && isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-semibold text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{ background: "#ffffff" }}
                >
                  {t.nav.dashboard}
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
                  {t.nav.signIn}
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-semibold text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all hover:-translate-y-0.5 whitespace-nowrap"
                  style={{ background: "#ffffff" }}
                >
                  {t.landing.startFree}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t" style={{ borderColor: "#1a1a1a", background: "#000000" }}>
            {/* Products accordion */}
            <button
              onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <span>{t.nav.products}</span>
              <ChevronDown size={14} style={{ transition: "transform 0.15s", transform: mobileProductsOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {mobileProductsOpen && (
              <div style={{ paddingLeft: "12px", paddingBottom: "8px", display: "flex", flexDirection: "column", gap: "1px" }}>
                {[...NAV_PRODUCTS_LEFT, ...NAV_PRODUCTS_RIGHT].map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => { setMobileNavOpen(false); setMobileProductsOpen(false); }}
                    className="hover:bg-white/5 rounded-lg transition-colors"
                    style={{ display: "block", padding: "9px 14px", textDecoration: "none" }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{item.title}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280" }}>{item.desc}</p>
                  </Link>
                ))}
              </div>
            )}
            {/* Company accordion */}
            <button
              onClick={() => setMobileEmpresaOpen(!mobileEmpresaOpen)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors border-t"
              style={{ background: "none", border: "none", borderTop: "1px solid #1a1a1a", cursor: "pointer" }}
            >
              <span>{t.nav.company}</span>
              <ChevronDown size={14} style={{ transition: "transform 0.15s", transform: mobileEmpresaOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {mobileEmpresaOpen && (
              <div style={{ paddingLeft: "12px", paddingBottom: "8px", display: "flex", flexDirection: "column", gap: "1px" }}>
                {NAV_EMPRESA.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => { setMobileNavOpen(false); setMobileEmpresaOpen(false); }}
                    className="hover:bg-white/5 rounded-lg transition-colors"
                    style={{ display: "block", padding: "9px 14px", textDecoration: "none" }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{item.title}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280" }}>{item.desc}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/pricing" onClick={() => setMobileNavOpen(false)} className="block px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors border-t" style={{ borderColor: "#1a1a1a" }}>{t.nav.pricing}</Link>
            <Link href="/voices" onClick={() => setMobileNavOpen(false)} className="block px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors border-t" style={{ borderColor: "#1a1a1a" }}>{t.nav.voices}</Link>
          </div>
        )}
      </header>

      <main>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pt-20 md:pt-32 pb-8 md:pb-20">

          {/* Heading */}
          <div className="max-w-5xl mx-auto px-4 mb-5 md:mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-10">
              {/* Left: title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
                {[t.landing.word1, t.landing.word2, t.landing.word3].map((word, i) => (
                  <span
                    key={i}
                    style={{
                      color: "#ffffff",
                      display: "inline-block",
                      marginRight: "0.35em",
                      animation: `heroWordIn 0.5s ease-out both`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    {word}
                  </span>
                ))}
                <style>{`
                  @keyframes heroWordIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </h1>

              {/* Right: subtitle */}
              <p className="text-sm md:text-base leading-relaxed md:flex-shrink-0 md:max-w-xs md:pb-0.5" style={{ color: "#6b7280" }}>
                {t.landing.subheadline}
              </p>
            </div>
          </div>

          {/* Demo widget */}
          <div className="max-w-5xl mx-auto px-4">
            <div
              className="p-3 sm:p-4 md:px-10 md:pt-8 md:pb-6"
              style={{
                background: "linear-gradient(160deg,#0d1117 0%,#0f172a 60%,#0d1117 100%)",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
            >
              {/* Tab pills */}
              <div className="mb-4 md:mb-6 overflow-x-auto scrollbar-hide flex justify-center">
                <div
                  style={{
                    position: "relative",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "100px",
                    padding: "4px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    minWidth: "max-content",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "4px",
                      left: "4px",
                      width: "calc((100% - 8px) / 3)",
                      height: "calc(100% - 8px)",
                      background: "#ffffff",
                      borderRadius: "100px",
                      pointerEvents: "none",
                      transition: "transform 0.2s ease",
                      transform: `translateX(calc(${demoTab === "tts" ? 0 : demoTab === "clone" ? 1 : 2} * 100%))`,
                    }}
                  />
                  {(["tts", "clone", "stt"] as const).map((key, i) => {
                    const labels = [t.hero.tab1, t.hero.tab2, t.hero.tab3];
                    const active = demoTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setDemoTab(key)}
                        className="px-2 sm:px-5 text-[11px] sm:text-[13px] py-1.5 md:py-[7px]"
                        style={{
                          position: "relative",
                          zIndex: 1,
                          fontWeight: active ? 600 : 500,
                          color: active ? "#111827" : "rgba(255,255,255,0.4)",
                          borderRadius: "100px",
                          background: "transparent",
                          transition: "color 0.2s ease",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {labels[i]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inner dark card */}
              <div
                style={{
                  background: "#111111",
                  border: "1px solid #1a1a1a",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                {demoTab !== "tts" ? (
                  <div
                    className="flex flex-col items-center justify-center text-center"
                    style={{ minHeight: "240px", padding: "48px 32px" }}
                  >
                    <div
                      style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: "16px",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      <Lock size={22} />
                    </div>
                    <p style={{ color: "#e5e7eb", fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
                      {t.hero.exclusiveTitle}
                    </p>
                    <p style={{ color: "#666666", fontSize: "13px", marginBottom: "20px", maxWidth: "300px" }}>
                      {t.hero.exclusiveDesc}
                    </p>
                    <Link
                      href="/sign-up"
                      className="font-semibold text-white transition-all hover:opacity-80"
                      style={{ fontSize: "13px", padding: "9px 22px", borderRadius: "8px", background: "#ffffff", color: "#000000" }}
                    >
                      {t.hero.startFreeArrow}
                    </Link>
                  </div>
                ) : (
                <div style={{ padding: "24px 20px 20px" }}>
                  {/* Voice carousel */}
                  <div style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "4px", justifyContent: "center", flexWrap: "wrap" }}>
                    {demoVoices.map((voice) => {
                      const active = selectedVoice === voice._id;
                      return (
                        <button
                          key={voice._id}
                          onClick={() => { setSelectedVoice(voice._id); setDemoAudioUrl(null); }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "16px",
                            transition: "transform 0.15s ease",
                            transform: active ? "scale(1.05)" : "scale(1)",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{
                            width: "72px",
                            height: "72px",
                            borderRadius: "16px",
                            overflow: "hidden",
                            border: active ? "2px solid #ffffff" : "2px solid transparent",
                            transition: "border-color 0.15s ease",
                            boxShadow: active ? "0 0 0 3px rgba(255,255,255,0.15)" : "none",
                          }}>
                            <VoiceAvatarGenerative seed={voice._id} size={72} />
                          </div>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: active ? 600 : 400,
                            color: active ? "#ffffff" : "rgba(255,255,255,0.45)",
                            transition: "color 0.15s ease",
                            whiteSpace: "nowrap",
                            maxWidth: "80px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {voice.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "18px 0" }} />

                  <textarea
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value.slice(0, 30000))}
                    placeholder={t.hero.demoPlaceholder}
                    rows={3}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      color: "#e5e7eb",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      outline: "none",
                      resize: "none",
                      fontFamily: "inherit",
                    }}
                  />

                  {demoAudioUrl && (
                    <div style={{ marginTop: "12px" }}>
                      <AudioPlayer src={demoAudioUrl} filename="elitelabs-demo.mp3" />
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                        {demoText.length}/30000 characters
                      </span>
                      <Link href="/voices" style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
                        {t.hero.voiceCount}
                      </Link>
                    </div>
                    <button
                      onClick={handleGenerateDemo}
                      disabled={demoLoading || !demoText.trim()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "9px 20px",
                        borderRadius: "10px",
                        background: demoLoading || !demoText.trim() ? "rgba(255,255,255,0.1)" : "#ffffff",
                        color: demoLoading || !demoText.trim() ? "rgba(255,255,255,0.3)" : "#000000",
                        fontWeight: 600,
                        fontSize: "13px",
                        border: "none",
                        cursor: demoLoading || !demoText.trim() ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {demoLoading ? (
                        <>
                          <div style={{ width: "14px", height: "14px", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          {t.hero.generating}
                        </>
                      ) : (
                        <>
                          <PlayIcon />
                          {t.hero.generatePlay}
                        </>
                      )}
                    </button>
                  </div>

                </div>
                )}
              </div>

              {/* Bottom footer bar */}
              <div className="flex items-center justify-between" style={{ paddingTop: "12px" }}>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                  <span className="text-[10px] md:text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {t.hero.poweredBy}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className="hidden sm:inline"
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", fontWeight: 600 }}
                  >
                    {t.hero.startFree}
                  </span>
                  {isLoaded && isSignedIn ? (
                    <Link
                      href="/dashboard"
                      className="font-semibold text-white transition-all hover:opacity-80 flex-shrink-0"
                      style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px", background: "#ffffff", color: "#000000" }}
                    >
                      {t.hero.goToDashboard}
                    </Link>
                  ) : (
                    <Link
                      href="/sign-up"
                      className="font-semibold text-white transition-all hover:opacity-80 flex-shrink-0"
                      style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px", background: "#ffffff", color: "#000000" }}
                    >
                      {t.landing.startFree} →
                    </Link>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Use Cases ──────────────────────────────────────────── */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">{t.features.title}</h2>
              <p className="text-gray-400">{t.features.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {USE_CASES.map((uc) => (
                <div
                  key={uc.title}
                  className="relative rounded-2xl overflow-hidden p-6 border"
                  style={{ background: uc.bg, borderColor: "rgba(255,255,255,0.05)", minHeight: "220px" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none px-4">
                    <svg viewBox="0 0 200 60" className="w-full" fill="none">
                      {WAVE_BARS.map(([x, h], i) => (
                        <rect key={i} x={x} y={(60 - h) / 2} width="4" height={h} rx="2" fill="white" />
                      ))}
                    </svg>
                  </div>

                  <div className="relative flex flex-col justify-end h-full" style={{ minHeight: "160px" }}>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(255,255,255,0.1)", color: uc.accent }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold text-white">{uc.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────── */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

              {/* Left */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-snug">
                  {t.features.desc}
                </h2>
                <ul className="space-y-4 mb-8">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(255,255,255,0.1)" }}
                      >
                        <Check size={11} style={{ color: "#aaaaaa" }} />
                      </div>
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {isLoaded && isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-block px-6 py-3 rounded-xl font-semibold text-black text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: "#ffffff", boxShadow: "0 4px 15px rgba(255,255,255,0.1)" }}
                  >
                    {t.features.goToDashboard}
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="px-6 py-3 rounded-xl font-semibold text-black text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: "#ffffff", boxShadow: "0 4px 15px rgba(255,255,255,0.1)" }}
                  >
                    {t.features.startFree}
                  </Link>
                )}
              </div>

              {/* Right: interactive studio card */}
              {(() => {
                const fv = demoVoices[0];
                return (
                  <div className="rounded-2xl border p-5" style={{ background: "#111111", borderColor: "#222222" }}>
                    {/* Window chrome */}
                    <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                      <span className="ml-2 text-xs text-gray-600">elitelabs-studio</span>
                    </div>

                    {/* Script text */}
                    <div
                      className="rounded-lg px-4 py-3 text-xs text-gray-400 mb-3 leading-relaxed"
                      style={{ background: "#000000", border: "1px solid #222222" }}
                    >
                      &ldquo;{t.features.demoScript}&rdquo;
                    </div>

                    {/* Waveform area */}
                    <div
                      className="rounded-lg px-3 pt-3 pb-2 mb-3 flex items-center justify-center"
                      style={{ background: "#000000", border: "1px solid #222222", minHeight: "56px" }}
                    >
                      {featuresPlaying ? (
                        <div className="flex items-center gap-0.5 h-9">
                          {Array.from({ length: 28 }, (_, i) => {
                            const baseH = Math.abs(Math.sin(i * 0.55) * 14 + Math.sin(i * 1.1) * 8 + 10);
                            return (
                              <div
                                key={i}
                                className="rounded-full flex-shrink-0"
                                style={{
                                  width: "3px",
                                  height: `${baseH}px`,
                                  background: "#ffffff",
                                  transformOrigin: "center",
                                  animation: `waveBar ${0.7 + (i % 4) * 0.15}s ease-in-out infinite`,
                                  animationDelay: `${(i * 0.06) % 0.5}s`,
                                }}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <svg viewBox="0 0 300 36" className="w-full" fill="none">
                          {Array.from({ length: 60 }, (_, i) => {
                            const h = Math.abs(Math.sin(i * 0.45) * 11 + Math.sin(i * 0.9) * 7 + 10);
                            return (
                              <rect
                                key={i}
                                x={i * 5}
                                y={(36 - h) / 2}
                                width="3"
                                height={h}
                                rx="1.5"
                                fill={featuresAudioUrl && i < 22 ? "rgba(255,255,255,0.6)" : "#333333"}
                              />
                            );
                          })}
                        </svg>
                      )}
                    </div>

                    {/* Voice row */}
                    <div className="flex items-center gap-3">
                      <VoiceAvatarGenerative seed={fv?._id ?? "default"} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{fv?.title ?? "..."}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>{t.features.demoLanguage}</p>
                      </div>
                      <button
                        onClick={handleFeaturesPlay}
                        disabled={featuresLoading || !fv}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "rgba(255,255,255,0.08)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {featuresLoading ? (
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : featuresPlaying ? (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                            <rect x="1" y="1" width="3" height="8" rx="1" />
                            <rect x="6" y="1" width="3" height="8" rx="1" />
                          </svg>
                        ) : (
                          <PlayIcon />
                        )}
                        {featuresLoading ? t.features.generating : featuresPlaying ? t.features.playing : featuresAudioUrl ? t.features.reproduce : t.features.listen}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <section className="py-24 relative overflow-hidden">
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden
          >
            <div
              className="w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: "radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%)" }}
            />
          </div>

          <div className="max-w-5xl mx-auto px-4 text-center relative">
            <div className="relative flex justify-center gap-3 mb-10">
              {STAT_AVATARS.map((av, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 flex-shrink-0"
                  style={{
                    background: av.color,
                    borderColor: "#000000",
                    marginTop: i % 2 === 0 ? "0px" : "12px",
                    boxShadow: `0 0 20px ${av.color}55`,
                  }}
                >
                  {av.initials}
                </div>
              ))}
            </div>

            <h2 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-4">
              2.000.000<span style={{ color: "#aaaaaa" }}>+</span>
            </h2>
            <p className="text-2xl font-semibold text-gray-200 mb-4">{t.stats.voices}</p>
            <p className="text-gray-500 max-w-md mx-auto">
              {t.stats.voicesDesc}
            </p>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">{t.faq.title}</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem
                  key={i}
                  item={item}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  onOpen={() => setOpenFaq(i)}
                  onClose={() => setOpenFaq(null)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4">
            <div
              className="rounded-2xl p-6 sm:p-12 border relative overflow-hidden text-center"
              style={{
                background: "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.04))",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <div
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(255,255,255,0.1),transparent 70%)" }}
                aria-hidden
              />

              <h2 className="text-3xl md:text-4xl font-bold mb-4 relative">
                {t.cta.title}
              </h2>
              <p className="text-gray-400 mb-8 relative">{t.cta.subtitle}</p>

              {isLoaded && isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-block px-8 py-4 rounded-xl font-semibold text-black text-base transition-all hover:-translate-y-1 relative"
                  style={{ background: "#ffffff", boxShadow: "0 4px 20px rgba(255,255,255,0.1)" }}
                >
                  {t.cta.goToDashboard}
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="px-8 py-4 rounded-xl font-semibold text-black text-base transition-all hover:-translate-y-1 relative"
                  style={{ background: "#ffffff", boxShadow: "0 4px 20px rgba(255,255,255,0.1)" }}
                >
                  {t.cta.startFree}
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: "#222222", background: "#000000" }}>
        <div className="max-w-5xl mx-auto px-4 pt-14 pb-8">

          {/* Top: brand + link columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image
                  src="/elitelabs.png"
                  alt="Elite Labs"
                  width={28}
                  height={28}
                  style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }}
                  className="rounded-lg"
                />
                <span className="font-bold text-white">Elite Labs</span>
              </Link>
              <p className="text-sm leading-relaxed" style={{ color: "#666666" }}>
                {t.footer.tagline}
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#666666" }}>{t.footer.product}</p>
              <ul className="space-y-3">
                {[
                  { label: t.nav.tts,       href: "/dashboard" },
                  { label: t.nav.stt,       href: "/dashboard" },
                  { label: t.nav.voiceClone,href: "/dashboard" },
                  { label: t.nav.dialogue,  href: "/dashboard" },
                  { label: t.nav.imageVideo,href: "/dashboard" },
                  { label: t.nav.gallery,   href: "/gallery" },
                  { label: t.nav.pricing,   href: "/pricing" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#666666" }}>{t.footer.company}</p>
              <ul className="space-y-3">
                {[
                  { label: t.nav.about,   href: "/about" },
                  { label: t.nav.blog,    href: "/blog" },
                  { label: t.nav.support, href: "/support" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#666666" }}>{t.footer.legal}</p>
              <ul className="space-y-3">
                {[
                  { label: t.footer.privacy, href: "/privacy" },
                  { label: t.footer.terms,   href: "/terms" },
                  { label: t.footer.dmca,    href: "/dmca" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t mb-6" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 order-last sm:order-first">
              <p className="text-xs" style={{ color: "#666666" }}>
                {t.footer.copyright}
              </p>
              <LanguageSelector />
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              {[
                { label: t.footer.privacy,  href: "/privacy" },
                { label: t.footer.terms,    href: "/terms" },
                { label: t.footer.dmca,     href: "/dmca" },
                { label: t.footer.contact,  href: "/support" },
              ].map(({ label, href }, i, arr) => (
                <span key={label} className="flex items-center gap-4">
                  <a href={href} className="text-xs transition-colors hover:text-white/70" style={{ color: "#666666" }}>
                    {label}
                  </a>
                  {i < arr.length - 1 && <span style={{ color: "#222222" }}>|</span>}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* X / Twitter */}
              <a
                href="#"
                aria-label="X (Twitter)"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "#666666" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L2.013 2.25H8.08l4.253 5.623L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
              {/* YouTube */}
              <a
                href="#"
                aria-label="YouTube"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "#666666" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
