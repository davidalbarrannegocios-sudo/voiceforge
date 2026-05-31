"use client";

import { useState, useEffect, useRef } from "react";
import { Globe } from "lucide-react";
import { FREE_VOICE_IDS } from "@/lib/free-voice-ids";
import { CustomSelect } from "@/components/CustomSelect";
import { VoiceAvatarGenerative } from "@/components/VoiceAvatarGenerative";

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
  cover_image: string | null;
  task_count: number;
  like_count?: number;
  samples?: Array<{ audio: string; task_id?: string }>;
  author?: { nickname?: string; _id?: string };
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
  { code: "es", label: "Español",   fi: "es" },
  { code: "en", label: "Inglés",    fi: "us" },
  { code: "zh", label: "Chino",     fi: "cn" },
  { code: "de", label: "Alemán",    fi: "de" },
  { code: "ja", label: "Japonés",   fi: "jp" },
  { code: "fr", label: "Francés",   fi: "fr" },
  { code: "ko", label: "Coreano",   fi: "kr" },
  { code: "ar", label: "Árabe",     fi: "sa" },
  { code: "ru", label: "Ruso",      fi: "ru" },
  { code: "pt", label: "Portugués", fi: "br" },
];

const LANG_MAP: Record<string, { name: string; flag: string }> = {
  en: { name: "Inglés",      flag: "us" },
  es: { name: "Español",     flag: "es" },
  zh: { name: "Chino",       flag: "cn" },
  de: { name: "Alemán",      flag: "de" },
  fr: { name: "Francés",     flag: "fr" },
  pt: { name: "Portugués",   flag: "pt" },
  it: { name: "Italiano",    flag: "it" },
  ja: { name: "Japonés",     flag: "jp" },
  ko: { name: "Coreano",     flag: "kr" },
  hi: { name: "Hindi",       flag: "in" },
  ar: { name: "Árabe",       flag: "sa" },
  ru: { name: "Ruso",        flag: "ru" },
  pl: { name: "Polaco",      flag: "pl" },
  tr: { name: "Turco",       flag: "tr" },
  nl: { name: "Holandés",    flag: "nl" },
  sv: { name: "Sueco",       flag: "se" },
  id: { name: "Indonesio",   flag: "id" },
  tl: { name: "Filipino",    flag: "ph" },
  ms: { name: "Malayo",      flag: "my" },
  ro: { name: "Rumano",      flag: "ro" },
  uk: { name: "Ucraniano",   flag: "ua" },
  el: { name: "Griego",      flag: "gr" },
  cs: { name: "Checo",       flag: "cz" },
  da: { name: "Danés",       flag: "dk" },
  fi: { name: "Finlandés",   flag: "fi" },
  hu: { name: "Húngaro",     flag: "hu" },
  no: { name: "Noruego",     flag: "no" },
  sk: { name: "Eslovaco",    flag: "sk" },
  hr: { name: "Croata",      flag: "hr" },
  bn: { name: "Bengalí",     flag: "bd" },
  ta: { name: "Tamil",       flag: "in" },
  vi: { name: "Vietnamita",  flag: "vn" },
  ca: { name: "Catalán",     flag: "es" },
};

// language code → country flag code (for fi-flag-icon CSS)
const LANG_TO_FLAG: Record<string, string> = {
  ...Object.fromEntries(LANGS.map(({ code, fi }) => [code, fi])),
  ...Object.fromEntries(Object.entries(LANG_MAP).map(([code, { flag }]) => [code, flag])),
};
function langFlag(code: string): string {
  return LANG_TO_FLAG[code.toLowerCase()] ?? code.toLowerCase();
}

const ACCENT_FLAGS: Record<string, string> = {
  american: "us", british: "gb", australian: "au", canadian: "ca",
  irish: "ie", scottish: "gb-sct",
  "african american": "us", "us southern": "us",
  "latin american": "mx", mexican: "mx", peruvian: "pe",
  argentine: "ar", chilean: "cl", colombian: "co",
  venezuelan: "ve", cuban: "cu", "puerto rican": "pr", dominican: "do",
  spanish: "es", peninsular: "es",
  french: "fr", parisian: "fr",
  german: "de", austrian: "at",
  italian: "it", milanese: "it",
  portuguese: "pt", brazilian: "br",
  indian: "in", chinese: "cn",
  "beijing mandarin": "cn", japanese: "jp",
  korean: "kr", seoul: "kr",
  kanto: "jp", kansai: "jp",
  norwegian: "no", oslo: "no",
  ukrainian: "ua", russian: "ru",
  malay: "my", bhojpuri: "in",
  moravian: "cz", northern: "gb",
  standard: "us",
  // legacy entries kept for Fish Audio
  "south-african": "za", swedish: "se", "german-american": "de", nigerian: "ng",
};

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

