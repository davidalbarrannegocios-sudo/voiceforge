"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search, ChevronDown } from "lucide-react";
import { generateVoiceGradient } from "@/lib/voice-gradient";
import { DashboardSidebar } from "@/app/dashboard/DashboardSidebar";

/* ── Types ────────────────────────────────────────────────────── */
interface FishVoice {
  _id: string;
  title: string;
  description?: string;
  languages?: string[];
  tags: string[];
  cover_image?: string | null;
  task_count: number;
  like_count?: number;
  samples?: Array<{ audio: string }>;
  author?: { nickname?: string };
}

/* ── Helpers ─────────────────────────────────────────────────── */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function getGender(tags: string[]): "male" | "female" | null {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((s) => ["male", "man", "masculine", "masculino"].includes(s))) return "male";
  if (t.some((s) => ["female", "woman", "feminine", "femenino"].includes(s))) return "female";
  return null;
}

function getAge(tags: string[]): string | null {
  const t = tags.map((s) => s.toLowerCase());
  if (t.includes("young")) return "Joven";
  if (t.some((s) => s.includes("middle"))) return "Mediana edad";
  if (t.includes("old") || t.includes("elderly")) return "Mayor";
  return null;
}

const LANG_FLAG: Record<string, string> = {
  es: "es", en: "gb", ja: "jp", fr: "fr", de: "de",
  pt: "br", zh: "cn", ko: "kr", ar: "sa", it: "it",
  ru: "ru", pl: "pl", nl: "nl", tr: "tr", vi: "vn",
};

function langFlag(code: string): string {
  return LANG_FLAG[code.toLowerCase()] ?? code.toLowerCase();
}

/* ── VoiceAvatar (matches VoiceBrowser) ───────────────────────── */
function VoiceAvatar({ id, name, coverImage }: { id: string; name: string; coverImage?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!coverImage && !imgFailed;
  const proxied = coverImage ? `/api/voice-image?url=${encodeURIComponent(coverImage)}` : "";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxied}
        alt=""
        className="flex-shrink-0"
        style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div
      className="flex-shrink-0"
      style={{ width: 64, height: 64, borderRadius: 8, background: generateVoiceGradient(id) }}
    />
  );
}

/* ── Constants ───────────────────────────────────────────────── */
const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "ja", label: "Japonés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "pt", label: "Portugués" },
  { value: "all", label: "Todos" },
];

const TAGS: { label: string; value: string }[] = [
  { label: "Masculino",    value: "male"        },
  { label: "Femenino",     value: "female"      },
  { label: "Neutral",      value: "neutral"     },
  { label: "Joven",        value: "young"       },
  { label: "Mediana Edad", value: "middle-aged" },
  { label: "Narración",    value: "narration"   },
  { label: "Documental",   value: "documentary" },
  { label: "Dramático",    value: "dramatic"    },
  { label: "Profesional",  value: "professional"},
  { label: "Suave",        value: "soft"        },
  { label: "Enérgico",     value: "energetic"   },
  { label: "Misterioso",   value: "mystery"     },
];

const FLOATING_WORDS = [
  { text: "Hola",      size: 28, x: 62, y: 15, opacity: 0.18, delay: 0   },
  { text: "Hello",     size: 22, x: 72, y: 40, opacity: 0.12, delay: 1.2 },
  { text: "こんにちは", size: 18, x: 58, y: 65, opacity: 0.1,  delay: 2.4 },
  { text: "Bonjour",   size: 24, x: 80, y: 28, opacity: 0.14, delay: 0.8 },
  { text: "Hallo",     size: 20, x: 68, y: 55, opacity: 0.11, delay: 1.8 },
  { text: "مرحبا",     size: 26, x: 75, y: 72, opacity: 0.09, delay: 3.0 },
];

const PILL_STYLE = {
  background: "rgba(255,255,255,0.05)",
  color: "#6b7280",
  border: "1px solid rgba(255,255,255,0.07)",
};

