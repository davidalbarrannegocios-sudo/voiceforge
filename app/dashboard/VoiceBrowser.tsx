"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface SelectedVoice {
  referenceId: string;
  name: string;
  isCloned: boolean;
}

interface FishVoice {
  _id: string;
  title: string;
  languages: string[];
  tags: string[];
  cover_image: string;
  task_count: number;
}

interface ClonedVoice {
  id: string;
  name: string;
  fishAudioModelId?: string;
}

// Voice IDs available on the free plan — add/remove IDs to control which voices are free
export const FREE_VOICE_IDS = new Set([
  "dfa5b230c8054f429e434f4a6e9bbdec",
  "35199d5438854f5d9157c500479ab684",
  "acc8237220d8470985ec9be6c4c480a9",
  "a84bb566446e4eca8e631cd8dd41a5f5",
  "bfed5c0810a347dbb62e8ccce7f59c48",
  "17ed67335f0145c9a850fddecd3c40e0",
  "24b0be469dae4902bb8f7736813a55f3",
  "9ad11f55731145f4972f80557a89ce41",
  "cd803cbf78a4454fa98b601abbf8966a",
  "d047b6a8f24f4d56ba818b08dbd9d089",
  "05100dcc9dfd4af49ea96dc5affbe5b1",
  "40b173f0b3ad45e58f5cbbd615bfbe39",
  "8b6d1f02193f4f4daabad86ad090da9d",
  "0b2aa74c364a49789bcba051f2901a5c",
  "f9488c0dd5b84b748fd51c6deda08846",
  "d4ea43a56f5a42f1959ec7846a4fb59b",
  "4cfbaba676d04b428cfbcb5b44b569d6",
  "fb146e57407540f0be6863063d94bea5",
]);

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

const LANGS = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
  { code: "fr", label: "FR" },
  { code: "zh", label: "ZH" },
  { code: "ja", label: "JA" },
];

const cardStyle = { background: "#12121a", borderColor: "#2a2a3e" };
const avatarGradient = { background: "linear-gradient(135deg, #3b82f6, #2563eb)" };

function VoiceAvatar({ name, coverImage }: { name: string; coverImage?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name[0]?.toUpperCase() ?? "?";

  if (coverImage && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverImage}
        alt=""
        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={avatarGradient}
    >
      {initial}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
  color = "purple",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: "purple" | "blue" | "amber";
}) {
  const styles =
    color === "purple"
      ? active
        ? { background: "rgba(59,130,246,0.25)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.5)" }
        : { background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }
      : color === "blue"
      ? active
        ? { background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.35)" }
        : { background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }
      : active
      ? { background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.4)" }
      : { background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" };

  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={styles}
    >
      {children}
    </button>
  );
}

function PreviewBtn({
  id,
  previewingId,
  loadingId,
  onPreview,
}: {
  id: string;
  previewingId: string | null;
  loadingId: string | null;
  onPreview: (id: string) => void;
}) {
  const isPreviewing = previewingId === id;
  const isLoading = loadingId === id;
  return (
    <button
      onClick={() => onPreview(id)}
      disabled={isLoading}
      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
      style={{
        background: isPreviewing ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.1)",
        color: "#93c5fd",
        border: "1px solid rgba(59,130,246,0.2)",
      }}
    >
      {isLoading ? "···" : isPreviewing ? "⏹ Stop" : "▶ Vista previa"}
    </button>
  );
}

