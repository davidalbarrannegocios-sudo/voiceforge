"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search, Play, Square, ChevronDown } from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */
interface FishVoice {
  _id: string;
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
  task_count?: number;
  like_count?: number;
  created_by?: string;
  author?: { nickname?: string; handle?: string } | string;
}

/* ── Constants ───────────────────────────────────────────────── */
const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "ja", label: "Japonés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "pt", label: "Portugués" },
  { value: "all", label: "Todos los idiomas" },
];

const TAGS: { label: string; value: string }[] = [
  { label: "Masculino", value: "male" },
  { label: "Femenino", value: "female" },
  { label: "Neutral", value: "neutral" },
  { label: "Joven", value: "young" },
  { label: "Mediana Edad", value: "middle-aged" },
  { label: "Narración", value: "narration" },
  { label: "Documental", value: "documentary" },
  { label: "Dramático", value: "dramatic" },
  { label: "Profesional", value: "professional" },
  { label: "Suave", value: "soft" },
  { label: "Enérgico", value: "energetic" },
  { label: "Misterioso", value: "mysterious" },
];

const FLOATING_WORDS = [
  { text: "Hola", size: 28, x: 62, y: 15, opacity: 0.18, delay: 0 },
  { text: "Hello", size: 22, x: 72, y: 40, opacity: 0.12, delay: 1.2 },
  { text: "こんにちは", size: 18, x: 58, y: 65, opacity: 0.1, delay: 2.4 },
  { text: "Bonjour", size: 24, x: 80, y: 28, opacity: 0.14, delay: 0.8 },
  { text: "Hallo", size: 20, x: 68, y: 55, opacity: 0.11, delay: 1.8 },
  { text: "مرحبا", size: 26, x: 75, y: 72, opacity: 0.09, delay: 3.0 },
  { text: "Ciao", size: 19, x: 55, y: 82, opacity: 0.1, delay: 1.5 },
  { text: "Olá", size: 23, x: 88, y: 52, opacity: 0.12, delay: 2.1 },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function getAuthorName(voice: FishVoice): string {
  if (!voice.author) return "Anónimo";
  if (typeof voice.author === "string") return voice.author;
  return voice.author.nickname ?? voice.author.handle ?? "Anónimo";
}

/* ── Component ───────────────────────────────────────────────── */
export default function VoicesClient() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [voices, setVoices] = useState<FishVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("es");
  const [activeTag, setActiveTag] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

  /* Close lang dropdown on outside click */
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  /* Fetch voices */
  const fetchVoices = useCallback(
    async (p: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page_size: "48",
        page: String(p),
        language,
      });
      if (search) params.set("search", search);
      if (activeTag) params.set("tag", activeTag);

      try {
        const res = await fetch(`/api/public-voices?${params}`);
        const data = await res.json();
        const items: FishVoice[] = data.items ?? [];
        if (append) setVoices((prev) => [...prev, ...items]);
        else setVoices(items);
        setHasMore(items.length === 48);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [language, search, activeTag]
  );

  /* Reset & reload when filters change */
  useEffect(() => {
    setPage(1);
    fetchVoices(1, false);
  }, [fetchVoices]);

  /* Debounce search input */
  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
    }, 400);
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchVoices(next, true);
  }

  /* Audio preview */
  function playPreview(voiceId: string) {
    if (playingId === voiceId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`https://cdn.fish.audio/preview/${voiceId}.mp3`);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(voiceId);
  }

  /* Use voice */
  function handleUseVoice(voiceId: string) {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/dashboard?voice=${voiceId}`);
      return;
    }
    router.push(`/dashboard?voice=${voiceId}`);
  }

  const activeLangLabel = LANGUAGES.find((l) => l.value === language)?.label ?? "Español";

  return (
    <>
      {/* Floating-words animation keyframes */}
      <style>{`
        @keyframes floatWord {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000", color: "#ffffff" }}>

        {/* ── Navbar ──────────────────────────────────────────── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 border-b"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", borderColor: "#1a1a1a" }}
        >
          <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Image src="/elitelabs.png" alt="Elite Labs" width={30} height={30} className="rounded-lg" />
              <span className="font-bold text-white text-base">Elite Labs</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">
                Precios
              </Link>
              <Link
                href="/voices"
                className="text-sm font-semibold text-white px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                Voces
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {isLoaded && isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="text-sm font-semibold text-black px-4 py-2 rounded-lg"
                  style={{ background: "#ffffff" }}
                >
                  Ir al dashboard
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hidden sm:block">
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-sm font-semibold text-black px-4 py-2 rounded-lg"
                    style={{ background: "#ffffff" }}
                  >
                    Empezar gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden pt-36 pb-20 px-4"
          style={{ borderBottom: "1px solid #1a1a1a" }}
        >
          {/* Floating words decoration */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {FLOATING_WORDS.map((w, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  fontSize: `${w.size}px`,
                  opacity: w.opacity,
                  fontWeight: 700,
                  color: "#ffffff",
                  animation: `floatWord ${5 + i * 0.4}s ease-in-out ${w.delay}s infinite`,
                  userSelect: "none",
                }}
              >
                {w.text}
              </span>
            ))}
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
              Descubre las voces de IA<br className="hidden md:block" /> más realistas
            </h1>
            <p className="text-white/50 text-lg md:text-xl mb-12">
              Más de 200 voces listas para tu próximo proyecto
            </p>

            {/* Search bar + language filter */}
            <div className="flex gap-3 max-w-2xl mx-auto">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Buscar voces..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Language dropdown */}
              <div ref={langRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-white/80 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {activeLangLabel}
                  <ChevronDown size={14} style={{ transform: langOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                {langOpen && (
                  <div
                    className="absolute top-full mt-1 right-0 rounded-xl overflow-hidden z-20"
                    style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.12)", minWidth: "160px", boxShadow: "0 16px 40px rgba(0,0,0,0.8)" }}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => { setLanguage(l.value); setLangOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                        style={{ color: language === l.value ? "#ffffff" : "rgba(255,255,255,0.5)", background: language === l.value ? "rgba(255,255,255,0.08)" : "transparent" }}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Tag pills ────────────────────────────────────────── */}
        <div
          className="sticky top-16 z-40 border-b overflow-x-auto"
          style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)", borderColor: "#1a1a1a" }}
        >
          <div className="flex items-center gap-2 px-4 md:px-8 py-3 max-w-screen-xl mx-auto" style={{ width: "max-content", minWidth: "100%" }}>
            <button
              onClick={() => setActiveTag("")}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: activeTag === "" ? "#ffffff" : "rgba(255,255,255,0.07)",
                color: activeTag === "" ? "#000000" : "rgba(255,255,255,0.6)",
                border: activeTag === "" ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Todos
            </button>
            {TAGS.map((tag) => (
              <button
                key={tag.value}
                onClick={() => setActiveTag(activeTag === tag.value ? "" : tag.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: activeTag === tag.value ? "#ffffff" : "rgba(255,255,255,0.07)",
                  color: activeTag === tag.value ? "#000000" : "rgba(255,255,255,0.6)",
                  border: activeTag === tag.value ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Tendencias principales
            </h2>
            {voices.length > 0 && (
              <span className="text-xs text-white/30">{voices.length} voces</span>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}
                >
                  <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded" style={{ background: "rgba(255,255,255,0.08)", width: "60%" }} />
                    <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "85%" }} />
                    <div className="flex gap-1.5 mt-2">
                      <div className="h-4 w-14 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <div className="h-4 w-16 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && voices.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/40 text-sm">No se encontraron voces para esta búsqueda.</p>
            </div>
          )}

          {/* Voice grid */}
          {!loading && voices.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {voices.map((voice) => (
                <VoiceCard
                  key={voice._id}
                  voice={voice}
                  isPlaying={playingId === voice._id}
                  onPlay={() => playPreview(voice._id)}
                  onUse={() => handleUseVoice(voice._id)}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && voices.length > 0 && (
            <div className="flex justify-center mt-10">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: loadingMore ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
                  color: loadingMore ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {loadingMore ? "Cargando..." : "Cargar más voces"}
              </button>
            </div>
          )}
        </main>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="border-t mt-20" style={{ borderColor: "#1a1a1a", background: "#000000" }}>
          <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/elitelabs.png" alt="Elite Labs" width={24} height={24} className="rounded-lg" />
              <span className="font-bold text-white text-sm">Elite Labs</span>
            </Link>
            <div className="flex items-center gap-6 text-xs" style={{ color: "#666666" }}>
              <Link href="/pricing" className="hover:text-white transition-colors">Precios</Link>
              <Link href="/voices" className="hover:text-white transition-colors">Voces</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Términos</Link>
              <Link href="/support" className="hover:text-white transition-colors">Soporte</Link>
            </div>
            <p className="text-xs" style={{ color: "#444444" }}>© 2025 Elite Labs</p>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ── Voice Card ──────────────────────────────────────────────── */
function VoiceCard({
  voice,
  isPlaying,
  onPlay,
  onUse,
}: {
  voice: FishVoice;
  isPlaying: boolean;
  onPlay: () => void;
  onUse: () => void;
}) {
  const name = voice.title ?? "Sin nombre";
  const author = getAuthorName(voice);
  const description = voice.description ?? "";
  const tags = voice.tags ?? [];
  const plays = voice.task_count;
  const likes = voice.like_count;

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl transition-all cursor-default group"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.16)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
        {voice.cover_image ? (
          <img src={voice.cover_image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-white font-medium text-sm truncate">{name}</span>
          {author !== "Anónimo" && (
            <span className="text-white/30 text-xs flex-shrink-0 truncate max-w-[80px]">· {author}</span>
          )}
        </div>
        {description && (
          <p className="text-white/40 text-xs truncate mb-2 leading-relaxed">{description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs rounded px-1.5 py-0.5"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {(plays !== undefined || likes !== undefined) && (
          <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            {plays !== undefined && <span>▶ {plays.toLocaleString("es-ES")}</span>}
            {likes !== undefined && <span>♡ {likes.toLocaleString("es-ES")}</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={onPlay}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: isPlaying ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
          }}
          title={isPlaying ? "Detener" : "Reproducir muestra"}
        >
          {isPlaying ? (
            <Square size={10} className="text-white" fill="white" />
          ) : (
            <Play size={10} className="text-white" fill="white" />
          )}
        </button>
        <button
          onClick={onUse}
          className="text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          style={{ background: "#ffffff", color: "#000000" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.85)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#ffffff")}
        >
          Usar voz
        </button>
      </div>
    </div>
  );
}
