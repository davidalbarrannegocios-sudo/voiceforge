"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ChevronDown, Check } from "lucide-react";
import { AudioPlayer } from "./dashboard/AudioPlayer";

/* ─── Types ─────────────────────────────────────────────────── */

interface DemoVoice {
  _id: string;
  title: string;
  cover_image?: string;
}

const USE_CASES = [
  {
    title: "Narración de vídeo",
    tags: ["Expresivo", "Dinámico", "Profesional"],
    bg: "linear-gradient(135deg,#1a0535 0%,#2d1b69 60%,#1e0a3c 100%)",
    accent: "#93c5fd",
  },
  {
    title: "Audiolibros",
    tags: ["Profesional", "Calmado", "Articulado"],
    bg: "linear-gradient(135deg,#030b1a 0%,#0c2461 60%,#0a1628 100%)",
    accent: "#60a5fa",
  },
  {
    title: "Contenido YouTube",
    tags: ["Natural", "Versátil", "Multiidioma"],
    bg: "linear-gradient(135deg,#1a0318 0%,#6b0f4e 60%,#2d0a22 100%)",
    accent: "#f472b6",
  },
];

const FEATURES = [
  "Locuciones de vídeo profesionales en segundos",
  "Narración de audiolibros con voz natural",
  "Voces de personajes únicos e inmersivos",
];

const STAT_AVATARS = [
  { color: "#3b82f6", initials: "AL" },
  { color: "#3b82f6", initials: "MR" },
  { color: "#EC4899", initials: "JG" },
  { color: "#14B8A6", initials: "PC" },
  { color: "#F97316", initials: "SL" },
];

