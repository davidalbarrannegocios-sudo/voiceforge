"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FREE_VOICE_IDS } from "@/lib/free-voice-ids";

export interface SelectedVoice {
  referenceId: string;
  name: string;
  isCloned: boolean;
}

interface FishVoice {
  _id: string;
  title: string;
  description?: string;
  languages: string[];
  tags: string[];
  cover_image: string;
  task_count: number;
  like_count?: number;
}

interface ClonedVoice {
  id: string;
  name: string;
  fishAudioModelId?: string;
}

export { FREE_VOICE_IDS };

function isPremiumVoice(id: string) {
  return !FREE_VOICE_IDS.has(id);
}

function canUsePremium(plan?: string) {
  return !!plan && plan !== "free";
}

function getGender(tags: string[]): "male" | "female" | null {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((s) => ["male", "man", "masculine", "masculino", "hombre"].includes(s))) return "male";
  if (t.some((s) => ["female", "woman", "feminine", "femenino", "mujer"].includes(s))) return "female";
  return null;
}

const GENDER_TAG_SET = new Set([
  "male", "man", "masculine", "masculino", "hombre",
  "female", "woman", "feminine", "femenino", "mujer",
]);

const LANG_FLAGS: Record<string, string> = {
  es: "🇪🇸", en: "🇺🇸", ja: "🇯🇵", zh: "🇨🇳",
  fr: "🇫🇷", de: "🇩🇪", pt: "🇧🇷", ko: "🇰🇷", it: "🇮🇹",
};

function getAge(tags: string[]): string | null {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((s) => ["young", "joven", "youth", "young adult", "young-adult"].includes(s))) return "Joven";
  if (t.some((s) => ["middle age", "mediana edad", "middle-age", "middle aged"].includes(s))) return "Mediana Edad";
  if (t.some((s) => ["old", "elderly", "senior", "elder", "antiguo", "aged"].includes(s))) return "Mayor";
  return null;
}

const LANGS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];

const RECENT_KEY = "vf_recent_voices";
const MAX_RECENT = 12;

