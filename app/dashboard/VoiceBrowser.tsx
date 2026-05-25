"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { FREE_VOICE_IDS } from "@/lib/free-voice-ids";
import { CustomSelect } from "@/components/CustomSelect";

export interface SelectedVoice {
  referenceId: string;
  name: string;
  isCloned: boolean;
  coverImage?: string;
  description?: string;
  tags?: string[];
  languages?: string[];
  taskCount?: number;
  likeCount?: number;
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

interface FavoriteVoice {
  id: string;
  voiceId: string;
  voiceName: string;
  coverImage: string | null;
  createdAt: string;
}

interface CommunityVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  fishAudioModelId: string;
  creatorName: string;
}

interface AdvancedFilters {
  genders: string[];
  ages: string[];
  useCases: string[];
  qualities: string[];
}

export { FREE_VOICE_IDS };
export { getGender, getAge, formatCount };
export { VoiceAvatar };

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

const MALE_TAGS = new Set(["male", "man", "masculine", "masculino", "hombre"]);
const FEMALE_TAGS = new Set(["female", "woman", "feminine", "femenino", "mujer"]);


function getAge(tags: string[]): string | null {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((s) => ["young", "joven", "youth", "young adult", "young-adult"].includes(s))) return "Joven";
  if (t.some((s) => ["middle age", "mediana edad", "middle-age", "middle aged"].includes(s))) return "Mediana Edad";
  if (t.some((s) => ["old", "elderly", "senior", "elder", "antiguo", "aged"].includes(s))) return "Mayor";
  return null;
}

const LANGS = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "zh", label: "Chino" },
  { code: "de", label: "Alemán" },
  { code: "ja", label: "Japonés" },
  { code: "fr", label: "Francés" },
  { code: "ko", label: "Coreano" },
  { code: "ar", label: "Árabe" },
  { code: "ru", label: "Ruso" },
  { code: "pt", label: "Portugués" },
];
const RECENT_KEY = "vf_recent_voices";
const MAX_RECENT = 12;

const EMPTY_FILTERS: AdvancedFilters = { genders: [], ages: [], useCases: [], qualities: [] };

const FEATURED_VOICE_IDS: string[] = [
  "dfa5b230c8054f429e434f4a6e9bbdec",
  "35199d5438854f5d9157c500479ab684",
  "43e1948b1a544700bd88250916cd31e8",
  "bfed5c0810a347dbb62e8ccce7f59c48",
  "53042fcee6b84e138e72db017d9e50a6",
  "05100dcc9dfd4af49ea96dc5affbe5b1",
  "8b6d1f02193f4f4daabad86ad090da9d",
  "cc19dc88556b4dc4ac2b0da91680b162",
  "0b2aa74c364a49789bcba051f2901a5c",
  "d4ea43a56f5a42f1959ec7846a4fb59b",
  "f82e642854d84fa08b78bff5fd29ad1e",
  "5e95c590cfcb46ab927a9ec7b35a88c7",
  "e0229f9c45e543219c4a10d9f3803337",
  "22550e2d849b44e18c7df57f61e666f9",
  "48158c12018e495ab4bc2a9cbd2eff8e",
  "c87656721dda48a7906f990f036ce76f",
  "def180b161a3498db94025d5124fcb2a",
  "70e38f80bf714e2e90401efb95fd422e",
  "a1070fc5bc824bb79dfa0007c00dfd0f",
  "7c76e349434d4f1e97078d924acea65f",
  "3f56a67897df4d218eac6494ff88337f",
  "9ea79fe31584435abe88b02e7aed4e6e",
  "5063c91739b64e83bd59182d33d03ad2",
];