function UpgradePrompt({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl p-6 w-72 text-center border mx-4"
        style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(245,158,11,0.15)" }}>
          <span className="text-2xl">🔒</span>
        </div>
        <h3 className="text-white font-bold text-base mb-1">Voz Premium</h3>
        <p className="text-sm mb-5" style={{ color: "#8888a8" }}>
          Esta voz requiere plan Starter o superior
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => router.push("/pricing")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            Ver planes
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [tab, setTab] = useState<"public" | "cloned">("public");
  const [language, setLanguage] = useState("es");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [tier, setTier] = useState<"all" | "free" | "premium">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publicVoices, setPublicVoices] = useState<FishVoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userCanUsePremium = canUsePremium(plan);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [language, gender]);

  const fetchVoices = useCallback(async () => {
    if (tab !== "public") return;
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
    handleSelect({ referenceId: voice._id, name: voice.title, isCloned: false });
  }

  const filteredVoices = publicVoices.filter((v) => {
    if (tier === "free") return !isPremiumVoice(v._id);
    if (tier === "premium") return isPremiumVoice(v._id);
    return true;
  });

  const totalPages = Math.ceil(total / 20);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-4xl flex flex-col rounded-2xl border relative"
        style={{ background: "#0d0d17", borderColor: "#2a2a3e", height: "85vh" }}
      >
        {showUpgrade && <UpgradePrompt onClose={() => setShowUpgrade(false)} />}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#2a2a3e" }}>
          <h2 className="text-lg font-bold text-white">Seleccionar voz</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 flex-shrink-0" style={{ borderColor: "#2a2a3e" }}>
          {([["public", "Voces del sistema"], ["cloned", `Mis voces clonadas (${clonedVoices.length})`]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="py-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px mr-1"
              style={tab === t ? { color: "#93c5fd", borderColor: "#3b82f6" } : { color: "#8888a8", borderColor: "transparent" }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "public" ? (
            <>
              {/* Language filters */}
              <div className="flex flex-wrap gap-2 mb-2">
                {LANGS.map(({ code, label }) => (
                  <FilterBtn key={code} active={language === code} onClick={() => setLanguage(code)}>
                    {label}
                  </FilterBtn>
                ))}
                <div className="w-px mx-1" style={{ background: "#2a2a3e" }} />
                <FilterBtn active={gender === ""} onClick={() => setGender("")} color="blue">Todos</FilterBtn>
                <FilterBtn active={gender === "male"} onClick={() => setGender("male")} color="blue">♂ Hombre</FilterBtn>
                <FilterBtn active={gender === "female"} onClick={() => setGender("female")} color="blue">♀ Mujer</FilterBtn>
              </div>

              {/* Tier filters */}
              <div className="flex flex-wrap gap-2 mb-3">
                <FilterBtn active={tier === "all"} onClick={() => setTier("all")} color="blue">Todas</FilterBtn>
                <FilterBtn active={tier === "free"} onClick={() => setTier("free")} color="blue">Gratis</FilterBtn>
                <FilterBtn active={tier === "premium"} onClick={() => setTier("premium")} color="amber">
                  ✦ Premium
                </FilterBtn>
                {!userCanUsePremium && (
                  <span className="px-2.5 py-1.5 rounded-lg text-xs" style={{ color: "#8888a8" }}>
                    Las voces premium requieren plan Starter+
                  </span>
                )}
              </div>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
              />

              {/* Default voice card */}
              <button
                onClick={() => handleSelect(null)}
                className="w-full mb-4 p-3 rounded-xl border text-left flex items-center gap-3 hover:border-blue-500/60 transition-all"
                style={cardStyle}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#1a1a2e" }}>🎙️</div>
                <div>
                  <p className="text-sm font-medium text-white">Voz por defecto</p>
                  <p className="text-xs" style={{ color: "#8888a8" }}>Se generará una voz estándar</p>
                </div>
                <span className="ml-auto text-xs" style={{ color: "#93c5fd" }}>Seleccionar →</span>
              </button>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "#12121a" }} />
                  ))}
                </div>
              ) : filteredVoices.length === 0 ? (
                <p className="text-center py-12 text-sm" style={{ color: "#8888a8" }}>No se encontraron voces</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredVoices.map((voice) => {
                    const g = getGender(voice.tags);
                    const isPremium = isPremiumVoice(voice._id);
                    const isLocked = isPremium && !userCanUsePremium;
                    return (
                      <div
                        key={voice._id}
                        className="p-3 rounded-xl border flex flex-col relative overflow-hidden"
                        style={{
                          ...cardStyle,
                          ...(isLocked ? { borderColor: "rgba(245,158,11,0.2)" } : {}),
                        }}
                      >
                        {/* Premium badge */}
                        {isPremium && (
                          <div
                            className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}
                          >
                            Starter+
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <VoiceAvatar name={voice.title} coverImage={voice.cover_image} />
                          <div className="flex-1 min-w-0 pr-12">
                            <p className="text-xs font-semibold text-white truncate">{voice.title}</p>
                            <p className="text-xs" style={{ color: "#8888a8" }}>{voice.task_count.toLocaleString()} usos</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {voice.languages.slice(0, 2).map((l) => (
                            <span key={l} className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
                              {l.toUpperCase()}
                            </span>
                          ))}
                          {g && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd" }}>
                              {g === "male" ? "♂" : "♀"}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-1.5 mt-auto">
                          <PreviewBtn id={voice._id} previewingId={previewingId} loadingId={previewLoadingId} onPreview={handlePreview} />
                          <button
                            onClick={() => handleVoiceClick(voice)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={
                              isLocked
                                ? { background: "#1e1e2e", color: "#4a4a65", border: "1px solid #2a2a3e" }
                                : { background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff" }
                            }
                          >
                            Usar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ background: "#12121a", color: "#d1d5db", border: "1px solid #2a2a3e" }}
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm" style={{ color: "#8888a8" }}>{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                    style={{ background: "#12121a", color: "#d1d5db", border: "1px solid #2a2a3e" }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Default option */}
              <button
                onClick={() => handleSelect(null)}
                className="w-full mb-4 p-3 rounded-xl border text-left flex items-center gap-3 hover:border-blue-500/60 transition-all"
                style={cardStyle}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#1a1a2e" }}>🎙️</div>
                <div>
                  <p className="text-sm font-medium text-white">Voz por defecto</p>
                  <p className="text-xs" style={{ color: "#8888a8" }}>Se generará una voz estándar</p>
                </div>
                <span className="ml-auto text-xs" style={{ color: "#93c5fd" }}>Seleccionar →</span>
              </button>

              {clonedVoices.length === 0 ? (
                <div className="text-center py-16" style={{ color: "#8888a8" }}>
                  <div className="text-4xl mb-3">🎤</div>
                  <p className="font-medium mb-1">No tienes voces clonadas</p>
                  <p className="text-sm">Ve a &quot;Mis voces&quot; para clonar una</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {clonedVoices.map((voice) => {
                    const modelId = voice.fishAudioModelId;
                    const isPreviewing = previewingId === modelId;
                    const isPreviewLoading = previewLoadingId === modelId;
                    return (
                      <div key={voice.id} className="p-3 rounded-xl border flex flex-col" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                            {voice.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{voice.name}</p>
                            <p className="text-xs" style={{ color: "#8888a8" }}>Voz clonada</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-auto">
                          {modelId && (
                            <button
                              onClick={() => handlePreview(modelId)}
                              disabled={isPreviewLoading}
                              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                              style={{
                                background: isPreviewing ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.1)",
                                color: "#93c5fd",
                                border: "1px solid rgba(59,130,246,0.2)",
                              }}
                            >
                              {isPreviewLoading ? "···" : isPreviewing ? "⏹ Stop" : "▶ Vista previa"}
                            </button>
                          )}
                          <button
                            onClick={() => modelId && handleSelect({ referenceId: modelId, name: voice.name, isCloned: true })}
                            disabled={!modelId}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
