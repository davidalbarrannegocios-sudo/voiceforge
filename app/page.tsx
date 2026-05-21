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
    setDemoLoading(true);
    setDemoAudioUrl(null);
    try {
      const res = await fetch("/api/demo-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: selectedVoice, section: "hero" }),
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
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={32} height={32} style={{ height: "32px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }} className="rounded-lg" />
            <span className="font-bold text-white text-lg">Elite Labs</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Precios
            </Link>
            {!isLoaded ? (
              <>
                <Link href="/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10">
                  Iniciar sesión
                </Link>
                <Link href="/sign-up" className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
                  Empezar gratis
                </Link>
              </>
            ) : !isSignedIn ? (
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
            ) : (
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
            )}
          </nav>
        </div>
      </header>

      <main>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Text */}
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

            {/* Demo widget */}
            <div
              className="rounded-2xl border overflow-hidden shadow-2xl"
              style={{ background: "#12121a", borderColor: "#2a2a3e", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
            >
              <div className="flex flex-col md:flex-row" style={{ minHeight: "300px" }}>

                {/* Left: voice list */}
                <div
                  className="md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r p-4"
                  style={{ borderColor: "#2a2a3e", background: "#0d0d17" }}
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Voces</p>
                  <div className="space-y-0.5">
                    {demoVoices.length === 0
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-lg animate-pulse mx-1" style={{ background: "#1a1a2e" }} />
                        ))
                      : demoVoices.map((voice) => {
                          const active = selectedVoice === voice._id;
                          return (
                            <button
                              key={voice._id}
                              onClick={() => { setSelectedVoice(voice._id); setDemoAudioUrl(null); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
                              style={active
                                ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd" }
                                : { color: "#9ca3af" }
                              }
                            >
                              {voice.cover_image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={voice.cover_image}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                                >
                                  {voice.title[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="truncate font-medium">{voice.title}</span>
                              {active && (
                                <span
                                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: "#3b82f6" }}
                                />
                              )}
                            </button>
                          );
                        })}
                  </div>
                </div>

                {/* Right: text + button */}
                <div className="flex-1 p-6 flex flex-col">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Texto</p>
                  <div
                    className="flex-1 rounded-xl p-4 text-sm text-gray-300 leading-relaxed mb-5"
                    style={{ background: "#0a0a0f", border: "1px solid #2a2a3e" }}
                  >
                    Hola, soy una voz generada con inteligencia artificial por Elite Labs. La calidad es excepcional y el resultado suena completamente natural.
                  </div>

                  {demoAudioUrl && (
                    <div className="mb-3">
                      <AudioPlayer src={demoAudioUrl} filename="elitelabs-demo.mp3" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateDemo}
                      disabled={demoLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                      style={{ background: "#0d0d17", border: "1px solid #3b82f6", color: "#93c5fd" }}
                    >
                      {demoLoading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generando...
                        </>
                      ) : (
                        <><PlayIcon /> Generar muestra</>
                      )}
                    </button>

                    {isLoaded && isSignedIn ? (
                      <Link
                        href="/dashboard"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                        style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
                      >
                        Ir al Dashboard →
                      </Link>
                    ) : isLoaded ? (
                      <SignUpButton mode="modal">
                        <button
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                          style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
                        >
                          Ir al Dashboard →
                        </button>
                      </SignUpButton>
                    ) : (
                      <Link
                        href="/sign-up"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                        style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
                      >
                        Ir al Dashboard →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Use Cases ──────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
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
          <div className="max-w-5xl mx-auto">
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
                ) : isLoaded ? (
                  <SignUpButton mode="modal">
                    <button
                      className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                      style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
                    >
                      Empezar gratis →
                    </button>
                  </SignUpButton>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-block px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
                  >
                    Empezar gratis →
                  </Link>
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

          <div className="max-w-3xl mx-auto text-center relative">
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
          <div className="max-w-2xl mx-auto">
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
          <div className="max-w-3xl mx-auto">
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
              ) : isLoaded ? (
                <SignUpButton mode="modal">
                  <button
                    className="px-8 py-4 rounded-xl font-semibold text-white text-base transition-all hover:-translate-y-1 relative"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 8px 30px rgba(59,130,246,0.4)" }}
                  >
                    Empezar gratis →
                  </button>
                </SignUpButton>
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-block px-8 py-4 rounded-xl font-semibold text-white text-base transition-all hover:-translate-y-1 relative"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 8px 30px rgba(59,130,246,0.4)" }}
                >
                  Empezar gratis →
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-4" style={{ borderColor: "#2a2a3e" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2025 Elite Labs. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Precios
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