const USE_CASE_TAGS: Record<string, string[]> = {
  "Conversacional": ["conversational", "conversation", "chat", "dialogue", "natural"],
  "Narración": ["narration", "narrator", "storytelling", "audiobook", "narrative"],
  "Personaje": ["character-voice", "character voice", "character", "gaming", "anime"],
  "Educativo": ["educational", "education", "tutorial", "learning", "lecture"],
  "Publicidad": ["advertising", "commercial", "promo", "promotion", "ad"],
  "Redes Sociales": ["social-media", "social media", "social", "tiktok", "youtube", "shorts"],
};

const QUALITY_TAGS: Record<string, string[]> = {
  "Profundo": ["deep", "bass", "low", "baritone", "powerful"],
  "Suave": ["soft", "smooth", "gentle", "subtle"],
  "Brillante": ["bright", "clear", "crisp", "sharp"],
  "Energético": ["energetic", "dynamic", "lively", "vibrant", "excited"],
  "Calmado": ["calm", "relaxed", "soothing", "peaceful", "serene"],
};

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

function matchesAdvancedFilters(voice: FishVoice, filters: AdvancedFilters): boolean {
  const tags = voice.tags.map((s) => s.toLowerCase());

  if (filters.genders.length > 0) {
    const match = filters.genders.some((g) => {
      if (g === "male") return tags.some((t) => MALE_TAGS.has(t));
      if (g === "female") return tags.some((t) => FEMALE_TAGS.has(t));
      if (g === "neutral") return !tags.some((t) => MALE_TAGS.has(t) || FEMALE_TAGS.has(t));
      return false;
    });
    if (!match) return false;
  }

  if (filters.ages.length > 0) {
    const match = filters.ages.some((a) => {
      if (a === "young") return tags.some((t) => ["young", "joven", "youth", "young adult", "young-adult"].includes(t));
      if (a === "middleage") return tags.some((t) => ["middle age", "mediana edad", "middle-age", "middle aged"].includes(t));
      if (a === "old") return tags.some((t) => ["old", "elderly", "senior", "elder", "antiguo", "aged"].includes(t));
      return false;
    });
    if (!match) return false;
  }

  if (filters.useCases.length > 0) {
    const match = filters.useCases.some((useCase) => {
      const matchTags = USE_CASE_TAGS[useCase] ?? [];
      return matchTags.some((mt) => tags.some((t) => t.includes(mt)));
    });
    if (!match) return false;
  }

  if (filters.qualities.length > 0) {
    const match = filters.qualities.some((quality) => {
      const matchTags = QUALITY_TAGS[quality] ?? [];
      return matchTags.some((mt) => tags.some((t) => t.includes(mt)));
    });
    if (!match) return false;
  }

  return true;
}

/* ── Sub-components ─────────────────────────────────────────── */