const DEFAULT_VOICES: FishVoice[] = [
  { _id: "04693bede00c431a83a0c993b0800f5e", title: "Mexican Man", description: "Voz masculina profesional con acento mexicano claro y autoritativo. Ideal para narración educativa y médica.", cover_image: null, languages: ["es"], tags: ["male", "old", "educational", "narration", "professional", "calm", "measured", "clear"], task_count: 227, like_count: 2 },
  { _id: "c87296fac10f4ea68b8f3808f1d99805", title: "Mexican Tik Tok", description: "Voz femenina joven y enérgica con tono claro y dinámico. Perfecta para redes sociales y contenido viral.", cover_image: null, languages: ["es"], tags: ["female", "young", "social-media", "energetic", "enthusiastic", "clear"], task_count: 210, like_count: 0 },
  { _id: "c634a542a2f34f239a164d5452a582e6", title: "MEXICAN", description: "Voz masculina mexicana amigable y clara. Excelente para viajes, lifestyle y contenido de entretenimiento.", cover_image: null, languages: ["es"], tags: ["male", "middle-aged", "social-media", "energetic", "friendly", "clear"], task_count: 290, like_count: 5 },
  { _id: "3a485d962d2d4fb6838bc7eaf6d685a0", title: "Mexican Lopez", description: "Voz masculina joven y expresiva con energía juvenil. Ideal para personajes, entretenimiento y storytelling.", cover_image: null, languages: ["es"], tags: ["male", "young", "entertainment", "character-voice", "energetic", "cheerful", "expressive"], task_count: 537, like_count: 4 },
  { _id: "3fd440b4ffe748dabdbaf9fe88099742", title: "Mexican", description: "Voz masculina seductora y carismática con tono profundo y suave. Perfecta para personajes y roles dramáticos.", cover_image: null, languages: ["es"], tags: ["male", "middle-aged", "character-voice", "deep", "smooth", "playful"], task_count: 103, like_count: 0 },
  { _id: "dfa5b230c8054f429e434f4a6e9bbdec", title: "Voz Profesional ES", description: "Voz profesional en español con tono cálido y confiable. Versátil para narración, publicidad y contenido corporativo.", cover_image: null, languages: ["es"], tags: ["male", "professional", "calm", "warm", "narration"], task_count: 1200, like_count: 18 },
  { _id: "35199d5438854f5d9157c500479ab684", title: "Voz Natural ES", description: "Voz femenina natural y cercana en español. Ideal para podcasts, tutoriales y contenido educativo.", cover_image: null, languages: ["es"], tags: ["female", "middle-aged", "conversational", "friendly", "clear", "educational"], task_count: 890, like_count: 12 },
];

const USE_CASE_TAGS: Record<string, string[]> = {
  "conversational":  ["conversational", "conversation", "chat", "dialogue", "natural"],
  "narration":       ["narration", "narrator", "storytelling", "audiobook", "narrative"],
  "character-voice": ["character-voice", "character voice", "character", "gaming", "anime"],
  "social-media":    ["social-media", "social media", "social", "tiktok", "youtube", "shorts"],
  "educational":     ["educational", "education", "tutorial", "learning", "lecture"],
  "advertising":     ["advertising", "commercial", "promo", "promotion", "ad"],
  "entertainment":   ["entertainment", "entertain", "fun", "comedy"],
};

