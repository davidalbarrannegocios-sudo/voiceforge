"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Trash2, Play, Pause, Download, RefreshCw, FileText, Copy, Check, Loader } from "lucide-react";
import { VoiceAvatarGenerative } from "@/components/VoiceAvatarGenerative";
import { useLang } from "@/app/dashboard/LanguageContext";
import { downloadAudio, generateAudioFilename } from "@/lib/downloadAudio";

interface PendingJob {
  jobId: string;
  voiceName: string;
  voiceId: string;
  text: string;
  createdAt: number; // unix ms
  errorMsg?: string;
}

interface Generation {
  id: string;
  status: string;
  text: string;
  audioUrl: string | null;
  creditsUsed: number;
  durationSeconds: number | null;
  voiceId: string;
  voiceName: string | null;
  error: string | null;
  createdAt: string;
  expiresAt: string | null;
  inputText?: string;
}

interface DateGroup {
  label: string;
  items: Generation[];
}

interface ExpiryLabels {
  expired: string;
  inDay: string;
  inDays: string;
  inHours: string;
}

function formatExpiry(expiresAt: string | null, labels: ExpiryLabels): { label: string; expired: boolean } | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: labels.expired, expired: true };
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  const d = Math.floor(h / 24);
  if (d >= 1) return { label: d === 1 ? labels.inDay : labels.inDays.replace("{d}", String(d)), expired: false };
  return { label: labels.inHours.replace("{h}", String(h)), expired: false };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

interface DateLabels {
  today: string;
  yesterday: string;
  daysAgo: string;
  locale: string;
}

