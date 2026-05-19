"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Home, Mic, Users, Clock, Check, Play, CreditCard } from "lucide-react";
import { calculateCharCost, formatDate } from "@/lib/utils";
import { VoiceBrowser, SelectedVoice } from "./VoiceBrowser";
import { AudioPlayer } from "./AudioPlayer";
import { PaymentModal, type BillingPlan } from "./PaymentModal";

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

type Tab = "home" | "generate" | "voices" | "history" | "billing";

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
  const navItems: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: "home", label: "Inicio", Icon: Home },
    { key: "generate", label: "Generar", Icon: Mic },
    { key: "voices", label: "Mis voces", Icon: Users },
    { key: "history", label: "Historial", Icon: Clock },
    { key: "billing", label: "Facturación", Icon: CreditCard },
  ];

  return (
    <aside
      className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r"
      style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}
    >
      <div className="p-5 border-b" style={{ borderColor: "#2a2a3e" }}>
        <Link href="/" className="flex items-center gap-2 mb-1">
          <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} className="rounded-lg" />
          <span className="font-bold text-white">Elite Labs</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
            style={
              activeTab === key
                ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd", borderLeft: "2px solid #3b82f6" }
                : { color: "#8888a8" }
            }
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Characters */}
      <div className="p-4 border-t" style={{ borderColor: "#2a2a3e" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">Caracteres disponibles</span>
          <Link href="/pricing" className="text-xs font-medium" style={{ color: "#3b82f6" }}>
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
              width: `${Math.min(100, ((credits ?? 0) / 1400000) * 100)}%`,
              background: "linear-gradient(90deg, #3b82f6, #2563eb)",
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

/* ─── Home Tab ────────────────────────────────────────────── */
function HomeTab({
  user,
  credits,
  setActiveTab,
}: {
  user: { firstName?: string | null } | null | undefined;
  credits: number | null;
  setActiveTab: (t: Tab) => void;
}) {
  const cards: { key: Tab; Icon: React.ElementType; title: string; desc: string }[] = [
    { key: "generate", Icon: Mic, title: "Texto a Voz", desc: "Convierte texto en voz natural al instante" },
    { key: "voices", Icon: Users, title: "Mis Voces", desc: "Gestiona y clona tus voces personalizadas" },
    { key: "history", Icon: Clock, title: "Historial", desc: "Revisa todas tus generaciones anteriores" },
  ];

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Hola, {user?.firstName ?? "de nuevo"}
        </h1>
        <p style={{ color: "#8888a8" }}>
          Tienes{" "}
          <span className="font-semibold" style={{ color: "#93c5fd" }}>
            {credits !== null ? credits.toLocaleString("es-ES") : "—"}
          </span>{" "}
          caracteres disponibles
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ key, Icon, title, desc }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="group p-6 rounded-2xl border border-[#2a2a3e] hover:border-blue-700 text-left transition-all hover:-translate-y-0.5"
            style={{ background: "#12121a" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Icon size={20} style={{ color: "#93c5fd" }} />
            </div>
            <h3 className="font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm" style={{ color: "#8888a8" }}>{desc}</p>
          </button>
        ))}
      </div>
    </div>
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    durationSeconds: number;
    charsUsed: number;
    charsRemaining: number;
  } | null>(null);

  const charCost = calculateCharCost(text.length, selectedVoice?.isCloned ? 1.15 : 1.10);
  const clonedVoices = voices.filter((v) => !v.isSystem);

  async function handleGenerate() {
    setError(null);
    setAudioUrl(null);
    setLastResult(null);
    setLoading(true);

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
        charsUsed: data.charsUsed,
        charsRemaining: data.charsRemaining,
      });
      onGenerated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Text area */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-300 mb-2 block">Texto</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe el texto a narrar..."
          rows={6}
          className="w-full rounded-xl p-4 text-sm text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
        />
        {text.length > 0 && (
          <p className="mt-1.5 text-xs" style={{ color: "#8888a8" }}>
            Esta generación costará{" "}
            <span className="text-blue-400 font-semibold">
              {charCost.toLocaleString("es-ES")} caracteres
            </span>
            {" "}(incluye {selectedVoice?.isCloned ? "15%" : "10%"} por procesamiento y mejora de calidad de audio)
          </p>
        )}
      </div>

      {/* Voice selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-300 mb-2 block">Voz</label>
        <button
          onClick={() => setShowBrowser(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all hover:border-blue-500/60"
          style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
        >
          <div className="flex items-center gap-2.5">
            <Mic size={16} style={{ color: "#93c5fd" }} />
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
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          boxShadow: loading ? "none" : "0 4px 15px rgba(59,130,246,0.3)",
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generando audio...
          </>
        ) : (
          "Generar audio"
        )}
      </button>

      {/* Audio player */}
      {audioUrl && lastResult && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Audio generado</span>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#8888a8" }}>
              <span>{lastResult.charsUsed.toLocaleString("es-ES")} caracteres usados</span>
              <span>·</span>
              <span style={{ color: "#93c5fd" }}>{lastResult.charsRemaining.toLocaleString("es-ES")} restantes</span>
            </div>
          </div>
          <AudioPlayer src={audioUrl} filename="elitelabs-audio.mp3" />
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
          style={{ borderColor: dragging ? "#3b82f6" : "#2a2a3e", background: dragging ? "rgba(59,130,246,0.05)" : "transparent" }}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".wav,.mp3,.m4a,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {file ? (
            <div>
              <p className="text-green-400 font-medium mb-1">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-center mb-3">
                <Mic size={32} style={{ color: "#8888a8" }} />
              </div>
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
            className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            style={{ background: "#0a0a0f", border: "1px solid #2a2a3e" }}
          />
        </div>

        <p className="text-xs text-gray-500 mb-4">La clonación es gratuita</p>

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
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
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
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            + Clonar nueva voz
          </button>
        </div>

        {cloned.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#8888a8" }}>
            <div className="flex justify-center mb-3">
              <Mic size={40} style={{ color: "#8888a8" }} />
            </div>
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                    <Mic size={14} style={{ color: "#93c5fd" }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUseVoice({ referenceId: voice.fishAudioModelId ?? "", name: voice.name, isCloned: true })}
                    disabled={!voice.fishAudioModelId}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}
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
          <div className="flex justify-center mb-3">
            <Clock size={40} style={{ color: "#8888a8" }} />
          </div>
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
                      <span>{gen.creditsUsed.toLocaleString("es-ES")} chars</span>
                      <span>·</span>
                      <span>{gen.durationSeconds.toFixed(1)}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPlayingId(playingId === gen.id ? null : gen.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: playingId === gen.id ? "rgba(59,130,246,0.2)" : "#1a1a2e",
                        color: playingId === gen.id ? "#93c5fd" : "#8888a8",
                        border: `1px solid ${playingId === gen.id ? "rgba(59,130,246,0.3)" : "#2a2a3e"}`,
                      }}
                    >
                      <Play size={11} />
                      {playingId === gen.id ? "Reproduciendo" : "Reproducir"}
                    </button>
                  </div>
                </div>
                {playingId === gen.id && (
                  <div className="mt-3">
                    <AudioPlayer src={gen.audioUrl} filename={`elitelabs-${gen.id}.mp3`} />
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

/* ─── Billing Tab ────────────────────────────────────────── */
const BILLING_PLANS = [
  {
    key: "basico",
    name: "Básico",
    price: 6,
    characters: 250_000,
    popular: false,
    features: ["250.000 caracteres", "Explorar voces públicas", "Clonación de voz"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 12,
    characters: 600_000,
    popular: true,
    features: ["600.000 caracteres", "Explorar voces públicas", "Clonación de voz ilimitada", "Generación prioritaria"],
  },
  {
    key: "premium",
    name: "Premium",
    price: 24,
    characters: 1_400_000,
    popular: false,
    features: ["1.400.000 caracteres", "Explorar voces públicas", "Clonación de voz ilimitada", "Soporte preferente"],
  },
] as const;

function BillingTab({
  credits,
  userEmail,
  onPaymentSuccess,
}: {
  credits: number | null;
  userEmail?: string;
  onPaymentSuccess: () => void;
}) {
  const [activePlan, setActivePlan] = useState<BillingPlan | null>(null);

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-white mb-6">Facturación</h2>

      {/* Current balance card */}
      <div
        className="rounded-xl border p-5 mb-8 flex items-center justify-between gap-4"
        style={{ background: "#12121a", borderColor: "#2a2a3e" }}
      >
        <div>
          <p className="text-xs text-gray-500 mb-1">Saldo actual</p>
          <p className="text-2xl font-bold text-white">
            {credits !== null ? credits.toLocaleString("es-ES") : "—"}
            <span className="text-base font-normal text-gray-400 ml-2">caracteres</span>
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.15)" }}
        >
          <CreditCard size={18} style={{ color: "#93c5fd" }} />
        </div>
      </div>

      {/* Recharge section */}
      <p className="text-sm font-semibold text-gray-300 mb-4">Recargar caracteres</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BILLING_PLANS.map((plan) => (
          <div
            key={plan.key}
            className="relative rounded-xl border flex flex-col p-5"
            style={{
              background: plan.popular ? "rgba(59,130,246,0.08)" : "#12121a",
              borderColor: plan.popular ? "#3b82f6" : "#2a2a3e",
            }}
          >
            {plan.popular && (
              <div
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-3 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
              >
                POPULAR
              </div>
            )}

            <div className="mb-4">
              <p className="font-semibold text-white mb-1">{plan.name}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}€</span>
                <span className="text-xs text-gray-500">pago único</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {plan.characters.toLocaleString("es-ES")} caracteres
              </p>
            </div>

            <ul className="space-y-1.5 flex-1 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <Check size={11} style={{ color: "#93c5fd", flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setActivePlan(plan)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 flex items-center justify-center"
              style={
                plan.popular
                  ? { background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "white", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }
                  : { background: "#1a1a2e", color: "#d1d5db", border: "1px solid #2a2a3e" }
              }
            >
              Comprar
            </button>
          </div>
        ))}
      </div>

      {activePlan && (
        <PaymentModal
          plan={activePlan}
          userEmail={userEmail}
          onClose={() => setActivePlan(null)}
          onSuccess={() => {
            setActivePlan(null);
            onPaymentSuccess();
          }}
        />
      )}
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [credits, setCredits] = useState<number | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);

  const fetchCredits = useCallback(async () => {
    const res = await fetch("/api/credits");
    const data = await res.json();
    setCredits(data.characters);
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

  const successChars = searchParams.get("characters");

  function handleUseVoice(voice: SelectedVoice) {
    setSelectedVoice(voice);
    setActiveTab("generate");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar credits={credits} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 overflow-auto">
        {successChars && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium text-sm">
              ¡Compra completada! Se han añadido <strong>{parseInt(successChars).toLocaleString("es-ES")} caracteres</strong> a tu cuenta.
            </p>
          </div>
        )}

        {activeTab === "home" && (
          <HomeTab user={user} credits={credits} setActiveTab={setActiveTab} />
        )}
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
        {activeTab === "billing" && (
          <BillingTab
            credits={credits}
            userEmail={user?.emailAddresses[0]?.emailAddress}
            onPaymentSuccess={fetchCredits}
          />
        )}
      </main>
    </div>
  );
}