const QUALITY_TAGS: Record<string, string[]> = {
  "deep":          ["deep", "bass", "baritone"],
  "low":           ["low"],
  "medium":        ["medium"],
  "high":          ["high"],
  "soft":          ["soft", "gentle", "subtle"],
  "bright":        ["bright", "crisp", "sharp"],
  "warm":          ["warm"],
  "dark":          ["dark"],
  "husky":         ["husky"],
  "breathy":       ["breathy"],
  "raspy":         ["raspy"],
  "energetic":     ["energetic", "lively", "vibrant"],
  "calm":          ["calm", "soothing", "peaceful", "serene"],
  "relaxed":       ["relaxed"],
  "fast":          ["fast"],
  "slow":          ["slow"],
  "measured":      ["measured"],
  "dynamic":       ["dynamic"],
  "sensual":       ["sensual", "seductive"],
  "friendly":      ["friendly"],
  "professional":  ["professional"],
  "serious":       ["serious"],
  "cheerful":      ["cheerful"],
  "enthusiastic":  ["enthusiastic"],
  "confident":     ["confident"],
  "authoritative": ["authoritative"],
  "empathetic":    ["empathetic"],
  "playful":       ["playful"],
  "dramatic":      ["dramatic"],
  "intimate":      ["intimate"],
  "mysterious":    ["mysterious"],
  "sad":           ["sad"],
  "angry":         ["angry"],
  "clear":         ["clear"],
  "neutral-tone":  ["neutral", "neutral-tone"],
  "expressive":    ["expressive"],
  "monotone":      ["monotone"],
  "animated":      ["animated"],
  "narration-q":   ["narration", "narrator"],
  "narrative":     ["narrative"],
  "character":     ["character"],
  "announcer":     ["announcer"],
  "host":          ["host"],
  "teacher":       ["teacher"],
  "trainer":       ["trainer"],
  "anime":         ["anime"],
  "video-game":    ["video-game", "gaming", "game"],
  "cinematic":     ["cinematic"],
  "documentary":   ["documentary"],
  "radio":         ["radio"],
  "podcast":       ["podcast"],
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

function VoiceAvatar({ name, coverImage, size = "md", id }: { name: string; coverImage?: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; id?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => { setImgFailed(false); }, [coverImage]);

  const cls = size === "xl" ? "w-16 h-16" : size === "lg" ? "w-12 h-12" : size === "md" ? "w-11 h-11" : size === "sm" ? "w-9 h-9" : "w-6 h-6";
  const showImage = !!coverImage && coverImage.trim() !== "" && !imgFailed;
  const proxiedSrc = coverImage ? `/api/voice-image?url=${encodeURIComponent(coverImage)}` : "";
  const pxSize = size === "xl" ? 64 : size === "lg" ? 48 : size === "md" ? 44 : size === "sm" ? 36 : 24;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedSrc}
        alt=""
        className={`${cls} flex-shrink-0`}
        style={{ borderRadius: "8px", objectFit: "cover" }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <VoiceAvatarGenerative seed={id ?? name} size={pxSize} className="flex-shrink-0" />;
}


function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24"
      fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "#666666"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const USE_CASE_OPTIONS = [
  { value: "conversational",  label: "Conversacional" },
  { value: "narration",       label: "Narración" },
  { value: "character-voice", label: "Voz del Personaje" },
  { value: "social-media",    label: "Redes Sociales" },
  { value: "educational",     label: "Educativo" },
  { value: "advertising",     label: "Publicidad" },
  { value: "entertainment",   label: "Entretenimiento" },
];

const QUALITY_OPTIONS = [
  { value: "deep",          label: "Profundo" },
  { value: "low",           label: "Bajo" },
  { value: "medium",        label: "Medio" },
  { value: "high",          label: "Alto" },
  { value: "soft",          label: "Suave" },
  { value: "bright",        label: "Brillante" },
  { value: "warm",          label: "Cálido" },
  { value: "dark",          label: "Oscuro" },
  { value: "husky",         label: "Ronco" },
  { value: "breathy",       label: "Soploso" },
  { value: "raspy",         label: "Ronca" },
  { value: "energetic",     label: "Energético" },
  { value: "calm",          label: "Tranquilo" },
  { value: "relaxed",       label: "Relajado" },
  { value: "fast",          label: "Rápido" },
  { value: "slow",          label: "Lento" },
  { value: "measured",      label: "Medido" },
  { value: "dynamic",       label: "Dinámico" },
  { value: "sensual",       label: "Sensual" },
  { value: "friendly",      label: "Amigable" },
  { value: "professional",  label: "Profesional" },
  { value: "serious",       label: "Serio" },
  { value: "cheerful",      label: "Alegre" },
  { value: "enthusiastic",  label: "Entusiasta" },
  { value: "confident",     label: "Confiado" },
  { value: "authoritative", label: "Autoritario" },
  { value: "empathetic",    label: "Empático" },
  { value: "playful",       label: "Juguetón" },
  { value: "dramatic",      label: "Dramático" },
  { value: "intimate",      label: "Íntimo" },
  { value: "mysterious",    label: "Misterioso" },
  { value: "sad",           label: "Triste" },
  { value: "angry",         label: "Enojado" },
  { value: "clear",         label: "Nítido" },
  { value: "neutral-tone",  label: "Tono Neutral" },
  { value: "expressive",    label: "Expresivo" },
  { value: "monotone",      label: "Monótono" },
  { value: "animated",      label: "Animado" },
  { value: "narration-q",   label: "Narración" },
  { value: "narrative",     label: "Narrativa" },
  { value: "character",     label: "Personaje" },
  { value: "announcer",     label: "Locutor" },
  { value: "host",          label: "Anfitrión" },
  { value: "teacher",       label: "Profesor" },
  { value: "trainer",       label: "Entrenador" },
  { value: "anime",         label: "Anime" },
  { value: "video-game",    label: "Videojuegos" },
  { value: "cinematic",     label: "Cinematográfico" },
  { value: "documentary",   label: "Documental" },
  { value: "radio",         label: "Radio" },
  { value: "podcast",       label: "Podcast" },
];

const QUALITIES_INITIAL_COUNT = 8;

const ELEVEN_USE_CASE_OPTIONS = [
  { value: "conversational",        label: "Conversacional" },
  { value: "narrative_story",       label: "Narración" },
  { value: "characters_animation",  label: "Personajes" },
  { value: "social_media",          label: "Redes Sociales" },
  { value: "entertainment_tv",      label: "Entretenimiento" },
  { value: "advertisement",         label: "Publicidad" },
  { value: "informative_educational", label: "Educativo" },
];

type ElevenFilters = { gender: string; age: string; useCase: string };
const EMPTY_ELEVEN_FILTERS: ElevenFilters = { gender: "", age: "", useCase: "" };

function ElevenFilterPanel({
  filters,
  onChange,
  onReset,
  onClose,
  onApply,
}: {
  filters: ElevenFilters;
  onChange: (f: ElevenFilters) => void;
  onReset: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  function toggle(field: keyof ElevenFilters, value: string) {
    onChange({ ...filters, [field]: filters[field] === value ? "" : value });
  }

  function Pill({ field, value, label }: { field: keyof ElevenFilters; value: string; label: string }) {
    const active = filters[field] === value;
    return (
      <button
        onClick={() => toggle(field, value)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={
          active
            ? { background: "rgba(255,255,255,0.1)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
            : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a2a" }
        }
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="absolute inset-y-0 right-0 w-72 flex flex-col z-20 overflow-y-auto"
      style={{ background: "#0d0d0d", borderLeft: "1px solid #1a1a1a" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#1a1a1a" }}>
        <span className="text-sm font-semibold text-white">Filtros</span>
        <div className="flex items-center gap-3">
          <button onClick={onReset} className="text-xs font-medium transition-colors" style={{ color: "#666666" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e2f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >Restablecer</button>
          <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: "#666666", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a1a")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5 flex-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#666666" }}>Género</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill field="gender" value="male"    label="Masculino" />
            <Pill field="gender" value="female"  label="Femenina" />
            <Pill field="gender" value="neutral" label="Neutral" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#666666" }}>Edad</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill field="age" value="young"       label="Joven" />
            <Pill field="age" value="middle_aged" label="Mediana Edad" />
            <Pill field="age" value="old"         label="Mayor" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#666666" }}>Caso de Uso</p>
          <div className="flex flex-wrap gap-1.5">
            {ELEVEN_USE_CASE_OPTIONS.map(({ value, label }) => (
              <Pill key={value} field="useCase" value={value} label={label} />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t flex-shrink-0" style={{ borderColor: "#1a1a1a" }}>
        <button
          onClick={onApply}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#ffffff" }}
        >
          Aplicar filtros
        </button>
      </div>
    </div>
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
  const [showAllQualities, setShowAllQualities] = useState(false);

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
            ? { background: "rgba(255,255,255,0.1)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
            : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a2a" }
        }
      >
        {label}
      </button>
    );
  }

  const visibleQualities = showAllQualities ? QUALITY_OPTIONS : QUALITY_OPTIONS.slice(0, QUALITIES_INITIAL_COUNT);

  return (
    <div
      className="absolute inset-y-0 right-0 w-72 flex flex-col z-20 overflow-y-auto"
      style={{ background: "#0d0d0d", borderLeft: "1px solid #1a1a1a" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#1a1a1a" }}>
        <span className="text-sm font-semibold text-white">Filtros</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-xs font-medium transition-colors"
            style={{ color: "#666666" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e2f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            Restablecer
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: "#666666", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a1a")}
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
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#666666" }}>Género</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill filterKey="genders" value="male" label="Masculino" />
            <Pill filterKey="genders" value="female" label="Femenina" />
            <Pill filterKey="genders" value="neutral" label="Neutral" />
          </div>
        </div>

        {/* Edad */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#666666" }}>Edad</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill filterKey="ages" value="young" label="Joven" />
            <Pill filterKey="ages" value="middleage" label="Mediana Edad" />
            <Pill filterKey="ages" value="old" label="Antiguo" />
          </div>
        </div>

        {/* Caso de Uso */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#666666" }}>Caso de Uso</p>
          <div className="flex flex-wrap gap-1.5">
            {USE_CASE_OPTIONS.map(({ value, label }) => (
              <Pill key={value} filterKey="useCases" value={value} label={label} />
            ))}
          </div>
        </div>

        {/* Calidades de Voz */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>Calidades de Voz</p>
            {filters.qualities.length > 0 && (
              <button
                onClick={() => onChange({ ...filters, qualities: [] })}
                className="text-xs transition-colors"
                style={{ color: "#666666" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e2f0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
              >
                Borrar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleQualities.map(({ value, label }) => (
              <Pill key={value} filterKey="qualities" value={value} label={label} />
            ))}
          </div>
          {QUALITY_OPTIONS.length > QUALITIES_INITIAL_COUNT && (
            <button
              onClick={() => setShowAllQualities((p) => !p)}
              className="mt-2.5 text-xs transition-colors"
              style={{ color: "#aaaaaa" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#aaaaaa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#aaaaaa")}
            >
              {showAllQualities ? "Mostrar menos ↑" : `Mostrar más (${QUALITY_OPTIONS.length - QUALITIES_INITIAL_COUNT} más) ↓`}
            </button>
          )}
        </div>
      </div>

      {/* Apply button */}
      <div className="px-4 py-4 border-t flex-shrink-0" style={{ borderColor: "#1a1a1a" }}>
        <button
          onClick={onApply}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#ffffff" }}
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}

function VoiceCard({
  voice,
  previewingId,
  previewLoadingId,
  onPreview,
  onUse,
  isFavorite,
  onToggleFavorite,
}: {
  voice: FishVoice;
  previewingId: string | null;
  previewLoadingId: string | null;
  onPreview: (id: string, sampleUrl?: string) => void;
  onUse: (voice: FishVoice) => void;
  isFavorite: boolean;
  onToggleFavorite: (voice: FishVoice) => void;
}) {
  const g = getGender(voice.tags);
  const age = getAge(voice.tags);
  const isPreviewing = previewingId === voice._id;
  const isPreviewLoading = previewLoadingId === voice._id;

  const pillStyle = { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" };
  const authorName = voice.author?.nickname;
  const sampleUrl = voice.samples?.[0]?.audio;

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
        {/* Favorite button — top-right corner */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(voice); }}
          className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-lg transition-all z-10"
          style={{ background: "rgba(0,0,0,0.4)" }}
          title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <HeartIcon filled={isFavorite} />
        </button>

        {/* Top: avatar + name/author/description */}
        <div className="flex gap-3 mb-3">
          <VoiceAvatar name={voice.title} coverImage={voice.cover_image ?? undefined} size="xl" id={voice._id} />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 mb-0.5 pr-8">
              <span className="text-sm font-semibold text-white truncate leading-tight">{voice.title}</span>
            </div>
            {authorName && (
              <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>· {authorName}</p>
            )}
            {voice.description && (
              <p className="text-xs line-clamp-2" style={{ color: "#666666" }}>{voice.description}</p>
            )}
          </div>
        </div>

        {/* Pills */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {voice.languages.slice(0, 2).map((l) => (
            <span key={l} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>
              <span className={`fi fi-${langFlag(l)}`} style={{ width: "14px", height: "11px", display: "inline-block", borderRadius: "2px" }} />
              <span>{l.toUpperCase()}</span>
            </span>
          ))}
          {g && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>
              {g === "male" ? "Masculino" : "Femenino"}
            </span>
          )}
          {age && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={pillStyle}>{age}</span>
          )}
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

      {/* Hover overlay — bottom gradient with action buttons */}
      <div
        className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-2 justify-end items-center"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(voice._id, sampleUrl); }}
          disabled={isPreviewLoading}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
          style={{
            background: isPreviewing ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)",
            color: isPreviewing ? "#aaaaaa" : "#e2e2f0",
            border: `1px solid ${isPreviewing ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.15)"}`,
            backdropFilter: "blur(4px)",
          }}
        >
          {isPreviewLoading ? "···" : isPreviewing ? "⏹ Stop" : "▶ Vista previa"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUse(voice); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: "#ffffff", color: "#000000" }}
        >
          Usar →
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
  voiceListEndpoint,
  showExternalFilters,
  defaultLanguage,
}: {
  clonedVoices: ClonedVoice[];
  onSelect: (v: SelectedVoice | null) => void;
  onClose: () => void;
  plan?: string;
  voiceListEndpoint?: string;
  showExternalFilters?: boolean;
  defaultLanguage?: string;
}) {
  const isExternalSource = !!voiceListEndpoint;
  const effectiveEndpoint = voiceListEndpoint ?? "/api/fish-voices";

  const [tab, setTab] = useState<"recent" | "explore" | "default" | "favorites" | "cloned">("explore");
  const [language, setLanguage] = useState(isExternalSource ? "" : (defaultLanguage ?? "es"));
  const [accent, setAccent] = useState("all");
  const [availableAccents, setAvailableAccents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publicVoices, setPublicVoices] = useState<FishVoice[]>([]);
  const [accentNotEnough, setAccentNotEnough] = useState(false);
  const [recentVoices, setRecentVoices] = useState<FishVoice[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteVoices, setFavoriteVoices] = useState<FavoriteVoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  // Refs for progressive accumulation when advanced filters are active
  const tierRawRef = useRef<FishVoice[]>([]);
  const tierFishPageRef = useRef(1);
  const tierHasMoreRef = useRef(true);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [elevenFilters, setElevenFilters] = useState<ElevenFilters>(EMPTY_ELEVEN_FILTERS);
  const [appliedElevenFilters, setAppliedElevenFilters] = useState<ElevenFilters>(EMPTY_ELEVEN_FILTERS);
  const [featuredVoices, setFeaturedVoices] = useState<FishVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enrichedVoices, setEnrichedVoices] = useState<Map<string, FishVoice>>(new Map());
  const [enrichingFavorites, setEnrichingFavorites] = useState(false);
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

  const activeFilterCount = isExternalSource
    ? [elevenFilters.gender, elevenFilters.age, elevenFilters.useCase].filter(Boolean).length
    : filters.genders.length + filters.ages.length + filters.useCases.length + filters.qualities.length;

  // Reset filters when the endpoint changes (e.g. provider switch while browser is open)
  useEffect(() => {
    setLanguage(isExternalSource ? "" : (defaultLanguage ?? "es"));
    setAccent("all");
    setAvailableAccents([]);
    setElevenFilters(EMPTY_ELEVEN_FILTERS);
    setAppliedElevenFilters(EMPTY_ELEVEN_FILTERS);
    setPage(1);
    setPublicVoices([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceListEndpoint]);

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

  // Enrich favorites with full voice data from publicVoices pool or individual API calls
  useEffect(() => {
    if (favoriteVoices.length === 0) {
      setEnrichedVoices(new Map());
      return;
    }
    const allKnown = new Map<string, FishVoice>();
    [...publicVoices, ...featuredVoices, ...DEFAULT_VOICES].forEach((v) => allKnown.set(v._id, v));

    const missingIds = favoriteVoices.filter((f) => !allKnown.has(f.voiceId)).map((f) => f.voiceId);

    if (missingIds.length === 0) {
      const m = new Map<string, FishVoice>();
      favoriteVoices.forEach((f) => { const v = allKnown.get(f.voiceId); if (v) m.set(f.voiceId, v); });
      setEnrichedVoices(m);
      return;
    }

    setEnrichingFavorites(true);
    Promise.all(
      missingIds.map((id) =>
        fetch(`/api/fish-voice/${id}`)
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then((results) => {
      results.forEach((v: FishVoice | null) => { if (v?._id) allKnown.set(v._id, v); });
      const m = new Map<string, FishVoice>();
      favoriteVoices.forEach((f) => { const v = allKnown.get(f.voiceId); if (v) m.set(f.voiceId, v); });
      setEnrichedVoices(m);
    }).finally(() => setEnrichingFavorites(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteVoices]);

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
    if (isExternalSource) {
      setAppliedElevenFilters({ ...elevenFilters });
    } else {
      setAppliedFilters({ ...filters });
    }
    setShowFilterPanel(false);
  }

  // Fetch each featured voice individually so they're always available regardless of page
  useEffect(() => {
    if (FEATURED_VOICE_IDS.length === 0 || isExternalSource) return;
    Promise.all(
      FEATURED_VOICE_IDS.map((id) =>
        fetch(`/api/fish-voice/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setFeaturedVoices(results.filter((v): v is FishVoice => v !== null && Boolean(v._id)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setAccentNotEnough(false);

    const controller = new AbortController();
    const { signal } = controller;

    async function run() {
      setLoading(true);
      const hasAppliedFilters = Object.values(appliedFilters).some((arr) => arr.length > 0);
      const needsAccumulation = hasAppliedFilters;
      try {
        if (needsAccumulation) {
          const MAX_PAGES = 20;
          const targetCount = 20; // always page 1 after reset
          const matchesCriteria = (v: FishVoice) => matchesAdvancedFilters(v, appliedFilters);
          while (tierHasMoreRef.current && tierFishPageRef.current <= MAX_PAGES) {
            if (tierRawRef.current.filter(matchesCriteria).length >= targetCount) break;

            const p = new URLSearchParams({ page: String(tierFishPageRef.current), language });
            if (debouncedSearch) p.set("search", debouncedSearch);
            if (accent !== "all") p.set("accent", accent);
            const res = await fetch(`${effectiveEndpoint}?${p}`, { signal });
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
          if (accent !== "all") p.set("accent", accent);
          if (isExternalSource) {
            if (appliedElevenFilters.gender) p.set("gender", appliedElevenFilters.gender);
            if (appliedElevenFilters.age)    p.set("age", appliedElevenFilters.age);
            if (appliedElevenFilters.useCase) p.set("use_case", appliedElevenFilters.useCase);
          }
          const res = await fetch(`${effectiveEndpoint}?${p}`, { signal });
          if (signal.aborted) return;
          const data = await res.json();
          console.log("[VoiceBrowser] fetch response:", JSON.stringify(data).slice(0, 500));
          if (!res.ok) {
            console.error("[VoiceBrowser] API error:", res.status, data);
            setPublicVoices([]);
            setTotal(0);
            return;
          }
          setPublicVoices(data.items ?? []);
          setTotal(data.total ?? 0);
          setAccentNotEnough(!isExternalSource && !!data.accentNotEnough);
          if (isExternalSource && Array.isArray(data.accents)) setAvailableAccents(data.accents);
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
  }, [tab, language, debouncedSearch, accent, appliedFilters, appliedElevenFilters]);

  // Separate effect for page navigation (no buffer reset — just slices into existing data)
  useEffect(() => {
    if (tab !== "explore" || page === 1) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function run() {
      setLoading(true);
      const hasAppliedFilters = Object.values(appliedFilters).some((arr) => arr.length > 0);
      const needsAccumulation = hasAppliedFilters;
      try {
        if (needsAccumulation) {
          const MAX_PAGES = 20;
          const targetCount = page * 20;
          const matchesCriteria = (v: FishVoice) => matchesAdvancedFilters(v, appliedFilters);
          while (tierHasMoreRef.current && tierFishPageRef.current <= MAX_PAGES) {
            if (tierRawRef.current.filter(matchesCriteria).length >= targetCount) break;

            const p = new URLSearchParams({ page: String(tierFishPageRef.current), language });
            if (debouncedSearch) p.set("search", debouncedSearch);
            if (accent !== "all") p.set("accent", accent);
            const res = await fetch(`${effectiveEndpoint}?${p}`, { signal });
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
          if (accent !== "all") p.set("accent", accent);
          if (isExternalSource) {
            if (appliedElevenFilters.gender)  p.set("gender", appliedElevenFilters.gender);
            if (appliedElevenFilters.age)     p.set("age", appliedElevenFilters.age);
            if (appliedElevenFilters.useCase) p.set("use_case", appliedElevenFilters.useCase);
          }
          const res = await fetch(`${effectiveEndpoint}?${p}`, { signal });
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

  async function handlePreview(id: string, sampleUrl?: string) {
    if (previewingId === id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }
    audioRef.current?.pause();
    setPreviewingId(null);

    // Fast path: try each URL in order — sampleUrl may be stale (localStorage), so always try CDN too
    const tryPlay = (url: string) =>
      new Promise<boolean>((resolve) => {
        const audio = new Audio(url);
        let done = false;
        let tid: ReturnType<typeof setTimeout>;
        const finish = (ok: boolean) => {
          if (!done) { done = true; clearTimeout(tid); resolve(ok); }
        };
        audio.onerror = () => finish(false);
        audio.onplaying = () => {
          audio.onended = () => setPreviewingId(null);
          audioRef.current = audio;
          setPreviewingId(id);
          finish(true);
        };
        audio.play().catch(() => finish(false));
        // Only abort the URL attempt if playback hasn't started within 3 s
        tid = setTimeout(() => { audio.src = ""; finish(false); }, 3000);
      });

    const fastUrls = [
      ...(sampleUrl ? [sampleUrl] : []),
      `https://cdn.fish.audio/voices/${id}.mp3`,
    ];
    for (const url of fastUrls) {
      if (await tryPlay(url)) return;
    }

    // Slow path: generate on-demand via TTS
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

  const filteredVoices = publicVoices.filter((v) => matchesAdvancedFilters(v, appliedFilters));

  const hasActiveFilters = Object.values(appliedFilters).some((arr) => arr.length > 0);

  // When advanced filters are active, paginate the accumulated filteredVoices client-side
  const pageSlice = hasActiveFilters
    ? filteredVoices.slice((page - 1) * 20, page * 20)
    : filteredVoices;

  const applyFeatured = !isExternalSource && page === 1 && !debouncedSearch && accent === "all" && !hasActiveFilters && featuredVoices.length > 0 && (language === "es" || language === "");
  const displayedVoices = applyFeatured
    ? [
        // applyFeatured requires tier === "all", so no tier filter needed here
        ...FEATURED_VOICE_IDS
          .map((id) => featuredVoices.find((v) => v._id === id))
          .filter((v): v is FishVoice => v !== undefined),
        ...pageSlice.filter((v) => !FEATURED_VOICE_IDS.includes(v._id)),
      ]
    : pageSlice;

  const filteredRecent = recentVoices;

  const totalPages = Math.ceil(total / 20);

  const TABS = [
    { key: "recent" as const,    label: "Recientemente usadas" },
    { key: "explore" as const,   label: "Explorar" },
    { key: "default" as const,   label: "Voces Predeterminadas" },
    { key: "favorites" as const, label: `Favoritos${favoriteVoices.length > 0 ? ` (${favoriteVoices.length})` : ""}` },
    { key: "cloned" as const,    label: `Mis voces clonadas (${clonedVoices.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[90vw] max-w-5xl flex flex-col rounded-2xl border relative"
        style={{ background: "#0a0a0a", borderColor: "#1a1a1a", height: "88vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#1a1a1a" }}>
          <h2 className="text-base font-bold text-white">Seleccionar voz</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#666666", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a1a")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!isExternalSource && (
          <div className="flex border-b px-6 flex-shrink-0" style={{ borderColor: "#1a1a1a" }}>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="py-3 px-1 mr-6 text-sm font-medium transition-colors border-b-2 -mb-px"
                style={
                  tab === key
                    ? { color: "#ffffff", borderColor: "rgba(255,255,255,0.4)" }
                    : { color: "#666666", borderColor: "transparent" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

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
                      stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar voces..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-200 focus:outline-none"
                      style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
                    />
                  </div>

                  {/* Language dropdown — Fish Audio always, external only when showExternalFilters */}
                  {(!isExternalSource || showExternalFilters) && (
                    <CustomSelect
                      options={[
                        ...(isExternalSource ? [{ value: "", label: "Todos los idiomas", icon: <Globe size={16} style={{ color: "#6b7280", flexShrink: 0 }} /> }] : []),
                        ...(isExternalSource
                          ? Object.entries(LANG_MAP).map(([code, { name, flag }]) => ({
                              value: code,
                              label: name,
                              icon: <span className={`fi fi-${flag}`} style={{ width: "20px", height: "15px", display: "inline-block", borderRadius: "2px", flexShrink: 0 }} />,
                            }))
                          : LANGS.map(({ code, label, fi }) => ({
                              value: code,
                              label,
                              icon: <span className={`fi fi-${fi}`} style={{ width: "20px", height: "15px", display: "inline-block", borderRadius: "2px", flexShrink: 0 }} />,
                            }))
                        ),
                      ]}
                      value={language}
                      onChange={(v) => { setLanguage(v); setAccent("all"); }}
                      style={{ minWidth: "140px" }}
                    />
                  )}

                  {/* Accent: Spanish sub-filter for Fish Audio */}
                  {!isExternalSource && language === "es" && (
                    <CustomSelect
                      options={[
                        { value: "all", label: "Todos los acentos" },
                        { value: "spain", label: "España", icon: <span className="fi fi-es" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
                        { value: "mexico", label: "México", icon: <span className="fi fi-mx" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
                        { value: "latam", label: "Latinoamérica", icon: <span className="fi fi-un" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
                      ]}
                      value={accent}
                      onChange={(v) => setAccent(v)}
                      style={{ minWidth: "140px" }}
                    />
                  )}

                  {/* Accent: dynamic filter for external sources (ElevenLabs) */}
                  {showExternalFilters && isExternalSource && availableAccents.length > 0 && (
                    <CustomSelect
                      options={[
                        { value: "all", label: "Todos los acentos" },
                        ...availableAccents.map((a) => {
                          const flagCode = ACCENT_FLAGS[a.toLowerCase()];
                          return {
                            value: a,
                            label: a.charAt(0).toUpperCase() + a.slice(1).replace(/-/g, " "),
                            icon: flagCode
                              ? <span className={`fi fi-${flagCode}`} style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} />
                              : undefined,
                          };
                        }),
                      ]}
                      value={accent}
                      onChange={(v) => setAccent(v)}
                      style={{ minWidth: "160px" }}
                    />
                  )}

                  {/* Advanced filter button */}
                  <button
                    onClick={() => setShowFilterPanel((p) => !p)}
                    className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={
                      showFilterPanel || activeFilterCount > 0
                        ? { background: "rgba(255,255,255,0.08)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
                        : { background: "#0d0d0d", color: "#cccccc", border: "1px solid #1a1a1a" }
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
                        style={{ background: "#ffffff", color: "#000000", fontSize: "10px" }}
                      >
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Default voice row — hidden for external voice sources */}
                {!isExternalSource && (
                  <button
                    onClick={() => handleSelect(null)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border mb-2 transition-all text-left"
                    style={{ background: "#0d0d0d", borderColor: "#1a1a1a" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
                  >
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#111111" }}>🎙️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Voz por defecto</p>
                      <p className="text-xs mt-0.5" style={{ color: "#666666" }}>Se generará una voz estándar</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: "#aaaaaa" }}>Seleccionar →</span>
                  </button>
                )}

                {/* Accent not enough notice */}
                {accentNotEnough && (
                  <p className="text-xs mb-3" style={{ color: "rgba(234, 179, 8, 0.7)" }}>
                    Estamos añadiendo más voces con este acento próximamente.
                  </p>
                )}

                {/* Voice list */}
                {loading ? (
                  <div className="rounded-xl overflow-hidden mt-2" style={{ border: "1px solid #1a1a1a" }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-[72px] animate-pulse" style={{ background: i % 2 === 0 ? "#0d0d0d" : "#0b0b0b", borderBottom: "1px solid #111111" }} />
                    ))}
                  </div>
                ) : displayedVoices.length === 0 ? (
                  <p className="text-center py-16 text-sm" style={{ color: "#666666" }}>No se encontraron voces</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 p-2">
                    {displayedVoices.map((voice) => (
                      <VoiceCard
                        key={voice._id}
                        voice={voice}
                        previewingId={previewingId}
                        previewLoadingId={previewLoadingId}
                        onPreview={handlePreview}
                        onUse={handleVoiceClick}
                        isFavorite={favoriteIds.has(voice._id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6 pb-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                      style={{ background: "#0d0d0d", color: "#cccccc", border: "1px solid #1a1a1a" }}
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm" style={{ color: "#666666" }}>{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                      style={{ background: "#0d0d0d", color: "#cccccc", border: "1px solid #1a1a1a" }}
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
                {filteredRecent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24" style={{ color: "#666666" }}>
                    <svg className="mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <p className="font-medium mb-1 text-sm">Aún no has usado ninguna voz</p>
                    <p className="text-xs mb-4">Las voces que uses aparecerán aquí</p>
                    <button
                      onClick={() => setTab("explore")}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                      style={{ background: "#ffffff" }}
                    >
                      Explorar voces
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                    {filteredRecent.map((voice) => (
                      <VoiceCard
                        key={voice._id}
                        voice={voice}
                        previewingId={previewingId}
                        previewLoadingId={previewLoadingId}
                        onPreview={handlePreview}
                        onUse={handleVoiceClick}
                        isFavorite={favoriteIds.has(voice._id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Default voices tab ── */}
            {tab === "default" && (
              <div className="px-6 py-4">
                <p className="text-xs mb-4" style={{ color: "#666666" }}>Voces de calidad curadas y siempre disponibles.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                  {DEFAULT_VOICES.map((voice) => (
                    <VoiceCard
                      key={voice._id}
                      voice={voice}
                      previewingId={previewingId}
                      previewLoadingId={previewLoadingId}
                      onPreview={handlePreview}
                      onUse={handleVoiceClick}
                      isFavorite={favoriteIds.has(voice._id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Favorites tab ── */}
            {tab === "favorites" && (
              <div className="px-6 py-4">
                {favoriteVoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24" style={{ color: "#666666" }}>
                    <HeartIcon filled={false} />
                    <p className="font-medium mb-1 text-sm mt-4">No tienes voces favoritas</p>
                    <p className="text-xs mb-4">Haz clic en el corazón de cualquier voz para guardarla aquí</p>
                    <button
                      onClick={() => setTab("explore")}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                      style={{ background: "#ffffff" }}
                    >
                      Explorar voces
                    </button>
                  </div>
                ) : enrichingFavorites ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                    {Array.from({ length: favoriteVoices.length }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl animate-pulse"
                        style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", height: "152px" }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                    {favoriteVoices.map((fav) => {
                      const fullVoice: FishVoice = enrichedVoices.get(fav.voiceId) ?? {
                        _id: fav.voiceId,
                        title: fav.voiceName,
                        cover_image: fav.coverImage ?? null,
                        languages: [],
                        tags: [],
                        task_count: 0,
                      };
                      return (
                        <VoiceCard
                          key={fav.id}
                          voice={fullVoice}
                          previewingId={previewingId}
                          previewLoadingId={previewLoadingId}
                          onPreview={handlePreview}
                          onUse={handleVoiceClick}
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
                  style={{ background: "#0d0d0d", borderColor: "#1a1a1a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#111111" }}>🎙️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Voz por defecto</p>
                    <p className="text-xs mt-0.5" style={{ color: "#666666" }}>Se generará una voz estándar</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "#aaaaaa" }}>Seleccionar →</span>
                </button>

                {clonedVoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20" style={{ color: "#666666" }}>
                    <span className="text-4xl mb-3">🎤</span>
                    <p className="font-medium mb-1 text-sm">No tienes voces clonadas</p>
                    <p className="text-xs">Ve a &quot;Mis voces&quot; para clonar una</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                    {clonedVoices.map((voice) => {
                      const clonedAsFish: FishVoice = {
                        _id: voice.fishAudioModelId ?? voice.id,
                        title: voice.name,
                        description: "Voz clonada",
                        cover_image: null,
                        languages: [],
                        tags: [],
                        task_count: 0,
                      };
                      return (
                        <VoiceCard
                          key={voice.id}
                          voice={clonedAsFish}
                          previewingId={previewingId}
                          previewLoadingId={previewLoadingId}
                          onPreview={handlePreview}
                          onUse={() => voice.fishAudioModelId && handleSelect({ referenceId: voice.fishAudioModelId, name: voice.name, isCloned: true })}
                          isFavorite={false}
                          onToggleFavorite={() => {}}
                        />
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
                        className="w-full rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                        style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#d1d5db" }}
                      />
                    </div>
                    {communitySearch.length > 15 && !communitySearch.includes(" ") && (
                      <p className="text-xs mt-1.5 pl-1" style={{ color: "#4a4a65" }}>Buscando por ID de voz...</p>
                    )}
                  </div>

                  {communityLoading ? (
                    <div className="space-y-1.5">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#0d0d0d" }} />
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
                        <p className="text-xs text-center py-6" style={{ color: "#3a3a3a" }}>
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
                                background: isExact ? "rgba(124,58,237,0.06)" : "#0d0d0d",
                                borderColor: isExact ? "rgba(124,58,237,0.3)" : "#1a1a1a",
                              }}
                            >
                              <VoiceAvatarGenerative seed={voice.fishAudioModelId ?? voice.name} size={44} className="flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-semibold text-white truncate">{voice.name}</p>
                                  <span className="text-sm leading-none flex-shrink-0">{<span className={`fi fi-${voice.language}`} style={{width:"16px",height:"12px",display:"inline-block",borderRadius:"2px"}} />}</span>
                                  {voice.gender && (
                                    <span className="text-xs flex-shrink-0" style={{ color: "#3a3a3a" }}>
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
                                <p className="text-xs mt-0.5" style={{ color: "#666666" }}>por {voice.creatorName}</p>
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
            isExternalSource ? (
              <ElevenFilterPanel
                filters={elevenFilters}
                onChange={setElevenFilters}
                onReset={() => setElevenFilters(EMPTY_ELEVEN_FILTERS)}
                onClose={() => setShowFilterPanel(false)}
                onApply={handleApplyFilters}
              />
            ) : (
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_FILTERS)}
                onClose={() => setShowFilterPanel(false)}
                onApply={handleApplyFilters}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
