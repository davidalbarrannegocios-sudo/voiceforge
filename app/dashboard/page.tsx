"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { calculateCredits, formatDate } from "@/lib/utils";
import { VoiceBrowser, SelectedVoice } from "./VoiceBrowser";

/* ─── Types ──────────────────────────────────────────────── */
interface Voice {
  id: string;
  name: string;
  language: string;
  isSystem: boolean;
  fishAudioModelId?: string;
  createdAt?: string;
}

interface Generation {
  id: string;
  text: string;
  audioUrl: string;
  creditsUsed: number;
  durationSeconds: number;
  voiceId: string;
  createdAt: string;
}

type Tab = "generate" | "voices" | "history";

/* ─── Sidebar ─────────────────────────────────────────────── */
function Sidebar({
  credits,
  activeTab,
  setActiveTab,
}: {
  credits: number | null;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) {
  const navItems: { key: Tab; label: string; icon: string }[] = [
    { key: "generate", label: "Generar", icon: "🎙️" },
    { key: "voices", label: "Mis voces", icon: "🔁" },
    { key: "history", label: "Historial", icon: "📋" },
  ];

  return (
    <aside
      className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r"
      style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}
    >
      <div className="p-5 border-b" style={{ borderColor: "#2a2a3e" }}>
        <Link href="/" className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)" }}
          >
            V
          </div>
          <span className="font-bold text-white">VoiceForge</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
            style={
              activeTab === item.key
                ? { background: "rgba(124,58,237,0.15)", color: "#a78bfa", borderLeft: "2px solid #7C3AED" }
                : { color: "#8888a8" }
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Credits */}
      <div className="p-4 border-t" style={{ borderColor: "#2a2a3e" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">Créditos disponibles</span>
          <Link href="/pricing" className="text-xs font-medium" style={{ color: "#7C3AED" }}>
            + Comprar
          </Link>
        </div>
        <p className="text-2xl font-bold text-white mb-2">
          {credits !== null ? credits.toLocaleString("es-ES") : "—"}
        </p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2a3e" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, ((credits ?? 0) / 1200) * 100)}%`,
              background: "linear-gradient(90deg, #7C3AED, #3B82F6)",
            }}
          />
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t flex items-center gap-3" style={{ borderColor: "#2a2a3e" }}>
        <UserButton />
        <span className="text-sm text-gray-400 truncate">Mi cuenta</span>
      </div>
    </aside>
  );
}

