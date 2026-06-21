"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search, ChevronDown, SlidersHorizontal, X, Check } from "lucide-react";
import { generateVoiceGradient } from "@/lib/voice-gradient";
import { DashboardSidebar } from "@/app/dashboard/DashboardSidebar";
import { useLang } from "@/app/dashboard/LanguageContext";

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

/* ── VoiceAvatar ─────────────────────────────────────────────── */
function VoiceAvatar({ id, name, coverImage }: { id: string; name: string; coverImage?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (coverImage && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverImage}
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
  { value: "",   label: "Todos los idiomas", flag: "🌍" },
  { value: "es", label: "Español",           flag: "🇪🇸" },
  { value: "en", label: "Inglés",            flag: "🇺🇸" },
  { value: "ja", label: "Japonés",           flag: "🇯🇵" },
  { value: "fr", label: "Francés",           flag: "🇫🇷" },
  { value: "de", label: "Alemán",            flag: "🇩🇪" },
  { value: "pt", label: "Portugués",         flag: "🇧🇷" },
  { value: "zh", label: "Chino",             flag: "🇨🇳" },
  { value: "ko", label: "Coreano",           flag: "🇰🇷" },
  { value: "ar", label: "Árabe",             flag: "🇸🇦" },
  { value: "it", label: "Italiano",          flag: "🇮🇹" },
];

const FILTER_GROUPS = [
  {
    label: "GÉNERO",
    tags: ["Masculino", "Femenino", "Neutral"],
  },
  {
    label: "EDAD",
    tags: ["Joven", "Mediana Edad", "Mayor"],
  },
  {
    label: "CASO DE USO",
    tags: ["Narración", "Conversacional", "Voz del Personaje", "Redes Sociales", "Educativo", "Publicidad", "Entretenimiento", "Documental"],
  },
  {
    label: "CALIDAD DE VOZ",
    tags: ["Profundo", "Suave", "Dramático", "Profesional", "Enérgico", "Misterioso", "Cálido"],
  },
];

const TAG_SEARCH: Record<string, string> = {
  "Masculino":          "male",
  "Femenino":           "female",
  "Neutral":            "neutral",
  "Joven":              "young",
  "Mediana Edad":       "middle",
  "Mayor":              "old",
  "Narración":          "narrat",
  "Conversacional":     "convers",
  "Voz del Personaje":  "character",
  "Redes Sociales":     "social",
  "Educativo":          "educat",
  "Publicidad":         "advertis",
  "Entretenimiento":    "entertain",
  "Documental":         "document",
  "Profundo":           "deep",
  "Suave":              "soft",
  "Dramático":          "dramat",
  "Profesional":        "profes",
  "Enérgico":           "energet",
  "Misterioso":         "mysteri",
  "Cálido":             "warm",
};

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

const PAGE_SIZE = 48;

/* ── Main component ──────────────────────────────────────────── */
export default function VoicesClient() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { t } = useLang();

  const [allVoices, setAllVoices] = useState<FishVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<FishVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  const pageRef = useRef(page);

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (langButtonRef.current && !langButtonRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openLang() {
    if (langButtonRef.current) {
      const rect = langButtonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
    setLangOpen((v) => !v);
  }

  /* Fetch a single page and append (or reset) allVoices */
  const loadVoices = useCallback(async (pageNum: number, reset: boolean) => {
    if (reset) {
      setLoading(true);
    } else {
      if (loadingMoreRef.current || !hasMoreRef.current) return;
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({ page_size: String(PAGE_SIZE), page: String(pageNum), language });
      const res = await fetch(`/api/public-voices?${params}`);
      const data = await res.json();
      const items: FishVoice[] = data.items ?? [];
      const totalCount: number = data.total ?? 0;
      const more: boolean = data.hasMore ?? false;

      if (reset) {
        setAllVoices(items);
      } else {
        setAllVoices((prev) => [...prev, ...items]);
      }
      setPage(pageNum);
      setTotal(totalCount);
      setHasMore(more);
    } catch {
      if (reset) { setAllVoices([]); setHasMore(false); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [language]);

  /* Reset and reload when language changes */
  useEffect(() => {
    setAllVoices([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
    loadVoices(1, true);
  }, [loadVoices]);

  /* IntersectionObserver — trigger next page when sentinel enters view */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadVoices(pageRef.current + 1, false);
        }
      },
      { threshold: 0.1 }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [loadVoices]);

  /* Client-side filter on already-loaded voices */
  useEffect(() => {
    let result = allVoices;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q)
      );
    }

    if (activeFilters.length > 0) {
      result = result.filter((v) => {
        const allText = [
          ...(v.tags ?? []),
          v.title ?? "",
          v.description ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return activeFilters.some((label) => {
          const term = TAG_SEARCH[label] ?? label.toLowerCase();
          return allText.includes(term);
        });
      });
    }

    setFilteredVoices(result);
  }, [allVoices, search, activeFilters]);

  function toggleFilter(label: string) {
    setActiveFilters((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  }

  function removeFilter(label: string) {
    setActiveFilters((prev) => prev.filter((f) => f !== label));
  }

  function clearFilters() {
    setActiveFilters([]);
  }

  /* Audio preview */
  async function playPreview(voice: FishVoice) {
    const id = voice._id;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === id) { setPlayingId(null); return; }

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
  const heroPadding = showSidebar ? "pt-10" : "pt-36";
  const activeLang = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];

  return (
    <>
      <style>{`
        @keyframes floatWord { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
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
                  <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">{t.landing.pricing}</Link>
                  <Link href="/voices" className="text-sm font-semibold text-white px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>{t.voices.explore}</Link>
                </nav>
                <div className="flex items-center gap-3">
                  <Link href="/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hidden sm:block">{t.landing.signIn}</Link>
                  <Link href="/sign-up" className="text-sm font-semibold text-black px-4 py-2 rounded-lg" style={{ background: "#ffffff" }}>{t.landing.startFree}</Link>
                </div>
              </div>
            </header>
          )}

          {/* ── Hero ─────────────────────────────────────────── */}
          <section className={`relative overflow-hidden ${heroPadding} pb-14 px-4`} style={{ borderBottom: "1px solid #1a1a1a" }}>
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {FLOATING_WORDS.map((w, i) => (
                <span key={i} style={{ position: "absolute", left: `${w.x}%`, top: `${w.y}%`, fontSize: w.size, opacity: w.opacity, fontWeight: 700, color: "#ffffff", animation: `floatWord ${5 + i * 0.4}s ease-in-out ${w.delay}s infinite`, userSelect: "none" }}>
                  {w.text}
                </span>
              ))}
            </div>
            <div className="relative max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-3">
                {t.voicesPage.heroTitle}
              </h1>
              <p className="text-white/50 text-base md:text-lg mb-10">
                {t.voicesPage.heroSubtitle}
              </p>

              {/* Search + language + filters */}
              <div className="flex items-center gap-3 w-full max-w-3xl mx-auto">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder={t.voicesPage.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                    style={{
                      background: "rgba(40,40,45,0.55)",
                      backdropFilter: "blur(40px) saturate(180%) brightness(105%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(105%)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  />
                </div>
                <button
                  ref={langButtonRef}
                  onClick={openLang}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-white/10 transition-all flex-shrink-0"
                  style={{
                    background: "rgba(40,40,45,0.55)",
                    backdropFilter: "blur(40px) saturate(180%) brightness(105%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(105%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    borderRadius: 12,
                  }}
                >
                  <span className="text-base leading-none">{activeLang.flag}</span>
                  <span className="hidden sm:inline">{activeLang.label}</span>
                  <ChevronDown size={14} className="text-white/40" style={{ transform: langOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                {langOpen && (
                  <div
                    className="glass-menu py-2 min-w-[190px]"
                    style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => { setLanguage(l.value); setLangOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
                        style={{ color: language === l.value ? "#ffffff" : "rgba(255,255,255,0.6)" }}
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span className="flex-1 text-left">{l.label}</span>
                        {language === l.value && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Filters button */}
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 px-4 py-3 text-sm transition-all flex-shrink-0"
                  style={{
                    background: activeFilters.length > 0 ? "rgba(255,255,255,0.12)" : "rgba(40,40,45,0.55)",
                    backdropFilter: "blur(40px) saturate(180%) brightness(105%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(105%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    color: activeFilters.length > 0 ? "#ffffff" : "rgba(255,255,255,0.7)",
                  }}
                >
                  <SlidersHorizontal size={15} />
                  <span className="hidden sm:inline">{t.voicesPage.filtersBtn}</span>
                  {activeFilters.length > 0 && (
                    <span className="flex items-center justify-center text-black font-bold rounded-full" style={{ background: "#ffffff", width: 18, height: 18, fontSize: 10 }}>
                      {activeFilters.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Active filter chips */}
              {activeFilters.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap justify-center mt-3">
                  {activeFilters.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-white"
                      style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      {f}
                      <X size={11} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => removeFilter(f)} />
                    </span>
                  ))}
                  <button onClick={clearFilters} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                  >
                    {t.voicesPage.clearAll}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── Main content ───────────────────────────────────── */}
          <main className="px-4 md:px-8 py-10 max-w-screen-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{t.voicesPage.trending}</h2>
              <div className="flex flex-col items-end gap-1">
                {total > 0 && (
                  <span className="text-xs text-white/20">
                    {(activeFilters.length > 0 || search.trim()) ? `${filteredVoices.length} de ` : ""}{allVoices.length.toLocaleString("es-ES")} / {total.toLocaleString("es-ES")} voces
                  </span>
                )}
                {(activeFilters.length > 0 || search.trim()) && allVoices.length < total && (
                  <span className="text-xs text-white/20">{t.voicesPage.scrollMore}</span>
                )}
              </div>
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

            {!loading && filteredVoices.length === 0 && (
              <div className="text-center py-20">
                <p className="text-white/30 text-sm">{t.voicesPage.noResults}</p>
              </div>
            )}

            {!loading && filteredVoices.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVoices.map((voice) => (
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

            {/* ── Infinite scroll sentinel ─────────────────────── */}
            <div ref={loadMoreRef} className="w-full py-10 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.5)" }} />
                  <span className="text-sm">{t.voicesPage.loadingMore}</span>
                </div>
              )}
              {!loadingMore && !hasMore && allVoices.length > 0 && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {allVoices.length.toLocaleString("es-ES")} {t.voicesPage.voicesLoaded}
                </p>
              )}
            </div>
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

      {/* ── Filter drawer ────────────────────────────────────────── */}
      {showFilters && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowFilters(false)}
        >
          <div
            className="absolute right-0 top-0 h-full overflow-y-auto"
            style={{ width: 320, background: "#111111", borderLeft: "1px solid rgba(255,255,255,0.08)", animation: "slideInRight 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span className="text-white font-semibold text-lg">{t.voicesPage.filtersBtn}</span>
              <div className="flex items-center gap-3">
                {activeFilters.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm transition-colors"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                  >
                    {t.voicesPage.reset}
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter groups */}
            <div className="p-6 space-y-7">
              {FILTER_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
                      const isActive = activeFilters.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleFilter(tag)}
                          className="px-3 py-1.5 rounded-xl text-sm transition-all"
                          style={{
                            background: isActive ? "#ffffff" : "transparent",
                            color: isActive ? "#000000" : "rgba(255,255,255,0.6)",
                            border: isActive ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.18)",
                            fontWeight: isActive ? 500 : 400,
                          }}
                          onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; e.currentTarget.style.color = "#ffffff"; } }}
                          onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer footer */}
            {activeFilters.length > 0 && (
              <div className="sticky bottom-0 p-4 border-t" style={{ background: "#111111", borderColor: "rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-black"
                  style={{ background: "#ffffff" }}
                >
                  {t.voicesPage.viewVoices.replace("{count}", String(filteredVoices.length))}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