const FAQ_ITEMS = [
  {
    q: "¿Qué es Elite Labs y cómo funciona?",
    a: "Elite Labs es una plataforma de síntesis de voz con IA que convierte texto en audio de calidad profesional. Usamos modelos de inteligencia artificial avanzados para generar voces naturales en más de 80 idiomas.",
  },
  {
    q: "¿Cómo funciona la clonación de voz?",
    a: "Solo necesitas 10 segundos de audio limpio. Nuestra IA analiza las características únicas de la voz —timbre, cadencia, entonación— y crea un modelo personalizado que puedes usar en todas tus generaciones.",
  },
  {
    q: "¿Los caracteres tienen fecha de caducidad?",
    a: "No. Los caracteres que compras son tuyos para siempre. Sin suscripciones ni caducidad. Paga una vez y úsalos cuando quieras.",
  },
  {
    q: "¿En cuántos idiomas puedo generar audio?",
    a: "Elite Labs soporta más de 80 idiomas y dialectos a través de su biblioteca de voces públicas: español, inglés, francés, alemán, portugués, chino, japonés y muchos más.",
  },
  {
    q: "¿Qué calidad tiene el audio generado?",
    a: "El audio se genera en formato MP3 de alta calidad, ideal para vídeos, podcasts, audiolibros y contenido profesional. La calidad es comparable a la de un locutor profesional de estudio.",
  },
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

function FaqItem({ item, open, onToggle }: { item: typeof FAQ_ITEMS[0]; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ color: open ? "#93c5fd" : "white" }}
      >
        <span className="font-medium pr-4 text-sm md:text-base">{item.q}</span>
        <ChevronDown
          size={18}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none", color: "#8888a8" }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t" style={{ borderColor: "#2a2a3e" }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [demoVoices, setDemoVoices] = useState<DemoVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoAudioUrl, setDemoAudioUrl] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoTab, setDemoTab] = useState<"tts" | "clone" | "stt">("tts");
  const [demoText, setDemoText] = useState("Hola, soy una voz generada con inteligencia artificial por Elite Labs. La calidad es excepcional y el resultado suena completamente natural.");

  // Features card state
  const [featuresAudioUrl, setFeaturesAudioUrl] = useState<string | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresPlaying, setFeaturesPlaying] = useState(false);
  const featuresAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/public-voices?language=es&page_size=5")
      .then((r) => r.json())
      .then((data) => {
        const voices: DemoVoice[] = data.items ?? [];
        setDemoVoices(voices);
        if (voices.length > 0) setSelectedVoice(voices[0]._id);
      })
      .catch(() => {});
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

    // Toggle pause/play if audio already loaded
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
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "white" }}>

      {/* ── Nav ────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{ background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)", borderColor: "#2a2a3e" }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={32} height={32} style={{ height: "32px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }} className="rounded-lg" />
            <span className="font-bold text-white text-lg">Elite Labs</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Precios
            </Link>
            {isLoaded && isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10">
                    Iniciar sesión
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                  >
                    Empezar gratis
                  </button>
                </SignUpButton>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 px-4">

          {/* Heading — narrow */}
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-24">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-8 border"
                style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)", color: "#93c5fd" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Síntesis de voz con IA avanzada
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-5 leading-tight tracking-tight">
                La IA más realista{" "}
                <span style={{
                  background: "linear-gradient(135deg,#3b82f6,#2563eb,#93c5fd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  habla
                </span>
              </h1>

              <p className="text-xl text-gray-400 max-w-xl mx-auto">
                Clonación de voz, biblioteca de voces, narraciones y mucho más
              </p>
            </div>
          </div>

          {/* Demo widget — Fish Audio style */}
          <div className="max-w-5xl mx-auto px-4">
            <div
              style={{
                background: "linear-gradient(160deg,#0d1117 0%,#0f172a 60%,#0d1117 100%)",
                borderRadius: "20px",
                padding: "32px 40px 24px",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
            >
              {/* Tab pills — animated sliding indicator */}
              <div className="flex justify-center mb-6">
                <div
                  style={{
                    position: "relative",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "100px",
                    padding: "4px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                  }}
                >
                  {/* Sliding white pill */}
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
                    const labels = ["Texto a voz", "Clonación de voz", "De voz a texto"];
                    const active = demoTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setDemoTab(key)}
                        style={{
                          position: "relative",
                          zIndex: 1,
                          padding: "7px 20px",
                          fontSize: "13px",
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
                  background: "#0d0d17",
                  border: "1px solid #1e1e2e",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                {demoTab !== "tts" ? (
                  /* Upsell overlay for locked tabs */
                  <div
                    className="flex flex-col items-center justify-center text-center"
                    style={{ minHeight: "240px", padding: "48px 32px" }}
                  >
                    <div
                      style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "rgba(59,130,246,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "22px", marginBottom: "16px",
                      }}
                    >
                      🔒
                    </div>
                    <p style={{ color: "#e5e7eb", fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
                      Función exclusiva para miembros
                    </p>
                    <p style={{ color: "#555570", fontSize: "13px", marginBottom: "20px", maxWidth: "300px" }}>
                      Crea una cuenta gratis para acceder a esta función
                    </p>
                    <Link
                      href="/sign-up"
                      className="font-semibold text-white transition-all hover:opacity-80"
                      style={{ fontSize: "13px", padding: "9px 22px", borderRadius: "8px", background: "#2563eb" }}
                    >
                      Empezar gratis →
                    </Link>
                  </div>
                ) : (
                <div className="flex" style={{ minHeight: "240px" }}>

                  {/* Left: voice list ~280px */}
                  <div
                    className="flex-shrink-0 flex flex-col"
                    style={{ width: "280px", background: "#0d0d17", borderRight: "1px solid #1e1e2e" }}
                  >
                    <div className="flex-1 overflow-y-auto" style={{ padding: "8px" }}>
                      {demoVoices.length === 0
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="animate-pulse rounded-xl mb-0.5" style={{ height: "44px", background: "#1a1a2e" }} />
                          ))
                        : demoVoices.map((voice) => {
                            const active = selectedVoice === voice._id;
                            const proxiedSrc = voice.cover_image
                              ? `/api/voice-image?url=${encodeURIComponent(voice.cover_image)}`
                              : "";
                            return (
                              <button
                                key={voice._id}
                                onClick={() => { setSelectedVoice(voice._id); setDemoAudioUrl(null); }}
                                className="w-full flex items-center gap-2.5 rounded-xl transition-all text-left"
                                style={{
                                  height: "44px",
                                  padding: "0 10px",
                                  background: active ? "#1a1a2e" : "transparent",
                                }}
                              >
                                {proxiedSrc ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={proxiedSrc}
                                    alt=""
                                    className="rounded-full object-cover flex-shrink-0"
                                    style={{ width: "30px", height: "30px" }}
                                    onError={(e) => {
                                      const t = e.currentTarget;
                                      t.style.display = "none";
                                      const fb = t.nextElementSibling as HTMLElement | null;
                                      if (fb) fb.style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="rounded-full items-center justify-center text-white font-bold flex-shrink-0"
                                  style={{
                                    width: "30px", height: "30px", fontSize: "12px",
                                    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                                    display: proxiedSrc ? "none" : "flex",
                                  }}
                                >
                                  {voice.title[0]?.toUpperCase()}
                                </div>
                                <span
                                  className="truncate font-medium"
                                  style={{ fontSize: "13px", color: active ? "#e5e7eb" : "#555570" }}
                                >
                                  {voice.title}
                                </span>
                              </button>
                            );
                          })}
                    </div>
                    {/* 2M+ footer */}
                    <div style={{ padding: "10px 18px", borderTop: "1px solid #1e1e2e", flexShrink: 0 }}>
                      <Link
                        href="/dashboard"
                        className="transition-colors hover:text-blue-400"
                        style={{ fontSize: "12px", color: "#555570" }}
                      >
                        2.000.000+ voces <span style={{ color: "#3b82f6" }}>↗</span>
                      </Link>
                    </div>
                  </div>

                  {/* Right: textarea + footer */}
                  <div className="flex-1 flex flex-col min-w-0" style={{ background: "#0d0d17" }}>
                    <textarea
                      value={demoText}
                      onChange={(e) => setDemoText(e.target.value.slice(0, 30000))}
                      placeholder="Introduce tu propio texto"
                      className="w-full outline-none resize-none leading-relaxed placeholder-[#555570]"
                      style={{
                        flex: 1,
                        padding: "20px 22px",
                        fontSize: "14px",
                        color: "#e5e7eb",
                        background: "transparent",
                      }}
                    />

                    {demoAudioUrl && (
                      <div style={{ padding: "0 22px 12px" }}>
                        <AudioPlayer src={demoAudioUrl} filename="elitelabs-demo.mp3" />
                      </div>
                    )}

                    {/* Card footer */}
                    <div
                      className="flex items-center gap-3 flex-shrink-0"
                      style={{ padding: "12px 22px", borderTop: "1px solid #1e1e2e" }}
                    >
                      <span className="flex-1" style={{ fontSize: "12px", color: "#555570" }}>
                        {demoText.length}/30000 characters
                      </span>
                      <button
                        onClick={handleGenerateDemo}
                        disabled={demoLoading || !demoText.trim()}
                        className="flex items-center gap-1.5 font-semibold text-white transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        style={{ fontSize: "13px", padding: "9px 18px", borderRadius: "8px", background: "#111", border: "1px solid #2a2a3e" }}
                      >
                        {demoLoading ? (
                          <>
                            <svg className="animate-spin" style={{ width: "12px", height: "12px" }} fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generando...
                          </>
                        ) : (
                          <><PlayIcon /> Generar y reproducir</>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
                )}
              </div>

              {/* Bottom footer bar */}
              <div className="flex items-center justify-between" style={{ paddingTop: "18px" }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                    Powered by Elite Labs E2 Pro
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className="hidden sm:inline"
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", fontWeight: 600 }}
                  >
                    EMPIEZA GRATIS HOY
                  </span>
                  {isLoaded && isSignedIn ? (
                    <Link
                      href="/dashboard"
                      className="font-semibold text-white transition-all hover:opacity-80 flex-shrink-0"
                      style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px", background: "#2563eb" }}
                    >
                      Ir al Dashboard →
                    </Link>
                  ) : (
                    <SignUpButton mode="modal">
                      <button
                        className="font-semibold text-white transition-all hover:opacity-80 flex-shrink-0"
                        style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px", background: "#2563eb" }}
                      >
                        Empezar gratis →
                      </button>
                    </SignUpButton>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Use Cases ──────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Para cada caso de uso</h2>
              <p className="text-gray-400">Genera audio profesional para cualquier proyecto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {USE_CASES.map((uc) => (
                <div
                  key={uc.title}
                  className="relative rounded-2xl overflow-hidden p-6 border"
                  style={{ background: uc.bg, borderColor: "rgba(255,255,255,0.05)", minHeight: "220px" }}
                >
                  {/* Decorative waveform */}
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
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

              {/* Left */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-snug">
                  Crea voces de IA de calidad profesional para vídeos, audiolibros y personajes
                </h2>
                <ul className="space-y-4 mb-8">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(59,130,246,0.2)" }}
                      >
                        <Check size={11} style={{ color: "#93c5fd" }} />
                      </div>
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {isLoaded && isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-block px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
                  >
                    Ir al Dashboard →
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <button
                      className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                      style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
                    >
                      Empezar gratis →
                    </button>
                  </SignUpButton>
                )}
              </div>

              {/* Right: interactive studio card */}
              {(() => {
                const fv = demoVoices[0];
                return (
                  <div className="rounded-2xl border p-5" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
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
                      style={{ background: "#0a0a0f", border: "1px solid #2a2a3e" }}
                    >
                      &ldquo;Bienvenidos a este episodio del podcast. Hoy vamos a hablar sobre el futuro de la inteligencia artificial y cómo está cambiando el mundo.&rdquo;
                    </div>

                    {/* Waveform area */}
                    <div
                      className="rounded-lg px-3 pt-3 pb-2 mb-3 flex items-center justify-center"
                      style={{ background: "#0a0a0f", border: "1px solid #2a2a3e", minHeight: "56px" }}
                    >
                      {featuresPlaying ? (
                        /* Animated waveform bars */
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
                                  background: "#3b82f6",
                                  transformOrigin: "center",
                                  animation: `waveBar ${0.7 + (i % 4) * 0.15}s ease-in-out infinite`,
                                  animationDelay: `${(i * 0.06) % 0.5}s`,
                                }}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        /* Static waveform SVG */
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
                                fill={featuresAudioUrl && i < 22 ? "#3b82f6" : "#2a2a3e"}
                              />
                            );
                          })}
                        </svg>
                      )}
                    </div>

                    {/* Voice row */}
                    <div className="flex items-center gap-3">
                      {fv?.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fv.cover_image}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                        >
                          {fv?.title[0]?.toUpperCase() ?? "V"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{fv?.title ?? "Cargando..."}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>Español</p>
                      </div>
                      <button
                        onClick={handleFeaturesPlay}
                        disabled={featuresLoading || !fv}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}
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
                        {featuresLoading ? "Generando..." : featuresPlaying ? "Pausar" : featuresAudioUrl ? "Reproducir" : "Escuchar"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <section className="py-24 px-4 relative overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden
          >
            <div
              className="w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: "radial-gradient(circle,#3b82f6,transparent 70%)" }}
            />
          </div>

          <div className="max-w-5xl mx-auto px-4 text-center relative">
            {/* Floating avatars */}
            <div className="relative flex justify-center gap-3 mb-10">
              {STAT_AVATARS.map((av, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 flex-shrink-0"
                  style={{
                    background: av.color,
                    borderColor: "#0a0a0f",
                    marginTop: i % 2 === 0 ? "0px" : "12px",
                    boxShadow: `0 0 20px ${av.color}55`,
                  }}
                >
                  {av.initials}
                </div>
              ))}
            </div>

            <h2 className="text-6xl md:text-8xl font-bold mb-4">
              2.000.000<span style={{ color: "#3b82f6" }}>+</span>
            </h2>
            <p className="text-2xl font-semibold text-gray-200 mb-4">Voces disponibles</p>
            <p className="text-gray-500 max-w-md mx-auto">
              Accede a una biblioteca masiva de voces públicas o crea las tuyas propias con clonación instantánea.
            </p>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Preguntas frecuentes</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem
                  key={i}
                  item={item}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto px-4">
            <div
              className="rounded-2xl p-12 border relative overflow-hidden text-center"
              style={{
                background: "linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.06))",
                borderColor: "rgba(59,130,246,0.25)",
              }}
            >
              <div
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(59,130,246,0.2),transparent 70%)" }}
                aria-hidden
              />

              <h2 className="text-3xl md:text-4xl font-bold mb-4 relative">
                ¡Empieza a convertir texto en audio hoy mismo!
              </h2>
              <p className="text-gray-400 mb-8 relative">Sin tarjeta de crédito. Explora las voces gratis.</p>

              {isLoaded && isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-block px-8 py-4 rounded-xl font-semibold text-white text-base transition-all hover:-translate-y-1 relative"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 8px 30px rgba(59,130,246,0.4)" }}
                >
                  Ir al Dashboard →
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button
                    className="px-8 py-4 rounded-xl font-semibold text-white text-base transition-all hover:-translate-y-1 relative"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 8px 30px rgba(59,130,246,0.4)" }}
                  >
                    Empezar gratis →
                  </button>
                </SignUpButton>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: "#2a2a3e", background: "#0a0a0f" }}>
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
              <p className="text-sm leading-relaxed" style={{ color: "#555570" }}>
                Síntesis de voz con IA de calidad profesional.
              </p>
            </div>

            {/* Producto */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>Producto</p>
              <ul className="space-y-3">
                {[
                  { label: "Texto a voz", href: "/dashboard" },
                  { label: "Clonación de voz", href: "/dashboard" },
                  { label: "Traducción de audio", href: "/dashboard" },
                  { label: "Audio a Texto", href: "/dashboard" },
                  { label: "Precios", href: "/pricing" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-gray-200" style={{ color: "#8888a8" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>Empresa</p>
              <ul className="space-y-3">
                {[
                  { label: "Sobre nosotros", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Soporte", href: "/support" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-gray-200" style={{ color: "#8888a8" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>Legal</p>
              <ul className="space-y-3">
                {[
                  { label: "Política de privacidad", href: "/privacy" },
                  { label: "Términos de uso", href: "/terms" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-gray-200" style={{ color: "#8888a8" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t mb-6" style={{ borderColor: "#1e1e2e" }} />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs order-last sm:order-first" style={{ color: "#555570" }}>
              © 2026 Elite Tube LLC. All rights reserved.
            </p>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              {[
                { label: "Política de privacidad", href: "/privacy" },
                { label: "Términos de uso", href: "/terms" },
                { label: "Contacto", href: "/support" },
              ].map(({ label, href }, i, arr) => (
                <span key={label} className="flex items-center gap-4">
                  <a href={href} className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
                    {label}
                  </a>
                  {i < arr.length - 1 && <span style={{ color: "#2a2a3e" }}>|</span>}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* X / Twitter */}
              <a
                href="#"
                aria-label="X (Twitter)"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "#555570" }}
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
                style={{ color: "#555570" }}
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