/* ─── Generate Tab ────────────────────────────────────────── */
function GenerateTab({
  voices,
  onGenerated,
  initialVoice,
}: {
  voices: Voice[];
  onGenerated: () => void;
  initialVoice?: SelectedVoice | null;
}) {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(initialVoice ?? null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"starting" | "generating">("starting");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    durationSeconds: number;
    creditsUsed: number;
    creditsRemaining: number;
  } | null>(null);

  const creditsNeeded = calculateCredits(text.length);
  const clonedVoices = voices.filter((v) => !v.isSystem);

  async function handleGenerate() {
    setError(null);
    setAudioUrl(null);
    setLastResult(null);
    setLoading(true);
    setLoadingStage("starting");

    const timer = setTimeout(() => setLoadingStage("generating"), 4000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          reference_id: selectedVoice?.referenceId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");
      setAudioUrl(data.audioUrl);
      setLastResult({
        durationSeconds: data.durationSeconds,
        creditsUsed: data.creditsUsed,
        creditsRemaining: data.creditsRemaining,
      });
      onGenerated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Text area */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Texto</label>
          <span className="text-xs text-gray-500">{text.length} chars</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe el texto a narrar..."
          rows={6}
          className="w-full rounded-xl p-4 text-sm text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
        />
        {text.length > 0 && (
          <p className="mt-1.5 text-xs" style={{ color: "#8888a8" }}>
            Esta generación costará{" "}
            <span className="text-purple-400 font-semibold">
              {creditsNeeded} crédito{creditsNeeded !== 1 ? "s" : ""}
            </span>
          </p>
        )}
      </div>

      {/* Voice selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-300 mb-2 block">Voz</label>
        <button
          onClick={() => setShowBrowser(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all hover:border-purple-500/60"
          style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">🎙️</span>
            <span className="text-gray-200 font-medium">
              {selectedVoice?.name ?? "Voz por defecto"}
            </span>
          </div>
          <span className="text-xs" style={{ color: "#8888a8" }}>Cambiar →</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || text.trim().length === 0}
        className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          boxShadow: loading ? "none" : "0 4px 15px rgba(124,58,237,0.3)",
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {loadingStage === "starting" ? "⏳ Conectando con Fish Audio..." : "🎙️ Generando audio..."}
          </>
        ) : (
          "Generar audio"
        )}
      </button>

      {/* Audio player */}
      {audioUrl && lastResult && (
        <div className="mt-6 p-4 rounded-xl border" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Audio generado</span>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{lastResult.durationSeconds.toFixed(1)}s</span>
              <span>·</span>
              <span>{lastResult.creditsUsed} crédito{lastResult.creditsUsed !== 1 ? "s" : ""} usados</span>
              <span>·</span>
              <span style={{ color: "#a78bfa" }}>{lastResult.creditsRemaining} restantes</span>
            </div>
          </div>
          <audio controls src={audioUrl} className="w-full mb-3" />
          <a
            href={audioUrl}
            download="voiceforge-audio.mp3"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "#1a1a2e", color: "#a78bfa", border: "1px solid #2a2a3e" }}
          >
            Descargar audio
          </a>
        </div>
      )}

      {/* VoiceBrowser modal */}
      {showBrowser && (
        <VoiceBrowser
          clonedVoices={clonedVoices}
          onSelect={setSelectedVoice}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
}

/* ─── Clone Modal ─────────────────────────────────────────── */
function CloneModal({ onClose, onCloned }: { onClose: () => void; onCloned: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const allowed = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"];
    if (!allowed.includes(f.type)) {
      setError("Formato no soportado. Usa WAV, MP3 o M4A.");
      return;
    }
    setFile(f);
    setError(null);
  }

  async function handleClone() {
    if (!file || !voiceName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("voice_name", voiceName.trim());
      const res = await fetch("/api/clone", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al clonar");
      onCloned();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#12121a", border: "1px solid #2a2a3e" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Clonar nueva voz</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all mb-4"
          style={{ borderColor: dragging ? "#7C3AED" : "#2a2a3e", background: dragging ? "rgba(124,58,237,0.05)" : "transparent" }}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".wav,.mp3,.m4a,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {file ? (
            <div>
              <p className="text-green-400 font-medium mb-1">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">🎤</div>
              <p className="text-sm text-gray-400 mb-1">Arrastra tu audio aquí o haz clic</p>
              <p className="text-xs text-gray-600">WAV, MP3, M4A · Ideal: 10-30 segundos</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Nombre de la voz</label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Ej: Mi voz, Narrador masculino..."
            className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={{ background: "#0a0a0f", border: "1px solid #2a2a3e" }}
          />
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Clonar cuesta <span className="text-purple-400">10 créditos</span>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors" style={{ background: "#1a1a2e", border: "1px solid #2a2a3e" }}>
            Cancelar
          </button>
          <button
            onClick={handleClone}
            disabled={!file || !voiceName.trim() || loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {loading ? "Clonando..." : "Clonar voz"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Voices Tab ──────────────────────────────────────────── */
function VoicesTab({
  voices,
  onRefresh,
  onUseVoice,
}: {
  voices: Voice[];
  onRefresh: () => void;
  onUseVoice: (voice: SelectedVoice) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cloned = voices.filter((v) => !v.isSystem);

  async function handleDelete(voiceId: string) {
    setDeletingId(voiceId);
    try {
      await fetch(`/api/voices/${voiceId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {showModal && (
        <CloneModal
          onClose={() => setShowModal(false)}
          onCloned={() => { setShowModal(false); onRefresh(); }}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Mis voces clonadas</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            + Clonar nueva voz
          </button>
        </div>

        {cloned.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#8888a8" }}>
            <div className="text-4xl mb-3">🎤</div>
            <p className="font-medium mb-1">No tienes voces clonadas</p>
            <p className="text-sm">Clona una voz con 10 segundos de audio</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cloned.map((voice) => (
              <div key={voice.id} className="p-4 rounded-xl border" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{voice.name}</p>
                    {voice.createdAt && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(voice.createdAt)}</p>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)" }}>
                    <span className="text-sm">🎙️</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUseVoice({ referenceId: voice.fishAudioModelId ?? "", name: voice.name })}
                    disabled={!voice.fishAudioModelId}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    Usar
                  </button>
                  <button
                    onClick={() => handleDelete(voice.id)}
                    disabled={deletingId === voice.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    {deletingId === voice.id ? "..." : "Eliminar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── History Tab ─────────────────────────────────────────── */
function HistoryTab() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?page=${p}`);
      const data = await res.json();
      setGenerations(data.generations ?? []);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(page); }, [page, fetchHistory]);

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-6">Historial de generaciones</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#12121a" }} />
          ))}
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#8888a8" }}>
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No hay generaciones aún</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {generations.map((gen) => (
              <div key={gen.id} className="p-4 rounded-xl border" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{gen.text}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{formatDate(gen.createdAt)}</span>
                      <span>·</span>
                      <span>{gen.creditsUsed} crédito{gen.creditsUsed !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{gen.durationSeconds.toFixed(1)}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPlayingId(playingId === gen.id ? null : gen.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: playingId === gen.id ? "rgba(124,58,237,0.2)" : "#1a1a2e",
                        color: playingId === gen.id ? "#a78bfa" : "#8888a8",
                        border: `1px solid ${playingId === gen.id ? "rgba(124,58,237,0.3)" : "#2a2a3e"}`,
                      }}
                    >
                      {playingId === gen.id ? "▶ Reproduciendo" : "▶ Reproducir"}
                    </button>
                  </div>
                </div>
                {playingId === gen.id && (
                  <div className="mt-3">
                    <audio controls src={gen.audioUrl} autoPlay className="w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: "#1a1a2e", color: "#d1d5db", border: "1px solid #2a2a3e" }}
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: "#1a1a2e", color: "#d1d5db", border: "1px solid #2a2a3e" }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [credits, setCredits] = useState<number | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);

  const fetchCredits = useCallback(async () => {
    const res = await fetch("/api/credits");
    const data = await res.json();
    setCredits(data.credits);
  }, []);

  const fetchVoices = useCallback(async () => {
    const res = await fetch("/api/voices");
    const data = await res.json();
    setVoices(data);
  }, []);

  useEffect(() => {
    fetchCredits();
    fetchVoices();
  }, [fetchCredits, fetchVoices]);

  const successCredits = searchParams.get("credits");

  function handleUseVoice(voice: SelectedVoice) {
    setSelectedVoice(voice);
    setActiveTab("generate");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar credits={credits} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 overflow-auto">
        {successCredits && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="text-green-400 text-xl">✓</span>
            <p className="text-green-400 font-medium text-sm">
              ¡Compra completada! Se han añadido <strong>{successCredits} créditos</strong> a tu cuenta.
            </p>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Hola, {user?.firstName ?? "de nuevo"} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {credits !== null ? `Tienes ${credits.toLocaleString("es-ES")} créditos disponibles` : "Cargando créditos..."}
          </p>
        </div>

        {activeTab === "generate" && (
          <GenerateTab
            voices={voices}
            onGenerated={fetchCredits}
            initialVoice={selectedVoice}
          />
        )}
        {activeTab === "voices" && (
          <VoicesTab
            voices={voices}
            onRefresh={fetchVoices}
            onUseVoice={handleUseVoice}
          />
        )}
        {activeTab === "history" && <HistoryTab />}
      </main>
    </div>
  );
}