/* ── Main component ──────────────────────────────────────────── */
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

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

      const params = new URLSearchParams({ page_size: "48", page: String(p), language });
      if (search) params.set("search", search);
      selectedTags.forEach((t) => params.append("tag", t));

      try {
        const res = await fetch(`/api/public-voices?${params}`);
        const data = await res.json();
        const items: FishVoice[] = data.items ?? [];
        if (append) setVoices((prev) => [...prev, ...items]);
        else setVoices(items);
        setHasMore(items.length === 48);
      } catch { /* silent */ }
      finally { setLoading(false); setLoadingMore(false); }
    },
    [language, search, selectedTags]
  );

  useEffect(() => { setPage(1); fetchVoices(1, false); }, [fetchVoices]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 400);
  }

  function toggleTag(value: string) {
    setSelectedTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchVoices(next, true);
  }

  /* Audio preview — use samples from voice data, fallback to preview API */
  async function playPreview(voice: FishVoice) {
    const id = voice._id;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === id) { setPlayingId(null); return; }

    // Try sample URL directly from API response first
    const directUrl = voice.samples?.[0]?.audio;

    if (directUrl) {
      const audio = new Audio(directUrl);
      audioRef.current = audio;
      setPlayingId(id);
      audio.play().catch(() => setPlayingId(null));
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      return;
    }

    // Fallback: fetch via server proxy
    setPreviewLoading(id);
    try {
      const res = await fetch(`/api/public-voices/preview?id=${id}`);
      const { url } = await res.json();
      if (!url) return;
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(id);
      audio.play().catch(() => setPlayingId(null));
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
    } catch { /* silent */ }
    finally { setPreviewLoading(null); }
  }

  function handleUseVoice(voiceId: string) {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/dashboard?voice=${voiceId}`);
      return;
    }
    router.push(`/dashboard?voice=${voiceId}`);
  }

  const showSidebar = isLoaded && isSignedIn;
  const stickyTop = showSidebar ? "top-0" : "top-16";
  const heroPadding = showSidebar ? "pt-10" : "pt-36";
  const activeLangLabel = LANGUAGES.find((l) => l.value === language)?.label ?? "Español";

  return (
    <>
      <style>{`
        @keyframes floatWord { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
      `}</style>

      <div className="flex" style={{ minHeight: "100vh", background: "#000000", color: "#ffffff" }}>

        {/* ── Dashboard sidebar ────────────────────────────────── */}
        {showSidebar && (
          <Suspense fallback={null}>
            <DashboardSidebar />
          </Suspense>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── Public navbar ─────────────────────────────────── */}
          {!showSidebar && (
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
                  <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">Precios</Link>
                  <Link href="/voices" className="text-sm font-semibold text-white px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>Voces</Link>
                </nav>
                <div className="flex items-center gap-3">
                  <Link href="/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hidden sm:block">Iniciar sesión</Link>
                  <Link href="/sign-up" className="text-sm font-semibold text-black px-4 py-2 rounded-lg" style={{ background: "#ffffff" }}>Empezar gratis</Link>
                </div>
              </div>
            </header>
          )}

          {/* ── Hero ─────────────────────────────────────────── */}
          <section className={`relative overflow-hidden ${heroPadding} pb-14 px-4`} style={{ borderBottom: "1px solid #1a1a1a" }}>
            {!showSidebar && (
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                {FLOATING_WORDS.map((w, i) => (
                  <span key={i} style={{ position: "absolute", left: `${w.x}%`, top: `${w.y}%`, fontSize: w.size, opacity: w.opacity, fontWeight: 700, color: "#ffffff", animation: `floatWord ${5 + i * 0.4}s ease-in-out ${w.delay}s infinite`, userSelect: "none" }}>
                    {w.text}
                  </span>
                ))}
              </div>
            )}
            <div className="relative max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-3">
                Descubre las voces de IA más realistas
              </h1>
              <p className="text-white/50 text-base md:text-lg mb-10">
                Más de 200 voces listas para tu próximo proyecto
              </p>

              {/* Search + language */}
              <div className="flex gap-3 max-w-2xl mx-auto">
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
                    <div className="absolute top-full mt-1 right-0 rounded-xl overflow-hidden z-20" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.12)", minWidth: "160px", boxShadow: "0 16px 40px rgba(0,0,0,0.8)" }}>
                      {LANGUAGES.map((l) => (
                        <button key={l.value} onClick={() => { setLanguage(l.value); setLangOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm transition-colors" style={{ color: language === l.value ? "#ffffff" : "rgba(255,255,255,0.5)", background: language === l.value ? "rgba(255,255,255,0.08)" : "transparent" }}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Tag pills ──────────────────────────────────────── */}
          <div className={`sticky ${stickyTop} z-40 border-b overflow-x-auto`} style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)", borderColor: "#1a1a1a" }}>
            <div className="flex items-center gap-2 px-4 md:px-8 py-3" style={{ width: "max-content", minWidth: "100%" }}>
              <button
                onClick={() => setSelectedTags([])}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: selectedTags.length === 0 ? "#ffffff" : "rgba(255,255,255,0.07)",
                  color: selectedTags.length === 0 ? "#000000" : "rgba(255,255,255,0.6)",
                  border: selectedTags.length === 0 ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Todos
              </button>
              {TAGS.map((tag) => {
                const active = selectedTags.includes(tag.value);
                return (
                  <button
                    key={tag.value}
                    onClick={() => toggleTag(tag.value)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: active ? "#ffffff" : "rgba(255,255,255,0.07)",
                      color: active ? "#000000" : "rgba(255,255,255,0.6)",
                      border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main content ───────────────────────────────────── */}
          <main className="px-4 md:px-8 py-10 max-w-screen-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Tendencias principales</h2>
              {voices.length > 0 && <span className="text-xs text-white/20">{voices.length} voces</span>}
            </div>

            {/* Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-4 min-h-[160px] animate-pulse" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex gap-3 mb-3">
                      <div className="flex-shrink-0 rounded-lg" style={{ width: 64, height: 64, background: "rgba(255,255,255,0.06)" }} />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.07)", width: "70%" }} />
                        <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "50%" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && voices.length === 0 && (
              <div className="text-center py-20">
                <p className="text-white/30 text-sm">No se encontraron voces para esta búsqueda.</p>
              </div>
            )}

            {!loading && voices.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {voices.map((voice) => (
                  <VoiceCard
                    key={voice._id}
                    voice={voice}
                    isPlaying={playingId === voice._id}
                    isPreviewLoading={previewLoading === voice._id}
                    onPreview={() => playPreview(voice)}
                    onUse={() => handleUseVoice(voice._id)}
                  />
                ))}
              </div>
            )}

            {!loading && hasMore && voices.length > 0 && (
              <div className="flex justify-center mt-10">
                <button onClick={handleLoadMore} disabled={loadingMore} className="px-8 py-3 rounded-xl text-sm font-semibold transition-all" style={{ background: loadingMore ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)", color: loadingMore ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {loadingMore ? "Cargando..." : "Cargar más voces"}
                </button>
              </div>
            )}
          </main>

          {/* ── Footer ─────────────────────────────────────────── */}
          <footer className="border-t mt-16" style={{ borderColor: "#1a1a1a" }}>
            <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/elitelabs.png" alt="Elite Labs" width={24} height={24} className="rounded-lg" />
                <span className="font-bold text-white text-sm">Elite Labs</span>
              </Link>
              <div className="flex items-center gap-6 text-xs" style={{ color: "#666666" }}>
                {["Precios/pricing","Voces/voices","Privacidad/privacy","Términos/terms","Soporte/support"].map((s) => {
                  const [label, href] = s.split("/");
                  return <Link key={href} href={`/${href}`} className="hover:text-white transition-colors">{label}</Link>;
                })}
              </div>
              <p className="text-xs" style={{ color: "#444444" }}>© 2025 Elite Labs</p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

/* ── Voice Card ──────────────────────────────────────────────── */
function VoiceCard({
  voice,
  isPlaying,
  isPreviewLoading,
  onPreview,
  onUse,
}: {
  voice: FishVoice;
  isPlaying: boolean;
  isPreviewLoading: boolean;
  onPreview: () => void;
  onUse: () => void;
}) {
  const g = getGender(voice.tags);
  const age = getAge(voice.tags);
  const langs = voice.languages ?? [];

  return (
    <div
      className="relative group rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border min-h-[160px]"
      style={{ background: "transparent", borderColor: "rgba(255,255,255,0.05)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
      }}
    >
      <div className="p-4">
        {/* Top: avatar + name/author/description */}
        <div className="flex gap-3 mb-3">
          <VoiceAvatar id={voice._id} name={voice.title} coverImage={voice.cover_image} />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 mb-0.5 pr-2">
              <span className="text-sm font-semibold text-white truncate leading-tight">{voice.title}</span>
            </div>
            {voice.author?.nickname && (
              <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>· {voice.author.nickname}</p>
            )}
            {voice.description && (
              <p className="text-xs line-clamp-2" style={{ color: "#666666" }}>{voice.description}</p>
            )}
          </div>
        </div>

        {/* Pills */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {langs.slice(0, 2).map((l) => (
            <span key={l} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={PILL_STYLE}>
              <span className={`fi fi-${langFlag(l)}`} style={{ width: 14, height: 11, display: "inline-block", borderRadius: 2 }} />
              <span>{l.toUpperCase()}</span>
            </span>
          ))}
          {g && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={PILL_STYLE}>
              {g === "male" ? "Masculino" : "Femenino"}
            </span>
          )}
          {age && <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={PILL_STYLE}>{age}</span>}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" style={{ color: "#444460" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span className="text-xs">{formatCount(voice.task_count)}</span>
          </div>
          {typeof voice.like_count === "number" && voice.like_count > 0 && (
            <div className="flex items-center gap-1" style={{ color: "#444460" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-xs">{formatCount(voice.like_count)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-2 justify-end items-center"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          disabled={isPreviewLoading}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
          style={{
            background: isPlaying ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)",
            color: isPlaying ? "#aaaaaa" : "#e2e2f0",
            border: `1px solid ${isPlaying ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.15)"}`,
            backdropFilter: "blur(4px)",
          }}
        >
          {isPreviewLoading ? "···" : isPlaying ? "⏹ Stop" : "▶ Vista previa"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUse(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: "#ffffff", color: "#000000" }}
        >
          Usar →
        </button>
      </div>
    </div>
  );
}