function groupByDate(items: Generation[], labels: DateLabels): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const map = new Map<string, Generation[]>();
  for (const g of items) {
    const d = new Date(g.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
    let label: string;
    if (diffDays === 0) label = labels.today;
    else if (diffDays === 1) label = labels.yesterday;
    else if (diffDays <= 6) label = labels.daysAgo.replace("{n}", String(diffDays));
    else label = day.toLocaleDateString(labels.locale, { day: "numeric", month: "short" });

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(g);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function fmtMSS(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

const HISTORY_EVENT = "audio-history-changed";

const LANG_LOCALE: Record<string, string> = {
  es: "es-ES", en: "en-US", fr: "fr-FR", de: "de-DE", pt: "pt-BR",
};

export default function AudioHistoryList({
  plan = "free",
  compact = false,
}: {
  plan?: string;
  compact?: boolean;
}) {
  const { t, lang } = useLang();
  const locale = LANG_LOCALE[lang] ?? "es-ES";

  const expiryLabels: ExpiryLabels = {
    expired: t.history.audioExpired,
    inDay: t.history.expiresInDay,
    inDays: t.history.expiresInDays,
    inHours: t.history.expiresInHours,
  };

  const dateLabels: DateLabels = {
    today: t.history.today,
    yesterday: t.history.yesterday,
    daysAgo: t.history.daysAgo,
    locale,
  };

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
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [openTranscripts, setOpenTranscripts] = useState<Set<string>>(new Set());
  const [cleanedIds, setCleanedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const pendingIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pageRef = useRef(page);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationsRef = useRef<Generation[]>([]);
  generationsRef.current = generations;
  const [playTime, setPlayTime] = useState<{ current: number; duration: number }>({ current: 0, duration: 0 });

  useEffect(() => { pageRef.current = page; }, [page]);

  function removePendingFromStorage(jobId: string) {
    try {
      const existing: PendingJob[] = JSON.parse(localStorage.getItem("pendingTtsJobs") || "[]");
      localStorage.setItem("pendingTtsJobs", JSON.stringify(existing.filter((j) => j.jobId !== jobId)));
    } catch { /* ignore */ }
  }

  const startPolling = useCallback((job: PendingJob) => {
    if (pendingIntervals.current[job.jobId]) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/tts-job/${job.jobId}`);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(timer);
          delete pendingIntervals.current[job.jobId];
          removePendingFromStorage(job.jobId);
          setPendingJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));
          window.dispatchEvent(new CustomEvent("audio-history-changed"));
        } else if (data.status === "error") {
          clearInterval(timer);
          delete pendingIntervals.current[job.jobId];
          removePendingFromStorage(job.jobId);
          setPendingJobs((prev) =>
            prev.map((j) => j.jobId === job.jobId ? { ...j, errorMsg: data.errorMsg ?? t.history.generateError } : j)
          );
        }
      } catch { /* network error — keep polling */ }
    }, 3000);
    pendingIntervals.current[job.jobId] = timer;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: call cleanup, recover pending jobs from localStorage
  useEffect(() => {
    fetch("/api/tts-job/cleanup").catch(() => {});

    try {
      const stored: PendingJob[] = JSON.parse(localStorage.getItem("pendingTtsJobs") || "[]");
      const active = stored.filter((j) => Date.now() - j.createdAt < 600_000);
      localStorage.setItem("pendingTtsJobs", JSON.stringify(active));
      if (active.length > 0) {
        setPendingJobs(active);
        active.forEach((j) => startPolling(j));
      }
    } catch { /* ignore */ }

    return () => {
      Object.values(pendingIntervals.current).forEach(clearInterval);
    };
  }, [startPolling]);

  // Listen for new jobs created in the dashboard
  useEffect(() => {
    function onJobCreated(e: Event) {
      const job = (e as CustomEvent<PendingJob>).detail;
      setPendingJobs((prev) => (prev.some((j) => j.jobId === job.jobId) ? prev : [job, ...prev]));
      startPolling(job);
    }
    window.addEventListener("tts-job-created", onJobCreated);
    return () => window.removeEventListener("tts-job-created", onJobCreated);
  }, [startPolling]);

  // Poll processing generations every 3s until they resolve
  const hasProcessing = generations.some((g) => g.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(async () => {
      const pending = generationsRef.current.filter((g) => g.status === "processing");
      if (pending.length === 0) return;
      const results = await Promise.allSettled(
        pending.map((g) => fetch(`/api/generation/${g.id}`).then((r) => r.json()))
      );
      setGenerations((prev) => {
        let changed = false;
        const next = prev.map((g) => {
          const idx = pending.findIndex((p) => p.id === g.id);
          if (idx === -1) return g;
          const res = results[idx];
          if (res.status === "fulfilled" && res.value.status !== "processing") {
            changed = true;
            return {
              ...g,
              status: res.value.status,
              audioUrl: res.value.audioUrl ?? g.audioUrl,
              durationSeconds: res.value.durationSeconds ?? g.durationSeconds,
              error: res.value.error ?? g.error,
            };
          }
          return g;
        });
        return changed ? next : prev;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [hasProcessing]);

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
      showToast(succeeded.length === 1 ? t.history.deleted : t.history.deletedMany.replace("{n}", String(succeeded.length)));
    }
    if (failed > 0) showToast(`${failed} ${t.history.generateError}`, false);
    setDeletingIds((prev) => { const s = new Set(prev); ids.forEach((id) => s.delete(id)); return s; });
    setConfirmId(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  const selectableIds = generations.filter((g) => !removingIds.has(g.id)).map((g) => g.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function handlePlayToggle(gen: Generation) {
    if (!gen.audioUrl) return;
    if (playingId === gen.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      setPlayTime({ current: 0, duration: 0 });
      return;
    }
    audioRef.current?.pause();
    setPlayTime({ current: 0, duration: 0 });
    const audio = new Audio(gen.audioUrl);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setPlayTime((p) => ({ ...p, duration: audio.duration || 0 }));
    audio.ontimeupdate = () => setPlayTime((p) => ({ ...p, current: audio.currentTime }));
    audio.onended = () => { setPlayingId(null); setPlayTime({ current: 0, duration: 0 }); };
    audio.onerror = () => { setPlayingId(null); setPlayTime({ current: 0, duration: 0 }); };
    audio.play();
    setPlayingId(gen.id);
  }

  async function handleDownload(gen: Generation) {
    if (!gen.audioUrl || downloadingId === gen.id) return
    setDownloadingId(gen.id)
    try {
      await downloadAudio(gen.audioUrl, generateAudioFilename(gen.text ?? ''))
    } finally {
      setDownloadingId(null)
    }
  }

  /* ── Compact (panel derecho TTS) ─────────────────────────── */
  if (compact) {
    const groups = groupByDate(generations, dateLabels);

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
            <p style={{ fontSize: "12px" }}>{t.history.noGenerations}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Pending job cards */}
            {pendingJobs.length > 0 && (
              <div>
                <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", fontWeight: 500 }}>{t.history.inProcess}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {pendingJobs.map((job) => (
                    <div key={job.jobId} style={{ borderRadius: "12px", background: "rgba(255,255,255,0.04)", padding: "10px 10px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <VoiceAvatarGenerative seed={job.voiceId} size={24} className="flex-shrink-0" />
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.voiceName}</span>
                        <span style={{ fontSize: "11px", color: "#6b7280", flexShrink: 0 }}>{new Date(job.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "8px", paddingLeft: "32px" }}>
                        {job.text}
                      </p>
                      <div style={{ paddingLeft: "32px" }}>
                        {job.errorMsg ? (
                          <span style={{ fontSize: "10px", color: "#f87171" }} title={job.errorMsg}>
                            {job.errorMsg.slice(0, 60)}
                          </span>
                        ) : (
                          <>
                            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6b7280" }}>
                              <svg style={{ flexShrink: 0, animation: "spin 1s linear infinite" }} width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                                <path fill="currentColor" fillOpacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {t.history.generatingAudio}
                            </span>
                            <div style={{ height: "2px", borderRadius: "9999px", background: "rgba(255,255,255,0.06)", marginTop: "6px", overflow: "hidden" }}>
                              <div className="animate-pulse" style={{ height: "100%", width: "60%", borderRadius: "9999px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.label}>
                {/* Date label */}
                <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", fontWeight: 500 }}>{group.label}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {group.items.map((gen) => {
                    const expiry = formatExpiry(gen.expiresAt ?? null, expiryLabels);
                    const isProcessing = gen.status === "processing";
                    const isStale = isProcessing && (Date.now() - new Date(gen.createdAt).getTime()) > 10 * 60 * 1000;
                    const isError = gen.status === "error" || isStale;
                    const isExpired = !isProcessing && !isError && (expiry?.expired || !gen.audioUrl);
                    const isRemoving = removingIds.has(gen.id);
                    const isDeleting = deletingIds.has(gen.id);
                    const isConfirming = confirmId === gen.id;
                    const isPlaying = playingId === gen.id;
                    const vName = gen.voiceName ?? t.history.voiceDefault;

                    return (
                      <div
                        key={gen.id}
                        style={{ borderRadius: "12px", background: isPlaying ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)", opacity: isRemoving ? 0 : 1, transition: "opacity 300ms ease-out", padding: "10px 10px 8px" }}
                      >
                        {/* Row 1: avatar + voice name + time */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <VoiceAvatarGenerative seed={gen.voiceId} size={24} className="flex-shrink-0" />
                          <span style={{ fontSize: "12px", fontWeight: 500, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vName}</span>
                          <span style={{ fontSize: "11px", color: "#6b7280", flexShrink: 0 }}>{formatTime(gen.createdAt)}</span>
                        </div>

                        {/* Row 2: text */}
                        <p style={{ fontSize: "11px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "8px", paddingLeft: "32px" }}>
                          {gen.text}
                        </p>

                        {/* Row 3: action buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingLeft: "32px", flexWrap: "nowrap", overflow: "hidden" }}>
                          {isProcessing && !isStale ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6b7280" }}>
                              <svg style={{ color: "#6b7280", flexShrink: 0, animation: "spin 1s linear infinite" }} width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                                <path fill="currentColor" fillOpacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {t.history.generating}
                            </span>
                          ) : isError ? (
                            <span style={{ fontSize: "10px", color: "#f87171" }} title={gen.error ?? undefined}>
                              {isStale ? t.history.timeout : (gen.error ? gen.error.slice(0, 60) : t.history.generateError)}
                            </span>
                          ) : isExpired ? (
                            <span style={{ fontSize: "10px", color: "#4b4b6a" }}>{t.history.expired}</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePlayToggle(gen)}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "9999px", background: "rgba(255,255,255,0.08)", border: isPlaying ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent", cursor: "pointer", fontSize: "11px", fontWeight: 500, color: isPlaying ? "#ffffff" : "#e2e8f0", transition: "all 0.15s", minWidth: 0, maxWidth: "110px", overflow: "hidden", flexShrink: 0 }}
                              >
                                {isPlaying ? (
                                  <><Pause size={10} style={{ flexShrink: 0 }} /><span style={{ fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtMSS(playTime.current)}/{fmtMSS(playTime.duration)}</span></>
                                ) : (
                                  <><Play size={10} fill="currentColor" style={{ flexShrink: 0 }} />Play</>
                                )}
                              </button>
                              <button
                                onClick={() => handleDownload(gen)}
                                disabled={downloadingId === gen.id}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "9999px", background: "rgba(255,255,255,0.08)", fontSize: "11px", fontWeight: 500, color: "#e2e8f0", border: "none", cursor: "pointer", flexShrink: 0, opacity: downloadingId === gen.id ? 0.7 : 1 }}
                              >
                                {downloadingId === gen.id
                                  ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} /> {t.history?.downloading || 'Descargando...'}</>
                                  : <><Download size={10} /> {t.voices.download}</>
                                }
                              </button>
                            </>
                          )}
                          <div style={{ flex: 1 }} />
                          <button
                            title="Ver transcript"
                            onClick={() => setOpenTranscripts((prev) => { const s = new Set(prev); if (s.has(gen.id)) s.delete(gen.id); else s.add(gen.id); return s; })}
                            style={{ background: "none", border: "none", cursor: "pointer", color: openTranscripts.has(gen.id) ? "#ffffff" : "#4b5563", padding: "2px", display: "flex", alignItems: "center", flexShrink: 0 }}
                          >
                            <FileText size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmId(isConfirming ? null : gen.id)}
                            disabled={isDeleting}
                            title="Eliminar"
                            style={{ background: "none", border: "none", cursor: "pointer", color: isConfirming ? "#f87171" : "#4b5563", padding: "2px", display: "flex", alignItems: "center", opacity: isDeleting ? 0.4 : 1, flexShrink: 0 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Transcript panel */}
                        {openTranscripts.has(gen.id) && gen.inputText && (
                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Transcript</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {(gen.inputText.includes("[") || gen.inputText.includes("(")) && (
                                  <button
                                    onClick={() => setCleanedIds((prev) => { const s = new Set(prev); if (s.has(gen.id)) s.delete(gen.id); else s.add(gen.id); return s; })}
                                    style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "9999px", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}
                                  >
                                    {cleanedIds.has(gen.id) ? t.history.withTags : t.history.withoutTags}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const full = gen.inputText!;
                                    const textToCopy = cleanedIds.has(gen.id)
                                      ? full.replace(/\[[^\]]+\]\s*/g, "").replace(/\([^)]+\)\s*/g, "")
                                      : full;
                                    navigator.clipboard.writeText(textToCopy);
                                    setCopied(gen.id);
                                    setTimeout(() => setCopied(null), 2000);
                                  }}
                                  title="Copiar texto"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "2px", display: "flex", alignItems: "center" }}
                                >
                                  {copied === gen.id ? <Check size={13} style={{ color: "#4ade80" }} /> : <Copy size={13} />}
                                </button>
                              </div>
                            </div>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.6", whiteSpace: "pre-wrap", maxHeight: "200px", overflowY: "auto", margin: 0 }}>
                              {cleanedIds.has(gen.id)
                                ? gen.inputText.replace(/\[[^\]]+\]\s*/g, "").replace(/\([^)]+\)\s*/g, "")
                                : gen.inputText}
                            </p>
                          </div>
                        )}

                        {/* Inline confirm */}
                        {isConfirming && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", paddingLeft: "32px" }}>
                            <span style={{ fontSize: "11px", color: "#f87171", flex: 1 }}>{t.history.confirmDelete}</span>
                            <button onClick={() => setConfirmId(null)} style={{ fontSize: "11px", color: "#6b7280", background: "none", border: "1px solid #222222", borderRadius: "6px", padding: "2px 8px", cursor: "pointer" }}>
                              {t.history.confirmNo}
                            </button>
                            <button onClick={() => handleDelete([gen.id])} disabled={isDeleting} style={{ fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "2px 8px", cursor: "pointer", opacity: isDeleting ? 0.5 : 1 }}>
                              {isDeleting ? "..." : t.history.confirmYes}
                            </button>
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
          <span>{t.history.freeExpiryBefore} <strong>{t.history.freeExpiryHours}</strong>{t.history.freeExpiryAfter}</span>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <span className="text-sm" style={{ color: "#f87171" }}>{selected.size} {selected.size === 1 ? t.history.selectedSingle : t.history.selectedPlural}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#6b7280", background: "transparent", border: "1px solid #222222" }}>{t.history.cancel}</button>
            <button onClick={() => handleDelete([...selected])} disabled={deletingIds.size > 0} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
              <Trash2 size={11} /> {t.history.deleteSelected} ({selected.size})
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#111111" }} />)}
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#8888a8" }}>
          <div className="flex justify-center mb-3"><Clock size={40} style={{ color: "#8888a8" }} /></div>
          <p className="font-medium">{t.history.noGenerations}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2 px-1">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectableIds))} className="rounded" style={{ accentColor: "#ffffff", width: "14px", height: "14px", cursor: "pointer" }} />
            <span className="text-xs" style={{ color: "#555555" }}>{t.history.selectAll}</span>
          </div>

          {/* Pending job cards — full mode */}
          {pendingJobs.length > 0 && (
            <div className="space-y-2 mb-3">
              {pendingJobs.map((job) => (
                <div key={job.jobId} className="rounded-xl border" style={{ background: "#111111", borderColor: "#1e2a3b" }}>
                  <div className="p-4 flex items-start gap-3">
                    <VoiceAvatarGenerative seed={job.voiceId} size={32} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>{job.voiceName}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "#6b7280" }}>{job.text}</p>
                      <div className="mt-2">
                        {job.errorMsg ? (
                          <span className="text-xs" style={{ color: "#f87171" }} title={job.errorMsg}>
                            {job.errorMsg.slice(0, 80)}
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7280" }}>
                              <svg style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                                <path fill="currentColor" fillOpacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {t.history.generatingAudio}
                            </span>
                            <div className="mt-1.5 overflow-hidden rounded-full" style={{ height: "2px", background: "rgba(255,255,255,0.06)" }}>
                              <div className="animate-pulse h-full rounded-full" style={{ width: "60%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {generations.map((gen) => {
              const expiry = formatExpiry(gen.expiresAt ?? null, expiryLabels);
              const isProcessing = gen.status === "processing";
              const isStale = isProcessing && (Date.now() - new Date(gen.createdAt).getTime()) > 10 * 60 * 1000;
              const isError = gen.status === "error" || isStale;
              const isExpired = !isProcessing && !isError && (expiry?.expired || !gen.audioUrl);
              const isRemoving = removingIds.has(gen.id);
              const isDeleting = deletingIds.has(gen.id);
              const isConfirming = confirmId === gen.id;
              const isSelected = selected.has(gen.id);

              return (
                <div key={gen.id} className="rounded-xl border" style={{ background: isSelected ? "rgba(255,255,255,0.04)" : "#111111", borderColor: isSelected ? "rgba(255,255,255,0.2)" : isExpired ? "#1a1a1a" : "#222222", opacity: isRemoving ? 0 : 1, transition: "opacity 300ms ease-out" }}>
                  <div className="p-4 flex items-start gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(gen.id)} className="mt-0.5 rounded flex-shrink-0" style={{ accentColor: "#ffffff", width: "14px", height: "14px", cursor: "pointer" }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isExpired ? "text-gray-600" : "text-gray-300"}`}>{gen.text}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>{new Date(gen.createdAt).toLocaleDateString(locale)}</span>
                        <span>·</span>
                        <span>{gen.creditsUsed.toLocaleString(locale)} chars</span>
                        {gen.durationSeconds != null && <><span>·</span><span>{gen.durationSeconds.toFixed(1)}s</span></>}
                        {expiry && <><span>·</span><span style={{ color: expiry.expired ? "#6b7280" : expiry.label.includes("h") ? "#f59e0b" : "#555555" }}>{expiry.label}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isProcessing && !isStale ? (
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: "#111111", color: "#6b7280", border: "1px solid #222222" }}>
                          <svg style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                            <path fill="currentColor" fillOpacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {t.history.generating}
                        </span>
                      ) : isError ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                          {isStale ? t.history.timeout : t.history.generateError}
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "#111111", color: "#555555", border: "1px solid #222222" }}>{t.history.audioExpired}</span>
                      ) : (
                        <button onClick={() => handlePlayToggle(gen)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: playingId === gen.id ? "rgba(255,255,255,0.12)" : "#1a1a1a", color: playingId === gen.id ? "#ffffff" : "#888888", border: `1px solid ${playingId === gen.id ? "rgba(255,255,255,0.4)" : "#222222"}`, transition: "all 0.15s" }}>
                          {playingId === gen.id ? (
                            <><Pause size={10} /><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMSS(playTime.current)}/{fmtMSS(playTime.duration)}</span></>
                          ) : (
                            <><Play size={10} />Play</>
                          )}
                        </button>
                      )}
                      <button onClick={() => setConfirmId(isConfirming ? null : gen.id)} disabled={isDeleting} className="p-1.5 rounded-lg disabled:opacity-40" style={{ background: isConfirming ? "rgba(239,68,68,0.15)" : "transparent", color: isConfirming ? "#f87171" : "#3a3a52", border: `1px solid ${isConfirming ? "rgba(239,68,68,0.3)" : "transparent"}` }} title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {isConfirming && (
                    <div className="px-3 pb-3 flex items-center gap-2">
                      <span className="text-xs flex-1" style={{ color: "#f87171" }}>{t.history.confirmDelete}</span>
                      <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#6b7280", background: "transparent", border: "1px solid #222222" }}>{t.history.cancel}</button>
                      <button onClick={() => handleDelete([gen.id])} disabled={isDeleting} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold disabled:opacity-50" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
                        {isDeleting ? "..." : <><Trash2 size={10} /> {t.history.delete}</>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40" style={{ background: "#1a1a1a", color: "#d1d5db", border: "1px solid #222222" }}>{t.history.prevPage}</button>
              <span className="text-sm text-gray-500">{t.history.pageOf.replace("{n}", String(page)).replace("{total}", String(totalPages))}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40" style={{ background: "#1a1a1a", color: "#d1d5db", border: "1px solid #222222" }}>{t.history.nextPage}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
