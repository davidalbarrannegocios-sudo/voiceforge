"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AudioPlayer } from "@/app/dashboard/AudioPlayer";
import { Clock, Trash2, Play, Download, RefreshCw, Share2, FileText } from "lucide-react";

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

interface DateGroup {
  label: string;
  items: Generation[];
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(items: Generation[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const map = new Map<string, Generation[]>();
  for (const g of items) {
    const d = new Date(g.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
    let label: string;
    if (diffDays === 0) label = "Hoy";
    else if (diffDays === 1) label = "Ayer";
    else if (diffDays <= 6) label = `Hace ${diffDays} días`;
    else label = day.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(g);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function avatarColor(name: string): string {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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
        window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
      }, 320);
      showToast(succeeded.length === 1 ? "Narración eliminada" : `${succeeded.length} narraciones eliminadas`);
    }
    if (failed > 0) showToast(`${failed} error${failed > 1 ? "es" : ""} al eliminar`, false);
    setDeletingIds((prev) => { const s = new Set(prev); ids.forEach((id) => s.delete(id)); return s; });
    setConfirmId(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  const selectableIds = generations.filter((g) => !removingIds.has(g.id)).map((g) => g.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  /* ── Compact (panel derecho TTS) ─────────────────────────── */
  if (compact) {
    const groups = groupByDate(generations);

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 50, padding: "8px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${toast.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.ok ? "#4ade80" : "#f87171" }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <select
            style={{ fontSize: "12px", color: "#9ca3af", background: "transparent", border: "none", outline: "none", cursor: "pointer", padding: 0 }}
          >
            <option value="30">Últimos 30 días</option>
            <option value="7">Últimos 7 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
          <button
            onClick={() => fetchHistory(1)}
            title="Recargar"
            style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: "72px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6b7280", gap: "8px" }}>
            <Clock size={28} />
            <p style={{ fontSize: "12px" }}>No hay generaciones aún</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {groups.map((group) => (
              <div key={group.label}>
                {/* Date label */}
                <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", fontWeight: 500 }}>{group.label}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {group.items.map((gen) => {
                    const expiry = formatExpiry(gen.expiresAt ?? null);
                    const isExpired = expiry?.expired || !gen.audioUrl;
                    const isRemoving = removingIds.has(gen.id);
                    const isDeleting = deletingIds.has(gen.id);
                    const isConfirming = confirmId === gen.id;
                    const isPlaying = playingId === gen.id;
                    const vName = gen.voiceId ?? "Voz";
                    const color = avatarColor(vName);

                    return (
                      <div
                        key={gen.id}
                        style={{ borderRadius: "12px", background: isPlaying ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)", opacity: isRemoving ? 0 : 1, transition: "opacity 300ms ease-out", padding: "10px 10px 8px" }}
                      >
                        {/* Row 1: avatar + voice name + time */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff" }}>{vName[0].toUpperCase()}</span>
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: 500, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vName}</span>
                          <span style={{ fontSize: "11px", color: "#6b7280", flexShrink: 0 }}>{formatTime(gen.createdAt)}</span>
                        </div>

                        {/* Row 2: text */}
                        <p style={{ fontSize: "11px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "8px", paddingLeft: "32px" }}>
                          {gen.text}
                        </p>

                        {/* Row 3: action buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingLeft: "32px" }}>
                          {isExpired ? (
                            <span style={{ fontSize: "10px", color: "#4b4b6a" }}>Expirado</span>
                          ) : (
                            <>
                              <button
                                onClick={() => setPlayingId(isPlaying ? null : gen.id)}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "9999px", background: isPlaying ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 500, color: isPlaying ? "#93c5fd" : "#e2e8f0" }}
                              >
                                <Play size={10} fill="currentColor" />
                                {isPlaying ? "Pause" : "Jugar"}
                              </button>
                              <a
                                href={gen.audioUrl!}
                                download={`audio-${gen.id}.mp3`}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "9999px", background: "rgba(255,255,255,0.08)", fontSize: "11px", fontWeight: 500, color: "#e2e8f0", textDecoration: "none" }}
                              >
                                <Download size={10} />
                                Descargar
                              </a>
                            </>
                          )}
                          <div style={{ flex: 1 }} />
                          <button title="Ver texto completo" style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: "2px", display: "flex", alignItems: "center" }}>
                            <FileText size={13} />
                          </button>
                          <button title="Compartir" style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: "2px", display: "flex", alignItems: "center" }}>
                            <Share2 size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmId(isConfirming ? null : gen.id)}
                            disabled={isDeleting}
                            title="Eliminar"
                            style={{ background: "none", border: "none", cursor: "pointer", color: isConfirming ? "#f87171" : "#4b5563", padding: "2px", display: "flex", alignItems: "center", opacity: isDeleting ? 0.4 : 1 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Inline confirm */}
                        {isConfirming && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", paddingLeft: "32px" }}>
                            <span style={{ fontSize: "11px", color: "#f87171", flex: 1 }}>¿Eliminar?</span>
                            <button onClick={() => setConfirmId(null)} style={{ fontSize: "11px", color: "#6b7280", background: "none", border: "1px solid #2a2a3e", borderRadius: "6px", padding: "2px 8px", cursor: "pointer" }}>
                              No
                            </button>
                            <button onClick={() => handleDelete([gen.id])} disabled={isDeleting} style={{ fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "2px 8px", cursor: "pointer", opacity: isDeleting ? 0.5 : 1 }}>
                              {isDeleting ? "..." : "Sí"}
                            </button>
                          </div>
                        )}

                        {/* Player */}
                        {isPlaying && gen.audioUrl && (
                          <div style={{ marginTop: "8px", paddingLeft: "32px" }}>
                            <AudioPlayer src={gen.audioUrl} filename={`audio-${gen.id}.mp3`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Full mode (página Historial) ────────────────────────── */
  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${toast.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.ok ? "#4ade80" : "#f87171" }}>
          {toast.msg}
        </div>
      )}

      {!compact && plan === "free" && (
        <div className="mb-5 p-3 rounded-xl flex items-start gap-3 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          <span style={{ flexShrink: 0, marginTop: "1px" }}>⚠️</span>
          <span>Tus audios expiran a las <strong>72 horas</strong>. Suscríbete para guardarlos hasta 30 días.</span>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <span className="text-sm" style={{ color: "#f87171" }}>{selected.size} seleccionada{selected.size > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#6b7280", background: "transparent", border: "1px solid #2a2a3e" }}>Cancelar</button>
            <button onClick={() => handleDelete([...selected])} disabled={deletingIds.size > 0} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
              <Trash2 size={11} /> Eliminar seleccionadas ({selected.size})
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#12121a" }} />)}
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#8888a8" }}>
          <div className="flex justify-center mb-3"><Clock size={40} style={{ color: "#8888a8" }} /></div>
          <p className="font-medium">No hay generaciones aún</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2 px-1">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectableIds))} className="rounded" style={{ accentColor: "#3b82f6", width: "14px", height: "14px", cursor: "pointer" }} />
            <span className="text-xs" style={{ color: "#4a4a65" }}>Seleccionar todo</span>
          </div>

          <div className="space-y-3">
            {generations.map((gen) => {
              const expiry = formatExpiry(gen.expiresAt ?? null);
              const isExpired = expiry?.expired || !gen.audioUrl;
              const isRemoving = removingIds.has(gen.id);
              const isDeleting = deletingIds.has(gen.id);
              const isConfirming = confirmId === gen.id;
              const isSelected = selected.has(gen.id);

              return (
                <div key={gen.id} className="rounded-xl border" style={{ background: isSelected ? "rgba(59,130,246,0.05)" : "#12121a", borderColor: isSelected ? "rgba(59,130,246,0.3)" : isExpired ? "#1e1e2e" : "#2a2a3e", opacity: isRemoving ? 0 : 1, transition: "opacity 300ms ease-out" }}>
                  <div className="p-4 flex items-start gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(gen.id)} className="mt-0.5 rounded flex-shrink-0" style={{ accentColor: "#3b82f6", width: "14px", height: "14px", cursor: "pointer" }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isExpired ? "text-gray-600" : "text-gray-300"}`}>{gen.text}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>{new Date(gen.createdAt).toLocaleDateString("es-ES")}</span>
                        <span>·</span>
                        <span>{gen.creditsUsed.toLocaleString("es-ES")} chars</span>
                        <span>·</span>
                        <span>{gen.durationSeconds.toFixed(1)}s</span>
                        {expiry && <><span>·</span><span style={{ color: expiry.expired ? "#6b7280" : expiry.label.includes("h") ? "#f59e0b" : "#4a4a65" }}>{expiry.label}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isExpired ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "#12121a", color: "#4a4a65", border: "1px solid #1e1e2e" }}>Audio expirado</span>
                      ) : (
                        <button onClick={() => setPlayingId(playingId === gen.id ? null : gen.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: playingId === gen.id ? "rgba(59,130,246,0.2)" : "#1a1a2e", color: playingId === gen.id ? "#93c5fd" : "#8888a8", border: `1px solid ${playingId === gen.id ? "rgba(59,130,246,0.3)" : "#2a2a3e"}` }}>
                          <Play size={10} />{playingId === gen.id ? "Reproduciendo" : "Reproducir"}
                        </button>
                      )}
                      <button onClick={() => setConfirmId(isConfirming ? null : gen.id)} disabled={isDeleting} className="p-1.5 rounded-lg disabled:opacity-40" style={{ background: isConfirming ? "rgba(239,68,68,0.15)" : "transparent", color: isConfirming ? "#f87171" : "#3a3a52", border: `1px solid ${isConfirming ? "rgba(239,68,68,0.3)" : "transparent"}` }} title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {isConfirming && (
                    <div className="px-3 pb-3 flex items-center gap-2">
                      <span className="text-xs flex-1" style={{ color: "#f87171" }}>¿Eliminar?</span>
                      <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#6b7280", background: "transparent", border: "1px solid #2a2a3e" }}>Cancelar</button>
                      <button onClick={() => handleDelete([gen.id])} disabled={isDeleting} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold disabled:opacity-50" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40" style={{ background: "#1a1a2e", color: "#d1d5db", border: "1px solid #2a2a3e" }}>← Anterior</button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40" style={{ background: "#1a1a2e", color: "#d1d5db", border: "1px solid #2a2a3e" }}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
