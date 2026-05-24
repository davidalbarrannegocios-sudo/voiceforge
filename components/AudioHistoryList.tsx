"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AudioPlayer } from "@/app/dashboard/AudioPlayer";
import { Clock, Trash2, Play } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Generation {
  id: string;
  text: string;
  audioUrl: string | null;
  creditsUsed: number;
  durationSeconds: number;
  voiceId: string;
  createdAt: string;
  expiresAt: string | null;
}

function formatExpiry(expiresAt: string | null): { label: string; expired: boolean } | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: "Audio expirado", expired: true };
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  const d = Math.floor(h / 24);
  if (d >= 1) return { label: `Expira en ${d} día${d === 1 ? "" : "s"}`, expired: false };
  return { label: `Expira en ${h}h`, expired: false };
}

const HISTORY_EVENT = "audio-history-changed";

export default function AudioHistoryList({
  plan = "free",
  compact = false,
}: {
  plan?: string;
  compact?: boolean;
}) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const pageRef = useRef(page);

  useEffect(() => { pageRef.current = page; }, [page]);

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

  // Cross-instance sync: re-fetch when another instance makes a change
  useEffect(() => {
    function onExternalChange() {
      const targetPage = compact ? 1 : pageRef.current;
      if (compact) setPage(1);
      fetchHistory(targetPage);
    }
    window.addEventListener(HISTORY_EVENT, onExternalChange);
    return () => window.removeEventListener(HISTORY_EVENT, onExternalChange);
  }, [fetchHistory, compact]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(ids: string[]) {
    setDeletingIds((prev) => { const s = new Set(prev); ids.forEach((id) => s.add(id)); return s; });
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/history/${id}`, { method: "DELETE" }).then((r) => r.json()))
    );
    const succeeded = ids.filter((_, i) => {
      const r = results[i];
      return r.status === "fulfilled" && (r as PromiseFulfilledResult<{ success?: boolean }>).value?.success;
    });
    const failed = ids.length - succeeded.length;

    if (succeeded.length > 0) {
      setRemovingIds((prev) => { const s = new Set(prev); succeeded.forEach((id) => s.add(id)); return s; });
      setTimeout(() => {
        setGenerations((prev) => prev.filter((g) => !succeeded.includes(g.id)));
        setRemovingIds((prev) => { const s = new Set(prev); succeeded.forEach((id) => s.delete(id)); return s; });
        setSelected((prev) => { const s = new Set(prev); succeeded.forEach((id) => s.delete(id)); return s; });
        // Notify other instances after local state is cleaned up
        window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
      }, 320);
      showToast(succeeded.length === 1 ? "Narración eliminada" : `${succeeded.length} narraciones eliminadas`);
    }
    if (failed > 0) showToast(`${failed} error${failed > 1 ? "es" : ""} al eliminar`, false);
    setDeletingIds((prev) => { const s = new Set(prev); ids.forEach((id) => s.delete(id)); return s; });
    setConfirmId(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const s = new Set(prev); if (s.has(id)) { s.delete(id); } else { s.add(id); } return s; });
  }

  const selectableIds = generations.filter((g) => !removingIds.has(g.id)).map((g) => g.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl"
          style={{
            background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${toast.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: toast.ok ? "#4ade80" : "#f87171",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Free plan banner — full mode only */}
      {!compact && plan === "free" && (
        <div className="mb-5 p-3 rounded-xl flex items-start gap-3 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          <span style={{ flexShrink: 0, marginTop: "1px" }}>⚠️</span>
          <span>Tus audios expiran a las <strong>72 horas</strong>. Suscríbete para guardarlos hasta 30 días.</span>
        </div>
      )}

      {/* Bulk delete bar — full mode only */}
      {!compact && selected.size > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <span className="text-sm" style={{ color: "#f87171" }}>{selected.size} seleccionada{selected.size > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: "#6b7280", background: "transparent", border: "1px solid #2a2a3e" }}>
              Cancelar
            </button>
            <button
              onClick={() => handleDelete([...selected])}
              disabled={deletingIds.size > 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}
            >
              <Trash2 size={11} />
              Eliminar seleccionadas ({selected.size})
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${compact ? "h-14" : "h-16"} rounded-xl animate-pulse`} style={{ background: "#12121a" }} />
          ))}
        </div>
      ) : generations.length === 0 ? (
        <div className={`text-center ${compact ? "py-10" : "py-16"}`} style={{ color: "#8888a8" }}>
          <div className="flex justify-center mb-3">
            <Clock size={compact ? 28 : 40} style={{ color: "#8888a8" }} />
          </div>
          <p className={`font-medium ${compact ? "text-xs" : ""}`}>No hay generaciones aún</p>
        </div>
      ) : (
        <>
          {/* Select all — full mode only */}
          {!compact && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(selectableIds))}
                className="rounded"
                style={{ accentColor: "#3b82f6", width: "14px", height: "14px", cursor: "pointer" }}
              />
              <span className="text-xs" style={{ color: "#4a4a65" }}>Seleccionar todo</span>
            </div>
          )}

          <div className={compact ? "space-y-2" : "space-y-3"}>
            {generations.map((gen) => {
              const expiry = formatExpiry(gen.expiresAt ?? null);
              const isExpired = expiry?.expired || !gen.audioUrl;
              const isRemoving = removingIds.has(gen.id);
              const isDeleting = deletingIds.has(gen.id);
              const isConfirming = confirmId === gen.id;
              const isSelected = !compact && selected.has(gen.id);

              return (
                <div
                  key={gen.id}
                  className="rounded-xl border"
                  style={{
                    background: isSelected ? "rgba(59,130,246,0.05)" : "#12121a",
                    borderColor: isSelected ? "rgba(59,130,246,0.3)" : isExpired ? "#1e1e2e" : "#2a2a3e",
                    opacity: isRemoving ? 0 : 1,
                    transition: "opacity 300ms ease-out",
                  }}
                >
                  <div className={`${compact ? "p-3" : "p-4"} flex items-start gap-3`}>
                    {/* Checkbox — full mode only */}
                    {!compact && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(gen.id)}
                        className="mt-0.5 rounded flex-shrink-0"
                        style={{ accentColor: "#3b82f6", width: "14px", height: "14px", cursor: "pointer" }}
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`${compact ? "text-xs" : "text-sm"} truncate ${isExpired ? "text-gray-600" : "text-gray-300"}`}>{gen.text}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>{formatDate(gen.createdAt)}</span>
                        <span>·</span>
                        <span>{gen.creditsUsed.toLocaleString("es-ES")} chars</span>
                        {!compact && (
                          <>
                            <span>·</span>
                            <span>{gen.durationSeconds.toFixed(1)}s</span>
                          </>
                        )}
                        {expiry && (
                          <>
                            <span>·</span>
                            <span style={{ color: expiry.expired ? "#6b7280" : expiry.label.includes("h") ? "#f59e0b" : "#4a4a65" }}>
                              {expiry.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isExpired ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "#12121a", color: "#4a4a65", border: "1px solid #1e1e2e" }}>
                          {compact ? "—" : "Audio expirado"}
                        </span>
                      ) : (
                        <button
                          onClick={() => setPlayingId(playingId === gen.id ? null : gen.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: playingId === gen.id ? "rgba(59,130,246,0.2)" : "#1a1a2e",
                            color: playingId === gen.id ? "#93c5fd" : "#8888a8",
                            border: `1px solid ${playingId === gen.id ? "rgba(59,130,246,0.3)" : "#2a2a3e"}`,
                          }}
                        >
                          <Play size={10} />
                          {!compact && (playingId === gen.id ? "Reproduciendo" : "Reproducir")}
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmId(isConfirming ? null : gen.id)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                        style={{
                          background: isConfirming ? "rgba(239,68,68,0.15)" : "transparent",
                          color: isConfirming ? "#f87171" : "#3a3a52",
                          border: `1px solid ${isConfirming ? "rgba(239,68,68,0.3)" : "transparent"}`,
                        }}
                        title="Eliminar narración"
                      >
                        <Trash2 size={compact ? 11 : 13} />
                      </button>
                    </div>
                  </div>

                  {/* Inline confirm */}
                  {isConfirming && (
                    <div className="px-3 pb-3 flex items-center gap-2">
                      <span className="text-xs flex-1" style={{ color: "#f87171" }}>¿Eliminar?</span>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs px-2 py-1 rounded-lg transition-colors"
                        style={{ color: "#6b7280", background: "transparent", border: "1px solid #2a2a3e" }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDelete([gen.id])}
                        disabled={isDeleting}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold transition-all disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}
                      >
                        {isDeleting ? "..." : <><Trash2 size={10} /> Eliminar</>}
                      </button>
                    </div>
                  )}

                  {!isExpired && playingId === gen.id && (
                    <div className="px-3 pb-3">
                      <AudioPlayer src={gen.audioUrl!} filename={`elitelabs-${gen.id}.mp3`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination — full mode only */}
          {!compact && totalPages > 1 && (
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