function saveRecentVoice(voice: FishVoice) {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    const list: FishVoice[] = stored ? JSON.parse(stored) : [];
    const updated = [voice, ...list.filter((v) => v._id !== voice._id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

function loadRecentVoices(): FishVoice[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ── Sub-components ─────────────────────────────────────────── */

function VoiceAvatar({ name, coverImage, size = "md" }: { name: string; coverImage?: string; size?: "sm" | "md" | "lg" }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset error state whenever the URL changes
  useEffect(() => { setImgFailed(false); }, [coverImage]);

  const initial = name[0]?.toUpperCase() ?? "?";
  const cls = size === "lg" ? "w-12 h-12" : size === "md" ? "w-11 h-11" : "w-9 h-9";
  const fontSize = size === "lg" ? 16 : size === "md" ? 15 : 13;
  const showImage = !!coverImage && coverImage.trim() !== "" && !imgFailed;
  const proxiedSrc = coverImage ? `/api/voice-image?url=${encodeURIComponent(coverImage)}` : "";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedSrc}
        alt=""
        className={`${cls} flex-shrink-0`}
        style={{ borderRadius: "50%", objectFit: "cover" }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", fontSize }}
    >
      {initial}
    </div>
  );
}

function TierPill({
  active,
  onClick,
  amber,
  children,
}: {
  active: boolean;
  onClick: () => void;
  amber?: boolean;
  children: React.ReactNode;
}) {
  const style = amber
    ? active
      ? { background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.4)" }
      : { background: "transparent", color: "#6b6b88", border: "1px solid #2a2a3e" }
    : active
    ? { background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" }
    : { background: "transparent", color: "#6b6b88", border: "1px solid #2a2a3e" };

  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={style}>
      {children}
    </button>
  );
}

function UpgradePrompt({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl p-6 w-72 text-center border" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(245,158,11,0.12)" }}>
          <span className="text-2xl">🔒</span>
        </div>
        <h3 className="text-white font-bold text-base mb-1">Voz Premium</h3>
        <p className="text-sm mb-5" style={{ color: "#8888a8" }}>
          Esta voz requiere plan Starter o superior
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => router.push("/pricing")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            Ver planes
          </button>
        </div>
      </div>
    </div>
  );
}

function VoiceRow({
  voice,
  previewingId,
  previewLoadingId,
  onPreview,
  onUse,
  isLocked,
  isPremium,
}: {
  voice: FishVoice;
  previewingId: string | null;
  previewLoadingId: string | null;
  onPreview: (id: string) => void;
  onUse: (voice: FishVoice) => void;
  isLocked: boolean;
  isPremium: boolean;
}) {
  const g = getGender(voice.tags);
  const age = getAge(voice.tags);
  const isPreviewing = previewingId === voice._id;
  const isPreviewLoading = previewLoadingId === voice._id;

  const pillStyle = { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 transition-colors"
      style={{ background: "transparent", borderBottom: "1px solid #111118" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Avatar 48px */}
      <VoiceAvatar name={voice.title} coverImage={voice.cover_image} size="lg" />

      {/* Center info */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-white truncate leading-tight">{voice.title}</span>
          {isPremium && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              ✦
            </span>
          )}
        </div>

        {/* Description */}
        {voice.description && (
          <p className="text-xs mb-1 truncate" style={{ color: "#555570" }}>{voice.description}</p>
        )}

        {/* Pills */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {voice.languages.slice(0, 3).map((l) => {
            const code = l.toLowerCase();
            const flag = LANG_FLAGS[code] ?? "🌐";
            return (
              <span key={l} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>
                <span>{flag}</span>
                <span>{l.toUpperCase()}</span>
              </span>
            );
          })}
          {g && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>
              {g === "male" ? "Masculino" : "Femenino"}
            </span>
          )}
          {age && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>
              {age}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1" style={{ minWidth: "60px" }}>
        <div className="flex items-center gap-1" style={{ color: "#444460" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span className="text-xs">{formatCount(voice.task_count)}</span>
        </div>
        {typeof voice.like_count === "number" && voice.like_count > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#444460" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-xs">{formatCount(voice.like_count)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onPreview(voice._id)}
          disabled={isPreviewLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
          style={{
            background: isPreviewing ? "rgba(59,130,246,0.2)" : "transparent",
            color: isPreviewing ? "#93c5fd" : "#6b7280",
            border: `1px solid ${isPreviewing ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {isPreviewLoading ? "···" : isPreviewing ? "⏹ Stop" : "▶ Vista previa"}
        </button>
        <button
          onClick={() => onUse(voice)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={
            isLocked
              ? { background: "#12121a", color: "#3a3a52", border: "1px solid #1a1a2a" }
              : { background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff" }
          }
        >
          Usar
        </button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export function VoiceBrowser({
  clonedVoices,
  onSelect,
  onClose,
  plan,
}: {
  clonedVoices: ClonedVoice[];
  onSelect: (v: SelectedVoice | null) => void;
  onClose: () => void;
  plan?: string;
}) {
  const [tab, setTab] = useState<"recent" | "explore" | "cloned">("explore");
  const [language, setLanguage] = useState("es");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [tier, setTier] = useState<"all" | "free" | "premium">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publicVoices, setPublicVoices] = useState<FishVoice[]>([]);
  const [recentVoices, setRecentVoices] = useState<FishVoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userCanUsePremium = canUsePremium(plan);

  // Load recently used from localStorage
  useEffect(() => {
    setRecentVoices(loadRecentVoices());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [language, gender]);

  const fetchVoices = useCallback(async () => {
    if (tab !== "explore") return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), language });
      if (debouncedSearch) p.set("search", debouncedSearch);
      if (gender) p.set("tag", gender);
      const res = await fetch(`/api/fish-voices?${p}`);
      const data = await res.json();
      setPublicVoices(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [tab, language, gender, debouncedSearch, page]);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  async function handlePreview(id: string) {
    if (previewingId === id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }
    audioRef.current?.pause();
    setPreviewingId(null);
    setPreviewLoadingId(id);
    try {
      const res = await fetch("/api/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_id: id }),
      });
      if (!res.ok) return;
      const { audioUrl } = await res.json();
      const audio = new Audio(audioUrl);
      audio.onended = () => setPreviewingId(null);
      audioRef.current = audio;
      await audio.play();
      setPreviewingId(id);
    } finally {
      setPreviewLoadingId(null);
    }
  }

  function handleSelect(voice: SelectedVoice | null) {
    audioRef.current?.pause();
    onSelect(voice);
    onClose();
  }

  function handleVoiceClick(voice: FishVoice) {
    if (isPremiumVoice(voice._id) && !userCanUsePremium) {
      setShowUpgrade(true);
      return;
    }
    saveRecentVoice(voice);
    handleSelect({ referenceId: voice._id, name: voice.title, isCloned: false });
  }

  const filteredVoices = publicVoices.filter((v) => {
    if (tier === "free") return !isPremiumVoice(v._id);
    if (tier === "premium") return isPremiumVoice(v._id);
    return true;
  });

  const filteredRecent = recentVoices.filter((v) => {
    if (tier === "free") return !isPremiumVoice(v._id);
    if (tier === "premium") return isPremiumVoice(v._id);
    return true;
  });

  const totalPages = Math.ceil(total / 20);

  const TABS = [
    { key: "recent" as const, label: "Recientemente usadas" },
    { key: "explore" as const, label: "Explorar" },
    { key: "cloned" as const, label: `Mis voces clonadas (${clonedVoices.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[90vw] max-w-5xl flex flex-col rounded-2xl border relative"
        style={{ background: "#0a0a12", borderColor: "#1e1e2e", height: "88vh" }}
      >
        {showUpgrade && <UpgradePrompt onClose={() => setShowUpgrade(false)} />}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#1e1e2e" }}>
          <h2 className="text-base font-bold text-white">Seleccionar voz</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#6b6b88", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1e2e")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 flex-shrink-0" style={{ borderColor: "#1e1e2e" }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="py-3 px-1 mr-6 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={
                tab === key
                  ? { color: "#e2e2f0", borderColor: "#3b82f6" }
                  : { color: "#555570", borderColor: "transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Explore tab ── */}
          {tab === "explore" && (
            <div className="px-6 py-4">
              {/* Search + dropdowns row */}
              <div className="flex gap-3 mb-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="#555570" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar voces..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-200 focus:outline-none"
                    style={{ background: "#0d0d17", border: "1px solid #1e1e2e" }}
                  />
                </div>

                {/* Language dropdown */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer focus:outline-none"
                  style={{ background: "#0d0d17", border: "1px solid #1e1e2e", color: "#c0c0d8", minWidth: "120px" }}
                >
                  {LANGS.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>

                {/* Gender dropdown */}
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "" | "male" | "female")}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer focus:outline-none"
                  style={{ background: "#0d0d17", border: "1px solid #1e1e2e", color: "#c0c0d8", minWidth: "120px" }}
                >
                  <option value="">Todos</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                </select>
              </div>

              {/* Tier pills */}
              <div className="flex items-center gap-2 mb-4">
                <TierPill active={tier === "all"} onClick={() => setTier("all")}>Todas</TierPill>
                <TierPill active={tier === "free"} onClick={() => setTier("free")}>Gratis</TierPill>
                <TierPill active={tier === "premium"} onClick={() => setTier("premium")} amber>✦ Premium</TierPill>
                {!userCanUsePremium && tier === "premium" && (
                  <span className="text-xs ml-1" style={{ color: "#444460" }}>Requiere plan Starter+</span>
                )}
              </div>

              {/* Default voice row */}
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border mb-2 transition-all text-left"
                style={{ background: "#0d0d17", borderColor: "#1e1e2e" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#12121a" }}>🎙️</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Voz por defecto</p>
                  <p className="text-xs mt-0.5" style={{ color: "#555570" }}>Se generará una voz estándar</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "#3b82f6" }}>Seleccionar →</span>
              </button>

              {/* Voice list */}
              {loading ? (
                <div className="rounded-xl overflow-hidden mt-2" style={{ border: "1px solid #1a1a2a" }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[72px] animate-pulse" style={{ background: i % 2 === 0 ? "#0d0d17" : "#0b0b15", borderBottom: "1px solid #111118" }} />
                  ))}
                </div>
              ) : filteredVoices.length === 0 ? (
                <p className="text-center py-16 text-sm" style={{ color: "#555570" }}>No se encontraron voces</p>
              ) : (
                <div className="rounded-xl overflow-hidden mt-2" style={{ border: "1px solid #1a1a2a", background: "#0a0a12" }}>
                  {filteredVoices.map((voice) => {
                    const isPremium = isPremiumVoice(voice._id);
                    const isLocked = isPremium && !userCanUsePremium;
                    return (
                      <VoiceRow
                        key={voice._id}
                        voice={voice}
                        previewingId={previewingId}
                        previewLoadingId={previewLoadingId}
                        onPreview={handlePreview}
                        onUse={handleVoiceClick}
                        isPremium={isPremium}
                        isLocked={isLocked}
                      />
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6 pb-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ background: "#0d0d17", color: "#c0c0d8", border: "1px solid #1e1e2e" }}
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm" style={{ color: "#555570" }}>{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ background: "#0d0d17", color: "#c0c0d8", border: "1px solid #1e1e2e" }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Recent tab ── */}
          {tab === "recent" && (
            <div className="px-6 py-4">
              {/* Tier pills */}
              <div className="flex items-center gap-2 mb-4">
                <TierPill active={tier === "all"} onClick={() => setTier("all")}>Todas</TierPill>
                <TierPill active={tier === "free"} onClick={() => setTier("free")}>Gratis</TierPill>
                <TierPill active={tier === "premium"} onClick={() => setTier("premium")} amber>✦ Premium</TierPill>
              </div>

              {filteredRecent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24" style={{ color: "#555570" }}>
                  <svg className="mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <p className="font-medium mb-1 text-sm">Aún no has usado ninguna voz</p>
                  <p className="text-xs mb-4">Las voces que uses aparecerán aquí</p>
                  <button
                    onClick={() => setTab("explore")}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
                  >
                    Explorar voces
                  </button>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a2a", background: "#0a0a12" }}>
                  {filteredRecent.map((voice) => {
                    const isPremium = isPremiumVoice(voice._id);
                    const isLocked = isPremium && !userCanUsePremium;
                    return (
                      <VoiceRow
                        key={voice._id}
                        voice={voice}
                        previewingId={previewingId}
                        previewLoadingId={previewLoadingId}
                        onPreview={handlePreview}
                        onUse={handleVoiceClick}
                        isPremium={isPremium}
                        isLocked={isLocked}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Cloned tab ── */}
          {tab === "cloned" && (
            <div className="px-6 py-4">
              {/* Default option */}
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border mb-3 transition-all text-left"
                style={{ background: "#0d0d17", borderColor: "#1e1e2e" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#12121a" }}>🎙️</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Voz por defecto</p>
                  <p className="text-xs mt-0.5" style={{ color: "#555570" }}>Se generará una voz estándar</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "#3b82f6" }}>Seleccionar →</span>
              </button>

              {clonedVoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20" style={{ color: "#555570" }}>
                  <span className="text-4xl mb-3">🎤</span>
                  <p className="font-medium mb-1 text-sm">No tienes voces clonadas</p>
                  <p className="text-xs">Ve a &quot;Mis voces&quot; para clonar una</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {clonedVoices.map((voice) => {
                    const modelId = voice.fishAudioModelId;
                    const isPreviewing = previewingId === modelId;
                    const isPreviewLoading = previewLoadingId === modelId;
                    return (
                      <div
                        key={voice.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                        style={{ background: "#0d0d17", borderColor: "#1e1e2e" }}
                      >
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
                        >
                          {voice.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{voice.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#555570" }}>Voz clonada</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {modelId && (
                            <button
                              onClick={() => handlePreview(modelId)}
                              disabled={isPreviewLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                              style={{
                                background: isPreviewing ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.08)",
                                color: "#93c5fd",
                                border: "1px solid rgba(59,130,246,0.2)",
                              }}
                            >
                              {isPreviewLoading ? "···" : isPreviewing ? "⏹" : "▶"}
                              <span className="hidden sm:inline">{isPreviewLoading ? "" : isPreviewing ? "Stop" : "Preview"}</span>
                            </button>
                          )}
                          <button
                            onClick={() => modelId && handleSelect({ referenceId: modelId, name: voice.name, isCloned: true })}
                            disabled={!modelId}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
                          >
                            Usar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