function VoiceAvatar({ name, coverImage, size = "md" }: { name: string; coverImage?: string; size?: "sm" | "md" | "lg" }) {
  const [imgFailed, setImgFailed] = useState(false);

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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24"
      fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "#555570"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function FilterPanel({
  filters,
  onChange,
  onReset,
  onClose,
  onApply,
}: {
  filters: AdvancedFilters;
  onChange: (f: AdvancedFilters) => void;
  onReset: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  function toggleItem(key: keyof AdvancedFilters, value: string) {
    const arr = filters[key] as string[];
    const updated = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    onChange({ ...filters, [key]: updated });
  }

  function Pill({ filterKey, value, label }: { filterKey: keyof AdvancedFilters; value: string; label: string }) {
    const active = (filters[filterKey] as string[]).includes(value);
    return (
      <button
        onClick={() => toggleItem(filterKey, value)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={
          active
            ? { background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" }
            : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a3e" }
        }
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="absolute inset-y-0 right-0 w-72 flex flex-col z-20 overflow-y-auto"
      style={{ background: "#0d0d17", borderLeft: "1px solid #1e1e2e" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#1e1e2e" }}>
        <span className="text-sm font-semibold text-white">Filtros</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-xs font-medium transition-colors"
            style={{ color: "#555570" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e2f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555570")}
          >
            Restablecer
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: "#555570", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1e2e")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 py-4 flex flex-col gap-5 flex-1">
        {/* Género */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#555570" }}>Género</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill filterKey="genders" value="male" label="Masculino" />
            <Pill filterKey="genders" value="female" label="Femenino" />
            <Pill filterKey="genders" value="neutral" label="Neutral" />
          </div>
        </div>

        {/* Edad */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#555570" }}>Edad</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill filterKey="ages" value="young" label="Joven" />
            <Pill filterKey="ages" value="middleage" label="Mediana Edad" />
            <Pill filterKey="ages" value="old" label="Antiguo" />
          </div>
        </div>

        {/* Caso de Uso */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#555570" }}>Caso de Uso</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(USE_CASE_TAGS).map((label) => (
              <Pill key={label} filterKey="useCases" value={label} label={label} />
            ))}
          </div>
        </div>

        {/* Calidad de Voz */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#555570" }}>Calidad de Voz</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(QUALITY_TAGS).map((label) => (
              <Pill key={label} filterKey="qualities" value={label} label={label} />
            ))}
          </div>
        </div>
      </div>

      {/* Apply button */}
      <div className="px-4 py-4 border-t flex-shrink-0" style={{ borderColor: "#1e1e2e" }}>
        <button
          onClick={onApply}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
        >
          Aplicar filtros
        </button>
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
  isFavorite,
  onToggleFavorite,
}: {
  voice: FishVoice;
  previewingId: string | null;
  previewLoadingId: string | null;
  onPreview: (id: string) => void;
  onUse: (voice: FishVoice) => void;
  isLocked: boolean;
  isPremium: boolean;
  isFavorite: boolean;
  onToggleFavorite: (voice: FishVoice) => void;
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
            
            return (
              <span key={l} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>
                <span className={`fi fi-${code}`} style={{width:"16px",height:"12px",display:"inline-block",borderRadius:"2px"}} />
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
          onClick={() => onToggleFavorite(voice)}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all flex-shrink-0"
          style={{ background: "transparent" }}
          title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <HeartIcon filled={isFavorite} />
        </button>
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
  const [tab, setTab] = useState<"recent" | "explore" | "favorites" | "cloned">("explore");
  const [language, setLanguage] = useState("es");
  const [tier, setTier] = useState<"all" | "free" | "premium">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publicVoices, setPublicVoices] = useState<FishVoice[]>([]);
  const [recentVoices, setRecentVoices] = useState<FishVoice[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteVoices, setFavoriteVoices] = useState<FavoriteVoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  // Refs for progressive accumulation when a tier filter is active
  const tierRawRef = useRef<FishVoice[]>([]); // accumulated raw voices
  const tierFishPageRef = useRef(1);          // next Fish Audio page to fetch
  const tierHasMoreRef = useRef(true);        // whether more Fish Audio pages exist
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [featuredVoices, setFeaturedVoices] = useState<FishVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [communityVoices, setCommunityVoices] = useState<CommunityVoice[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const [communitySearchDebounced, setCommunitySearchDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setCommunitySearchDebounced(communitySearch), 300);
    return () => clearTimeout(t);
  }, [communitySearch]);

  useEffect(() => {
    if (tab !== "cloned") return;
    const controller = new AbortController();
    setCommunityLoading(true);
    const q = communitySearchDebounced ? `?search=${encodeURIComponent(communitySearchDebounced)}` : "";
    fetch(`/api/voices/public${q}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setCommunityVoices(Array.isArray(data) ? data : []))
      .catch((e) => { if (e.name !== "AbortError") setCommunityVoices([]); })
      .finally(() => setCommunityLoading(false));
    return () => controller.abort();
  }, [tab, communitySearchDebounced]);

  const userCanUsePremium = canUsePremium(plan);
  const activeFilterCount =
    filters.genders.length + filters.ages.length + filters.useCases.length + filters.qualities.length;

  // Load recently used from localStorage
  useEffect(() => {
    setRecentVoices(loadRecentVoices());
  }, []);

  // Load favorites from API
  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data: FavoriteVoice[]) => {
        if (Array.isArray(data)) {
          setFavoriteVoices(data);
          setFavoriteIds(new Set(data.map((f) => f.voiceId)));
        }
      })
      .catch(() => {});
  }, []);

  async function toggleFavorite(voice: FishVoice) {
    const wasFav = favoriteIds.has(voice._id);
    if (wasFav) {
      setFavoriteIds((prev) => { const s = new Set(prev); s.delete(voice._id); return s; });
      setFavoriteVoices((prev) => prev.filter((f) => f.voiceId !== voice._id));
    } else {
      setFavoriteIds((prev) => new Set(prev).add(voice._id));
      setFavoriteVoices((prev) => [{
        id: `temp-${voice._id}`,
        voiceId: voice._id,
        voiceName: voice.title,
        coverImage: voice.cover_image || null,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    }
    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voice._id, voiceName: voice.title, coverImage: voice.cover_image }),
      });
    } catch {
      if (wasFav) {
        setFavoriteIds((prev) => new Set(prev).add(voice._id));
        setFavoriteVoices((prev) => [{
          id: `temp-${voice._id}`,
          voiceId: voice._id,
          voiceName: voice.title,
          coverImage: voice.cover_image || null,
          createdAt: new Date().toISOString(),
        }, ...prev]);
      } else {
        setFavoriteIds((prev) => { const s = new Set(prev); s.delete(voice._id); return s; });
        setFavoriteVoices((prev) => prev.filter((f) => f.voiceId !== voice._id));
      }
    }
  }

  function handleApplyFilters() {
    tierRawRef.current = [];
    tierFishPageRef.current = 1;
    tierHasMoreRef.current = true;
    setPage(1);
    setAppliedFilters({ ...filters });
    setShowFilterPanel(false);
  }

  // Fetch each featured voice individually so they're always available regardless of page
  useEffect(() => {
    if (FEATURED_VOICE_IDS.length === 0) return;
    Promise.all(
      FEATURED_VOICE_IDS.map((id) =>
        fetch(`/api/fish-voice/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setFeaturedVoices(results.filter((v): v is FishVoice => v !== null && Boolean(v._id)));
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (tab !== "explore") return;

    // Reset accumulation buffer and page when filter params change
    tierRawRef.current = [];
    tierFishPageRef.current = 1;
    tierHasMoreRef.current = true;
    setPage(1);
    setPublicVoices([]);

    const controller = new AbortController();
    const { signal } = controller;

    async function run() {
      setLoading(true);
      const hasAppliedFilters = Object.values(appliedFilters).some((arr) => arr.length > 0);
      const needsAccumulation = tier !== "all" || hasAppliedFilters;
      try {
        if (needsAccumulation) {
          const MAX_PAGES = 20;
          const targetCount = 20; // always page 1 after reset
          const matchesCriteria = (v: FishVoice) => {
            if (tier === "free" && isPremiumVoice(v._id)) return false;
            if (tier === "premium" && !isPremiumVoice(v._id)) return false;
            return matchesAdvancedFilters(v, appliedFilters);
          };
          while (tierHasMoreRef.current && tierFishPageRef.current <= MAX_PAGES) {
            if (tierRawRef.current.filter(matchesCriteria).length >= targetCount) break;

            const p = new URLSearchParams({ page: String(tierFishPageRef.current), language });
            if (debouncedSearch) p.set("search", debouncedSearch);
            const res = await fetch(`/api/fish-voices?${p}`, { signal });
            if (signal.aborted) return;
            const data = await res.json();
            const items: FishVoice[] = data.items ?? [];
            const fishTotal: number = data.total ?? 0;

            if (items.length === 0) { tierHasMoreRef.current = false; break; }
            tierRawRef.current = [...tierRawRef.current, ...items];
            tierFishPageRef.current += 1;
            if (tierRawRef.current.length >= fishTotal) { tierHasMoreRef.current = false; break; }
          }

          if (signal.aborted) return;
          const filtered = tierRawRef.current.filter(matchesCriteria);
          const canLoadMore = tierHasMoreRef.current && tierFishPageRef.current <= MAX_PAGES;
          setTotal(canLoadMore ? filtered.length + 20 : filtered.length);
          setPublicVoices([...tierRawRef.current]);
        } else {
          const p = new URLSearchParams({ page: String(1), language });
          if (debouncedSearch) p.set("search", debouncedSearch);
          const res = await fetch(`/api/fish-voices?${p}`, { signal });
          if (signal.aborted) return;
          const data = await res.json();
          setPublicVoices(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        throw e;
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    run();
    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tier, language, debouncedSearch, appliedFilters]);

  // Separate effect for page navigation (no buffer reset — just slices into existing data)
  useEffect(() => {
    if (tab !== "explore" || page === 1) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function run() {
      setLoading(true);
      const hasAppliedFilters = Object.values(appliedFilters).some((arr) => arr.length > 0);
      const needsAccumulation = tier !== "all" || hasAppliedFilters;
      try {
        if (needsAccumulation) {
          const MAX_PAGES = 20;
          const targetCount = page * 20;
          const matchesCriteria = (v: FishVoice) => {
            if (tier === "free" && isPremiumVoice(v._id)) return false;
            if (tier === "premium" && !isPremiumVoice(v._id)) return false;
            return matchesAdvancedFilters(v, appliedFilters);
          };
          while (tierHasMoreRef.current && tierFishPageRef.current <= MAX_PAGES) {
            if (tierRawRef.current.filter(matchesCriteria).length >= targetCount) break;

            const p = new URLSearchParams({ page: String(tierFishPageRef.current), language });
            if (debouncedSearch) p.set("search", debouncedSearch);
            const res = await fetch(`/api/fish-voices?${p}`, { signal });
            if (signal.aborted) return;
            const data = await res.json();
            const items: FishVoice[] = data.items ?? [];
            const fishTotal: number = data.total ?? 0;

            if (items.length === 0) { tierHasMoreRef.current = false; break; }
            tierRawRef.current = [...tierRawRef.current, ...items];
            tierFishPageRef.current += 1;
            if (tierRawRef.current.length >= fishTotal) { tierHasMoreRef.current = false; break; }
          }

          if (signal.aborted) return;
          const filtered = tierRawRef.current.filter(matchesCriteria);
          const canLoadMore = tierHasMoreRef.current && tierFishPageRef.current <= MAX_PAGES;
          setTotal(canLoadMore ? filtered.length + 20 : filtered.length);
          setPublicVoices([...tierRawRef.current]);
        } else {
          const p = new URLSearchParams({ page: String(page), language });
          if (debouncedSearch) p.set("search", debouncedSearch);
          const res = await fetch(`/api/fish-voices?${p}`, { signal });
          if (signal.aborted) return;
          const data = await res.json();
          setPublicVoices(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        throw e;
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    run();
    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      const res = await fetch(`/api/voice-preview/${id}`);
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
    handleSelect({
      referenceId: voice._id,
      name: voice.title,
      isCloned: false,
      coverImage: voice.cover_image || undefined,
      description: voice.description,
      tags: voice.tags,
      languages: voice.languages,
      taskCount: voice.task_count,
      likeCount: voice.like_count,
    });
  }

  const filteredVoices = publicVoices.filter((v) => {
    if (tier === "free" && isPremiumVoice(v._id)) return false;
    if (tier === "premium" && !isPremiumVoice(v._id)) return false;
    return matchesAdvancedFilters(v, appliedFilters);
  });

  const hasActiveFilters = Object.values(appliedFilters).some((arr) => arr.length > 0);

  // When tier is filtered, paginate the accumulated filteredVoices client-side
  const pageSlice = tier !== "all"
    ? filteredVoices.slice((page - 1) * 20, page * 20)
    : filteredVoices;

  const applyFeatured = page === 1 && !debouncedSearch && !hasActiveFilters && tier === "all" && featuredVoices.length > 0;
  const displayedVoices = applyFeatured
    ? [
        // applyFeatured requires tier === "all", so no tier filter needed here
        ...FEATURED_VOICE_IDS
          .map((id) => featuredVoices.find((v) => v._id === id))
          .filter((v): v is FishVoice => v !== undefined),
        ...pageSlice.filter((v) => !FEATURED_VOICE_IDS.includes(v._id)),
      ]
    : pageSlice;

  const filteredRecent = recentVoices.filter((v) => {
    if (tier === "free") return !isPremiumVoice(v._id);
    if (tier === "premium") return isPremiumVoice(v._id);
    return true;
  });

  const totalPages = Math.ceil(total / 20);

  const TABS = [
    { key: "recent" as const, label: "Recientemente usadas" },
    { key: "explore" as const, label: "Explorar" },
    { key: "favorites" as const, label: `Favoritos${favoriteVoices.length > 0 ? ` (${favoriteVoices.length})` : ""}` },
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
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto">

            {/* ── Explore tab ── */}
            {tab === "explore" && (
              <div className="px-6 py-4">
                {/* Search + controls row */}
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
                  <CustomSelect
                    options={LANGS.map(({ code, label }) => ({ value: code, label }))}
                    value={language}
                    onChange={setLanguage}
                    style={{ minWidth: "140px" }}
                  />

                  {/* Advanced filter button */}
                  <button
                    onClick={() => setShowFilterPanel((p) => !p)}
                    className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={
                      showFilterPanel || activeFilterCount > 0
                        ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" }
                        : { background: "#0d0d17", color: "#c0c0d8", border: "1px solid #1e1e2e" }
                    }
                    title="Filtros avanzados"
                  >
                    {/* Sliders icon */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                    <span>Filtros</span>
                    {activeFilterCount > 0 && (
                      <span
                        className="flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold text-white"
                        style={{ background: "#3b82f6", fontSize: "10px" }}
                      >
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
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
                ) : displayedVoices.length === 0 ? (
                  <p className="text-center py-16 text-sm" style={{ color: "#555570" }}>No se encontraron voces</p>
                ) : (
                  <div className="rounded-xl overflow-hidden mt-2" style={{ border: "1px solid #1a1a2a", background: "#0a0a12" }}>
                    {displayedVoices.map((voice) => {
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
                          isFavorite={favoriteIds.has(voice._id)}
                          onToggleFavorite={toggleFavorite}
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
                          isFavorite={favoriteIds.has(voice._id)}
                          onToggleFavorite={toggleFavorite}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Favorites tab ── */}
            {tab === "favorites" && (
              <div className="px-6 py-4">
                {favoriteVoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24" style={{ color: "#555570" }}>
                    <HeartIcon filled={false} />
                    <p className="font-medium mb-1 text-sm mt-4">No tienes voces favoritas</p>
                    <p className="text-xs mb-4">Haz clic en el corazón de cualquier voz para guardarla aquí</p>
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
                    {favoriteVoices.map((fav) => {
                      const favVoice: FishVoice = {
                        _id: fav.voiceId,
                        title: fav.voiceName,
                        cover_image: fav.coverImage ?? "",
                        languages: [],
                        tags: [],
                        task_count: 0,
                      };
                      const isPremium = isPremiumVoice(fav.voiceId);
                      const isLocked = isPremium && !userCanUsePremium;
                      return (
                        <VoiceRow
                          key={fav.id}
                          voice={favVoice}
                          previewingId={previewingId}
                          previewLoadingId={previewLoadingId}
                          onPreview={handlePreview}
                          onUse={handleVoiceClick}
                          isPremium={isPremium}
                          isLocked={isLocked}
                          isFavorite={true}
                          onToggleFavorite={toggleFavorite}
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

                {/* Community voices */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={13} style={{ color: "#4a4a65" }} />
                    <span className="text-xs font-semibold" style={{ color: "#4a4a65" }}>Voces de la comunidad</span>
                  </div>

                  {/* Search input */}
                  <div className="mb-2">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a4a65" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input
                        type="text"
                        value={communitySearch}
                        onChange={(e) => setCommunitySearch(e.target.value)}
                        placeholder="Buscar por nombre o ID..."
                        className="w-full rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                        style={{ background: "#0a0a12", border: "1px solid #1e1e2e", color: "#d1d5db" }}
                      />
                    </div>
                    {communitySearch.length > 15 && !communitySearch.includes(" ") && (
                      <p className="text-xs mt-1.5 pl-1" style={{ color: "#4a4a65" }}>Buscando por ID de voz...</p>
                    )}
                  </div>

                  {communityLoading ? (
                    <div className="space-y-1.5">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#0d0d17" }} />
                      ))}
                    </div>
                  ) : (() => {
                    // Client-side fallback filter — catches any server-side gaps
                    const lower = communitySearchDebounced.toLowerCase();
                    const filtered = lower
                      ? communityVoices.filter(
                          (v) =>
                            v.name.toLowerCase().includes(lower) ||
                            v.fishAudioModelId.toLowerCase().includes(lower)
                        )
                      : communityVoices;
                    const exactMatch = communitySearchDebounced
                      ? filtered.find((v) => v.fishAudioModelId.toLowerCase() === lower)
                      : null;
                    const sorted = exactMatch
                      ? [exactMatch, ...filtered.filter((v) => v.fishAudioModelId !== exactMatch.fishAudioModelId)]
                      : filtered;

                    if (sorted.length === 0) {
                      return (
                        <p className="text-xs text-center py-6" style={{ color: "#3a3a52" }}>
                          {communitySearchDebounced ? "Sin resultados" : "No hay voces públicas aún"}
                        </p>
                      );
                    }
                    return (
                    <div className="space-y-1.5">
                      {(() => {
                        return sorted.map((voice) => {
                          const isExact = exactMatch?.fishAudioModelId === voice.fishAudioModelId && !!communitySearchDebounced;
                          return (
                            <div
                              key={voice.id}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                              style={{
                                background: isExact ? "rgba(124,58,237,0.06)" : "#0d0d17",
                                borderColor: isExact ? "rgba(124,58,237,0.3)" : "#1e1e2e",
                              }}
                            >
                              <div
                                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                              >
                                {voice.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-semibold text-white truncate">{voice.name}</p>
                                  <span className="text-sm leading-none flex-shrink-0">{<span className={`fi fi-${voice.language}`} style={{width:"16px",height:"12px",display:"inline-block",borderRadius:"2px"}} />}</span>
                                  {voice.gender && (
                                    <span className="text-xs flex-shrink-0" style={{ color: "#3a3a52" }}>
                                      {voice.gender === "masculine" ? "♂" : voice.gender === "feminine" ? "♀" : ""}
                                    </span>
                                  )}
                                  {isExact && (
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded-full font-medium leading-none flex-shrink-0"
                                      style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
                                    >
                                      Coincidencia por ID
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: "#555570" }}>por {voice.creatorName}</p>
                              </div>
                              <button
                                onClick={() => handleSelect({ referenceId: voice.fishAudioModelId, name: voice.name, isCloned: true })}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                              >
                                Usar
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    );
                  })()}
                </div>
              </div>
            )}

          </div>

          {/* Advanced filter panel overlay */}
          {showFilterPanel && tab === "explore" && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
              onClose={() => setShowFilterPanel(false)}
              onApply={handleApplyFilters}
            />
          )}
        </div>
      </div>
    </div>
  );
}
