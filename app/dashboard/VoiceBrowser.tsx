"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
const avatarGradient = { background: "linear-gradient(135deg, #7C3AED, #3B82F6)" };

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
  color?: "purple" | "blue";
}) {
  const styles =
    color === "purple"
      ? active
        ? { background: "rgba(124,58,237,0.25)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.5)" }
        : { background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }
      : active
      ? { background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.35)" }
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
        background: isPreviewing ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.1)",
        color: "#a78bfa",
        border: "1px solid rgba(124,58,237,0.2)",
      }}
    >
      {isLoading ? "···" : isPreviewing ? "⏹ Stop" : "▶ Vista previa"}
    </button>
  );
}

export function VoiceBrowser({
  clonedVoices,
  onSelect,
  onClose,
}: {
  clonedVoices: ClonedVoice[];
  onSelect: (v: SelectedVoice | null) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"public" | "cloned">("public");
  const [language, setLanguage] = useState("es");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publicVoices, setPublicVoices] = useState<FishVoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const totalPages = Math.ceil(total / 20);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-4xl flex flex-col rounded-2xl border"
        style={{ background: "#0d0d17", borderColor: "#2a2a3e", height: "85vh" }}
      >
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
              style={tab === t ? { color: "#a78bfa", borderColor: "#7C3AED" } : { color: "#8888a8", borderColor: "transparent" }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "public" ? (
            <>
              {/* Filters row */}
              <div className="flex flex-wrap gap-2 mb-3">
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

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
              />

              {/* Default voice card */}
              <button
                onClick={() => handleSelect(null)}
                className="w-full mb-4 p-3 rounded-xl border text-left flex items-center gap-3 hover:border-purple-500/60 transition-all"
                style={cardStyle}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#1a1a2e" }}>🎙️</div>
                <div>
                  <p className="text-sm font-medium text-white">Voz por defecto</p>
                  <p className="text-xs" style={{ color: "#8888a8" }}>Se generará una voz estándar</p>
                </div>
                <span className="ml-auto text-xs" style={{ color: "#a78bfa" }}>Seleccionar →</span>
              </button>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "#12121a" }} />
                  ))}
                </div>
              ) : publicVoices.length === 0 ? (
                <p className="text-center py-12 text-sm" style={{ color: "#8888a8" }}>No se encontraron voces</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {publicVoices.map((voice) => {
                    const g = getGender(voice.tags);
                    return (
                      <div key={voice._id} className="p-3 rounded-xl border flex flex-col" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-2">
                          <VoiceAvatar name={voice.title} coverImage={voice.cover_image} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{voice.title}</p>
                            <p className="text-xs" style={{ color: "#8888a8" }}>{voice.task_count.toLocaleString()} usos</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {voice.languages.slice(0, 2).map((l) => (
                            <span key={l} className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
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
                            onClick={() => handleSelect({ referenceId: voice._id, name: voice.title, isCloned: false })}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
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
                className="w-full mb-4 p-3 rounded-xl border text-left flex items-center gap-3 hover:border-purple-500/60 transition-all"
                style={cardStyle}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#1a1a2e" }}>🎙️</div>
                <div>
                  <p className="text-sm font-medium text-white">Voz por defecto</p>
                  <p className="text-xs" style={{ color: "#8888a8" }}>Se generará una voz estándar</p>
                </div>
                <span className="ml-auto text-xs" style={{ color: "#a78bfa" }}>Seleccionar →</span>
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
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)" }}>
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
                                background: isPreviewing ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.1)",
                                color: "#a78bfa",
                                border: "1px solid rgba(124,58,237,0.2)",
                              }}
                            >
                              {isPreviewLoading ? "···" : isPreviewing ? "⏹ Stop" : "▶ Vista previa"}
                            </button>
                          )}
                          <button
                            onClick={() => modelId && handleSelect({ referenceId: modelId, name: voice.name, isCloned: true })}
                            disabled={!modelId}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
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
