"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, UserButton, useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Home, Mic, Mic2, Users, Clock, Check, Play, CreditCard, Gift, Copy, Globe, FileAudio, Type, User, Lock, HelpCircle, Languages } from "lucide-react";
import { calculateCharCost, formatDate } from "@/lib/utils";
import { VoiceBrowser, SelectedVoice } from "./VoiceBrowser";
import { AudioPlayer } from "./AudioPlayer";
import { PaymentModal, type BillingPlan } from "./PaymentModal";
import { SupportModal } from "./SupportModal";
import { useLang } from "./LanguageContext";

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

type Tab = "home" | "generate" | "voices" | "history" | "billing" | "referral" | "translate" | "transcribe";

/* ─── Sidebar ─────────────────────────────────────────────── */
type NavSection = {
  label?: string;
  items: { key: Tab | "_account"; label: string; Icon: React.ElementType }[];
};

function Sidebar({
  credits,
  activeTab,
  setActiveTab,
}: {
  credits: number | null;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) {
  const { openUserProfile } = useClerk();
  const { t } = useLang();

  const sections: NavSection[] = [
    {
      items: [
        { key: "home",   label: t.nav.home,        Icon: Home },
        { key: "voices", label: t.nav.customVoice, Icon: Mic2 },
      ],
    },
    {
      label: t.nav.products,
      items: [
        { key: "generate",   label: t.nav.generate,   Icon: Type },
        { key: "transcribe", label: t.nav.transcribe,  Icon: FileAudio },
        { key: "translate",  label: t.nav.translate,   Icon: Globe },
        { key: "history",    label: t.nav.history,     Icon: Clock },
      ],
    },
    {
      label: t.nav.platform,
      items: [
        { key: "billing",   label: t.nav.billing,   Icon: CreditCard },
        { key: "referral",  label: t.nav.referrals, Icon: Gift },
        { key: "_account",  label: t.nav.account,   Icon: User },
      ],
    },
  ];

  function handleNav(key: Tab | "_account") {
    if (key === "_account") { openUserProfile(); return; }
    setActiveTab(key);
  }

  return (
    <aside
      style={{
        width: "240px",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #1e1e2e",
        background: "#0d0d17",
      }}
    >
      {/* Logo */}
      <div style={{ height: "56px", display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px", flexShrink: 0 }}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/elitelabs.png"
            alt="Elite Labs"
            width={28}
            height={28}
            style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }}
            className="rounded-lg"
          />
          <span className="font-bold text-white tracking-tight text-sm">Elite Labs</span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: "8px", paddingBottom: "8px", paddingLeft: "12px", paddingRight: "12px", overflowY: "auto" }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: si < sections.length - 1 ? "20px" : 0 }}>
            {section.label && (
              <p style={{ paddingLeft: "12px", marginBottom: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2e2e48" }}>
                {section.label}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map(({ key, label, Icon }) => {
                const isActive = key !== "_account" && activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleNav(key)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                      color: isActive ? "#93c5fd" : "#5a5a78",
                    }}
                  >
                    <Icon size={15} style={{ color: isActive ? "#93c5fd" : "#3e3e58", flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Credits — pinned to bottom */}
      <div style={{ borderTop: "1px solid #1a1a28", padding: "16px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", color: "#3a3a52", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.nav.characters}</span>
          <Link href="/pricing" style={{ fontSize: "11px", fontWeight: 700, color: "#3b82f6", textDecoration: "none" }}>
            {t.nav.buy}
          </Link>
        </div>
        <p style={{ fontSize: "20px", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
          {credits !== null ? credits.toLocaleString("es-ES") : "—"}
        </p>
        <div style={{ height: "3px", borderRadius: "999px", background: "#1a1a28", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              transition: "width 0.4s",
              width: `${Math.min(100, ((credits ?? 0) / 1_400_000) * 100)}%`,
              background: "linear-gradient(90deg, #3b82f6, #2563eb)",
            }}
          />
        </div>
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
  const { t } = useLang();

  const cards: { key: Tab; Icon: React.ElementType; title: string; desc: string }[] = [
    { key: "generate", Icon: Mic,   title: t.home.cardGenerate, desc: t.home.cardGenerateDesc },
    { key: "voices",   Icon: Users, title: t.home.cardVoices,   desc: t.home.cardVoicesDesc },
    { key: "history",  Icon: Clock, title: t.home.cardHistory,  desc: t.home.cardHistoryDesc },
  ];

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t.home.greeting} {user?.firstName ?? t.home.defaultName}
        </h1>
        <p style={{ color: "#8888a8" }}>
          <span className="font-semibold" style={{ color: "#93c5fd" }}>
            {credits !== null ? credits.toLocaleString("es-ES") : "—"}
          </span>{" "}
          {t.home.available}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

/* ─── Job types ───────────────────────────────────────────── */
interface Job {
  id: string;
  status: string;
  text: string;
  voiceId: string;
  voiceName?: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  error?: string | null;
  creditsUsed: number;
  createdAt: string;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: "Pendiente",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    processing: { label: "Generando", color: "#93c5fd", bg: "rgba(59,130,246,0.12)" },
    completed:  { label: "Listo",     color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    failed:     { label: "Error",     color: "#f87171", bg: "rgba(239,68,68,0.12)"  },
  };
  const s = map[status] ?? { label: status, color: "#8888a8", bg: "#12121a" };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ color: s.color, background: s.bg }}
    >
      {(status === "pending" || status === "processing") && (
        <svg className="animate-spin h-2.5 w-2.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {s.label}
    </span>
  );
}

/* ─── Generate Tab ────────────────────────────────────────── */
function GenerateTab({
  voices,
  onGenerated,
  initialVoice,
  plan,
}: {
  voices: Voice[];
  onGenerated: () => void;
  initialVoice?: SelectedVoice | null;
  plan: string;
}) {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(initialVoice ?? null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [normalize, setNormalize] = useState(true);
  const [rightTab, setRightTab] = useState<"ajustes" | "historial">("ajustes");
  const { t } = useLang();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const charCost = calculateCharCost(text.length);
  const clonedVoices = voices.filter((v) => !v.isSystem);
  const estimatedSeconds = Math.max(5, Math.ceil(text.trim().length / 120));
  const progress = submitting ? Math.min(92, (elapsed / estimatedSeconds) * 100) : 0;
  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!submitting) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [submitting]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        const loaded = (data.jobs ?? []).map((j: Job) =>
          j.status === "processing" && new Date(j.createdAt).getTime() < fiveMinAgo
            ? { ...j, status: "failed", error: "Generación cancelada (página recargada)" }
            : j
        );
        setJobs(loaded);
        setJobsLoaded(true);
      })
      .catch(() => setJobsLoaded(true));
  }, []);

  async function handleGenerate() {
    setFormError(null);
    setSubmitting(true);
    try {
      const prosody = (speed !== 1 || volume !== 1) ? { speed, volume, pitch: 0 } : undefined;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          reference_id: selectedVoice?.referenceId ?? undefined,
          prosody,
          normalize,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");

      const newJob: Job = {
        id: data.jobId,
        status: "completed",
        text: text.trim(),
        voiceId: selectedVoice?.referenceId ?? "default",
        voiceName: selectedVoice?.name ?? "Voz por defecto",
        audioUrl: data.audioUrl,
        durationSeconds: data.durationSeconds,
        creditsUsed: data.charCost,
        createdAt: new Date().toISOString(),
      };
      setJobs((cur) => [newJob, ...cur]);
      onGenerated();
      setText("");
      setRightTab("historial");
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>

      {/* ── LEFT: Editor ── */}
      <div className="flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
        {/* Voice header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "#2a2a3e" }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: plan === "free" ? "rgba(74,74,101,0.15)" : "rgba(59,130,246,0.15)" }}
          >
            {plan === "free"
              ? <Lock size={18} style={{ color: "#3a3a52" }} />
              : <Mic size={18} style={{ color: "#93c5fd" }} />}
          </div>
          <div className="flex-1 min-w-0">
            {plan === "free" ? (
              <>
                <p className="text-sm font-semibold truncate" style={{ color: "#3a3a52" }}>{t.generate.randomVoice}</p>
                <p className="text-xs" style={{ color: "#2e2e48" }}>{t.generate.paidOnlyLong}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white truncate">{selectedVoice?.name ?? t.generate.defaultVoice}</p>
                <p className="text-xs" style={{ color: "#8888a8" }}>{selectedVoice?.isCloned ? t.generate.clonedVoice : t.generate.systemVoice}</p>
              </>
            )}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.generate.placeholder}
          disabled={submitting}
          rows={20}
          className="w-full px-6 py-5 text-sm text-gray-200 resize-none focus:outline-none disabled:opacity-60"
          style={{ background: "#0d0d17", lineHeight: "1.75", minHeight: "400px" }}
        />

        {/* Bottom bar */}
        <div className="px-6 py-4 border-t" style={{ borderColor: "#2a2a3e" }}>
          {submitting && (
            <div className="mb-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#93c5fd" }}>Generando audio... {Math.round(progress)}%</span>
                <span style={{ color: "#8888a8" }}>{elapsedLabel}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "#2a2a3e" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, #3b82f6, #2563eb)" }}
                />
              </div>
              {text.trim().length > 3000 && (
                <p className="text-xs" style={{ color: "#8888a8" }}>
                  Los audios largos pueden tardar varios minutos
                </p>
              )}
            </div>
          )}

          {formError && (
            <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              {formError}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm" style={{ color: "#8888a8" }}>
              {text.length.toLocaleString("es-ES")} {t.generate.characters}
              {text.length > 0 && (
                <span className="ml-2 text-xs" style={{ color: "#555570" }}>
                  · {charCost.toLocaleString("es-ES")} {t.generate.credits}
                </span>
              )}
            </span>
            <button
              onClick={handleGenerate}
              disabled={submitting || text.trim().length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: submitting ? "none" : "0 4px 15px rgba(59,130,246,0.3)",
              }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.generate.generating}
                </>
              ) : (
                t.generate.generateBtn
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Settings panel ── */}
      <div className="rounded-2xl border overflow-hidden h-full" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "#2a2a3e" }}>
          {(["ajustes", "historial"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={
                rightTab === tab
                  ? { color: "#ffffff", borderBottom: "2px solid #3b82f6" }
                  : { color: "#8888a8" }
              }
            >
              {tab === "ajustes" ? t.generate.settingsTab : t.generate.historyTab}
            </button>
          ))}
        </div>

        {rightTab === "ajustes" && (
          <div className="p-5 space-y-6">
            {/* Voz */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#555570" }}>{t.generate.voiceLabel}</p>
              {plan === "free" ? (
                <div
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#0d0d17", border: "1px solid #1a1a28", cursor: "not-allowed" }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(74,74,101,0.12)" }}>
                    <Lock size={13} style={{ color: "#2e2e48" }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#2e2e48" }}>{t.generate.randomVoice}</p>
                    <p className="text-xs" style={{ color: "#1e1e30" }}>{t.generate.paidOnly}</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "#2e2e48" }}>🔒</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowBrowser(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:border-blue-500/60"
                  style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.15)" }}>
                    <Mic size={13} style={{ color: "#93c5fd" }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedVoice?.name ?? t.generate.defaultVoice}</p>
                    <p className="text-xs" style={{ color: "#8888a8" }}>{selectedVoice?.isCloned ? t.generate.clonedVoice : t.generate.systemVoice}</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "#8888a8" }}>→</span>
                </button>
              )}
            </div>

            {/* Audio controls */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>{t.generate.audioControls}</p>
              <div className="space-y-5">
                {[
                  { label: t.generate.volume, value: volume, set: setVolume, min: 0, max: 2, step: 0.1, marks: ["0", "1", "2"], def: 1 },
                  { label: t.generate.speed, value: speed, set: setSpeed, min: 0.5, max: 2, step: 0.1, marks: ["0.5", "1", "2"], def: 1 },
                ].map(({ label, value, set, min, max, step, marks, def }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">{label}</span>
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{
                          color: value !== def ? "#93c5fd" : "#8888a8",
                          background: value !== def ? "rgba(59,130,246,0.12)" : "transparent",
                        }}
                      >
                        {value.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={value}
                      onChange={(e) => set(parseFloat(e.target.value))}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: "#3b82f6", background: "#2a2a3e" }}
                    />
                    <div className="flex justify-between mt-1 text-xs" style={{ color: "#555570" }}>
                      {marks.map((m) => <span key={m}>{m}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Normalization toggle */}
            <div className="border-t pt-5" style={{ borderColor: "#2a2a3e" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300">Normalización de volumen</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8888a8" }}>Iguala el volumen del audio</p>
                </div>
                <button
                  onClick={() => setNormalize((v) => !v)}
                  className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                  style={{ background: normalize ? "#3b82f6" : "#2a2a3e" }}
                  aria-pressed={normalize}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                    style={{ left: normalize ? "calc(100% - 1.25rem)" : "4px" }}
                  />
                </button>
              </div>
            </div>

            {(speed !== 1 || volume !== 1) && (
              <button
                onClick={() => { setSpeed(1); setVolume(1); }}
                className="text-xs transition-colors"
                style={{ color: "#8888a8" }}
              >
                Restablecer valores
              </button>
            )}
          </div>
        )}

        {rightTab === "historial" && (
          <div className="p-4">
            {!jobsLoaded ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#12121a" }} />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: "#8888a8" }}>
                <Mic size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Sin generaciones aún</p>
                <p className="text-xs mt-1 opacity-60">Genera tu primer audio</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[560px]">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} voices={voices} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showBrowser && (
        <VoiceBrowser
          clonedVoices={clonedVoices}
          onSelect={setSelectedVoice}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
    </div>
  );
}

/* ─── Job Card ─────────────────────────────────────────────── */
function JobCard({ job, voices }: { job: Job; voices: Voice[] }) {
  const [showPlayer, setShowPlayer] = useState(false);

  const voiceName =
    job.voiceName ??
    voices.find((v) => v.fishAudioModelId === job.voiceId)?.name ??
    (job.voiceId === "default" ? "Voz por defecto" : job.voiceId.slice(0, 8) + "…");

  return (
    <div className="rounded-xl border p-4" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 line-clamp-2 leading-snug">{job.text}</p>
        </div>
        {statusBadge(job.status)}
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "#8888a8" }}>
        <span className="flex items-center gap-1">
          <Mic size={10} />
          {voiceName}
        </span>
        <span>·</span>
        <span>{job.creditsUsed.toLocaleString("es-ES")} chars</span>
        {job.durationSeconds && (
          <>
            <span>·</span>
            <span>{job.durationSeconds.toFixed(1)}s</span>
          </>
        )}
        <span>·</span>
        <span>{formatDate(job.createdAt)}</span>
      </div>

      {job.status === "failed" && job.error && (
        <p className="mt-2 text-xs rounded-lg p-2" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {job.error}
        </p>
      )}

      {job.status === "completed" && job.audioUrl && (
        <div className="mt-3">
          {showPlayer ? (
            <AudioPlayer src={job.audioUrl} filename={`elitelabs-${job.id}.mp3`} />
          ) : (
            <button
              onClick={() => setShowPlayer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              <Play size={11} />
              Reproducir
            </button>
          )}
        </div>
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
  plan,
}: {
  voices: Voice[];
  onRefresh: () => void;
  onUseVoice: (voice: SelectedVoice) => void;
  plan: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cloned = voices.filter((v) => !v.isSystem);
  const slotLimit = VOICE_SLOT_LIMITS[plan] ?? 0;
  const atLimit = plan === "free" || cloned.length >= slotLimit;

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
          <div>
            <h2 className="text-lg font-bold text-white">Mis voces clonadas</h2>
            {plan === "free" ? (
              <p className="text-xs mt-0.5" style={{ color: "#2e2e48" }}>No disponible en el plan gratuito</p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: cloned.length >= slotLimit ? "#f87171" : "#3a3a52" }}>
                {cloned.length}/{slotLimit} slots utilizados
              </p>
            )}
          </div>
          {plan === "free" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: "#0d0d17", border: "1px solid #1e1e2e", color: "#2e2e48" }}>
              <Lock size={13} />
              Clonar voz
            </div>
          ) : (
            <button
              onClick={() => !atLimit && setShowModal(true)}
              disabled={atLimit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={atLimit ? { background: "#1a1a28", border: "1px solid #2a2a3e", color: "#3a3a52" } : { background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
            >
              {atLimit ? `Límite alcanzado (${cloned.length}/${slotLimit})` : "+ Clonar nueva voz"}
            </button>
          )}
        </div>

        {plan === "free" ? (
          <div className="text-center py-16" style={{ color: "#2e2e48" }}>
            <div className="flex justify-center mb-3">
              <Lock size={40} style={{ color: "#2e2e48" }} />
            </div>
            <p className="font-medium mb-1">Clonación de voz bloqueada</p>
            <p className="text-sm">Disponible desde el plan Starter ($7/mes)</p>
          </div>
        ) : cloned.length === 0 ? (
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

/* ─── Plan limits (mirrored from lib/stripe.ts for client use) ── */
const VOICE_SLOT_LIMITS: Record<string, number> = { free: 0, starter: 3, pro: 10, elite: 20 };

/* ─── Billing Tab ────────────────────────────────────────── */
const BILLING_PLANS = [
  {
    key: "starter",
    name: "Starter",
    description: "Para creadores que están empezando",
    price: 7,
    characters: 200_000,
    popular: false,
    features: ["200.000 caracteres/mes", "Selección de voz completa", "Transcripciones ilimitadas", "3 voces clonadas"],
  },
  {
    key: "pro",
    name: "Pro",
    description: "La mejor opción para creadores activos",
    price: 13,
    characters: 500_000,
    popular: true,
    features: ["500.000 caracteres/mes", "Selección de voz completa", "Transcripciones ilimitadas", "10 voces clonadas", "Generación prioritaria"],
  },
  {
    key: "elite",
    name: "Elite",
    description: "Máximo rendimiento sin límites",
    price: 25,
    characters: 1_000_000,
    popular: false,
    features: ["1.000.000 caracteres/mes", "Selección de voz completa", "Transcripciones ilimitadas", "20 voces clonadas", "Soporte preferente"],
  },
] as const;

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  free:    { label: "Gratis",  color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  starter: { label: "Starter", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  pro:     { label: "Pro",     color: "#93c5fd", bg: "rgba(59,130,246,0.15)"  },
  elite:   { label: "Elite",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
};

function BillingTab({
  credits,
  plan,
  planExpiresAt,
  onRefresh,
}: {
  credits: number | null;
  plan: string;
  planExpiresAt: string | null;
  onRefresh: () => void;
}) {
  const [activePlan, setActivePlan] = useState<BillingPlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free;
  const renewalDate = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "880px" }}>
      {/* Top row: credits + plan status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "start", marginBottom: "36px" }}>
        {/* Credits */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3a3a52", marginBottom: "8px" }}>
            Caracteres disponibles
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "40px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
              {credits !== null ? credits.toLocaleString("es-ES") : "—"}
            </span>
            <span style={{ fontSize: "14px", color: "#3a3a52" }}>caracteres</span>
          </div>
        </div>

        {/* Plan status card */}
        <div style={{ borderRadius: "12px", border: "1px solid #1e1e2e", background: "#0d0d17", padding: "16px 20px", minWidth: "220px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3a3a52" }}>Plan actual</p>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", color: badge.color, background: badge.bg, letterSpacing: "0.04em" }}>
              {badge.label}
            </span>
          </div>
          {renewalDate && (
            <p style={{ fontSize: "12px", color: "#3a3a52", marginBottom: "12px" }}>
              Próxima renovación: <span style={{ color: "#6b6b88" }}>{renewalDate}</span>
            </p>
          )}
          {plan !== "free" && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "transparent", color: "#d1d5db", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: portalLoading ? 0.6 : 1 }}
            >
              {portalLoading ? "Cargando..." : "Gestionar suscripción"}
            </button>
          )}
        </div>
      </div>

      {/* Section header */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#e5e7eb", marginBottom: "3px" }}>Recargar caracteres</p>
        <p style={{ fontSize: "13px", color: "#3a3a52" }}>Administra tus caracteres aquí</p>
      </div>

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {BILLING_PLANS.map((p) => {
          const isCurrent = plan === p.key;
          return (
            <div
              key={p.key}
              style={{
                position: "relative",
                borderRadius: "16px",
                border: p.popular ? "1px solid #3b82f6" : "1px solid #1e1e2e",
                background: p.popular ? "rgba(30,58,138,0.18)" : "#0d0d17",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {p.popular && !isCurrent && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                  MÁS POPULAR
                </div>
              )}
              {isCurrent && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: "#1a1a28", border: "1px solid #2a2a3e", color: "#93c5fd", fontSize: "10px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                  PLAN ACTUAL
                </div>
              )}

              <p style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>{p.name}</p>
              <p style={{ fontSize: "12px", color: "#3a3a52", marginBottom: "20px" }}>{p.description}</p>

              <p style={{ fontSize: "38px", fontWeight: 800, color: "#fff", lineHeight: 1, marginBottom: "4px" }}>${p.price}</p>
              <p style={{ fontSize: "12px", color: "#3a3a52", marginBottom: "2px" }}>/mes</p>
              <p style={{ fontSize: "13px", color: "#6b6b88", marginBottom: "22px" }}>
                {p.characters.toLocaleString("es-ES")} caracteres/mes
              </p>

              <button
                onClick={() => !isCurrent && setActivePlan(p)}
                disabled={isCurrent}
                style={
                  isCurrent
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #2a2a3e", background: "transparent", color: "#3a3a52", fontSize: "14px", fontWeight: 600, marginBottom: "22px", cursor: "not-allowed" }
                    : p.popular
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "22px", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }
                    : { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #2a2a3e", cursor: "pointer", background: "transparent", color: "#d1d5db", fontSize: "14px", fontWeight: 600, marginBottom: "22px" }
                }
              >
                {isCurrent ? "Plan actual" : plan !== "free" ? `Cambiar a ${p.name}` : `Suscribirse`}
              </button>

              <div style={{ height: "1px", background: p.popular ? "rgba(59,130,246,0.2)" : "#1a1a28", marginBottom: "18px" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6b6b88" }}>
                    <Check size={13} style={{ color: "#3b82f6", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {activePlan && (
        <PaymentModal
          plan={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={() => {
            setActivePlan(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Translate Tab ───────────────────────────────────────── */
const TRANSLATE_LANGS = [
  { code: "en",  label: "Inglés",   flag: "🇬🇧" },
  { code: "ja",  label: "Japonés",  flag: "🇯🇵" },
  { code: "ko",  label: "Coreano",  flag: "🇰🇷" },
  { code: "zh",  label: "Mandarín", flag: "🇨🇳" },
  { code: "yue", label: "Cantonés", flag: "🇭🇰" },
];

interface TranslateResult {
  audioUrl: string;
  durationSeconds: number;
  transcribedText: string;
  translatedText: string;
  targetLanguageName: string;
  charCost: number;
}

const TRANSLATE_STEPS = [
  { after: 0,    label: "Transcribiendo audio..." },
  { after: 9000, label: "Traduciendo texto..." },
  { after: 18000, label: "Generando audio traducido..." },
];

function TranslateTab({ onGenerated, voices, plan, transcriptionUsed, onBilling }: {
  onGenerated: () => void;
  voices: Voice[];
  plan: string;
  transcriptionUsed: number;
  onBilling: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clonedVoices = voices.filter((v) => !v.isSystem);

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const okType = f.type.startsWith("audio/") || ["mp3", "wav", "m4a"].includes(ext);
    if (!okType) { setError("Formato no soportado. Usa MP3, WAV o M4A."); return; }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleTranslate() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Animate step labels
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = TRANSLATE_STEPS.map(({ after, label }) =>
      setTimeout(() => setStepLabel(label), after)
    );

    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("target_lang", targetLang);
      if (selectedVoice?.referenceId) fd.append("reference_id", selectedVoice.referenceId);

      const res = await fetch("/api/translate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");

      setResult(data);
      onGenerated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      stepTimers.current.forEach(clearTimeout);
      setLoading(false);
      setStepLabel(null);
    }
  }

  const FREE_LIMIT = 2;
  const isFreeExhausted = plan === "free" && transcriptionUsed >= FREE_LIMIT;
  const freeRemaining = Math.max(0, FREE_LIMIT - transcriptionUsed);

  return (
    <div className="max-w-2xl">
      <p className="text-sm mb-4" style={{ color: "#8888a8" }}>
        Sube un audio en español y obtén la versión traducida al idioma de tu elección.
      </p>

      {/* Free plan usage indicator */}
      {plan === "free" && (
        isFreeExhausted ? (
          <div className="mb-6 p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm" style={{ color: "#f87171" }}>
              Has agotado tus usos gratuitos. Actualiza tu plan para continuar.
            </p>
            <button
              onClick={onBilling}
              style={{ padding: "6px 14px", borderRadius: "8px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}
            >
              Ver planes
            </button>
          </div>
        ) : (
          <div className="mb-6 p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <p className="text-xs" style={{ color: "#4a6fa8" }}>
              Plan gratuito · <strong style={{ color: "#93c5fd" }}>{freeRemaining} de {FREE_LIMIT} usos restantes</strong> · Suscríbete para uso ilimitado
            </p>
          </div>
        )
      )}

      <div className="space-y-4">

        {/* Step 1 — File upload */}
        <div className="rounded-2xl border p-6" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>
            1 · Audio de origen (en español)
          </p>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
            style={{ borderColor: dragging ? "#3b82f6" : "#2a2a3e", background: dragging ? "rgba(59,130,246,0.05)" : "transparent" }}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.m4a,audio/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div>
                <p className="font-medium mb-1" style={{ color: "#4ade80" }}>{file.name}</p>
                <p className="text-xs" style={{ color: "#8888a8" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-blue-400 hover:underline"
                  >
                    Cambiar
                  </button>
                </p>
              </div>
            ) : (
              <>
                <Globe size={28} className="mx-auto mb-3" style={{ color: "#8888a8" }} />
                <p className="text-sm text-gray-400 mb-1">Arrastra tu audio aquí o haz clic</p>
                <p className="text-xs" style={{ color: "#555570" }}>MP3, WAV, M4A</p>
              </>
            )}
          </div>
        </div>

        {/* Step 2 — Language selector */}
        <div className="rounded-2xl border p-6" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>
            2 · Idioma de destino
          </p>
          <div className="grid grid-cols-5 gap-2">
            {TRANSLATE_LANGS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setTargetLang(lang.code)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-xs font-medium transition-all"
                style={
                  targetLang === lang.code
                    ? { background: "rgba(59,130,246,0.18)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" }
                    : { background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }
                }
              >
                <span className="text-xl leading-none">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — Voice selector */}
        <div className="rounded-2xl border p-6" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>
            3 · Voz para el audio traducido
          </p>
          <button
            onClick={() => setShowBrowser(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:border-blue-500/60"
            style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Mic size={13} style={{ color: "#93c5fd" }} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {selectedVoice?.name ?? "Voz por defecto"}
              </p>
              <p className="text-xs" style={{ color: "#8888a8" }}>
                {selectedVoice?.isCloned ? "Voz clonada" : "Sistema"}
              </p>
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: "#8888a8" }}>→</span>
          </button>
        </div>

        {/* Cost info */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "#8888a8" }}
        >
          <span className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }}>ℹ</span>
          <span>
            Se aplica un pequeño incremento del{" "}
            <span className="font-semibold" style={{ color: "#93c5fd" }}>20%</span>{" "}
            sobre el coste estándar para cubrir los costes de transcripción y traducción automática incluidos en el proceso.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleTranslate}
          disabled={!file || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
              {stepLabel ?? "Iniciando..."}
            </>
          ) : (
            <><Globe size={15} /> Traducir audio</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-2xl border p-6 space-y-5" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
              <p className="text-sm font-semibold text-white">
                Audio traducido al {result.targetLanguageName}
              </p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ color: "#8888a8", background: "#12121a", border: "1px solid #2a2a3e" }}>
                {result.charCost.toLocaleString("es-ES")} créditos · {result.durationSeconds.toFixed(1)}s
              </span>
            </div>

            <AudioPlayer
              src={result.audioUrl}
              filename={`elitelabs-${result.targetLanguageName.toLowerCase()}.mp3`}
            />

            <div className="grid gap-3">
              <div className="rounded-xl p-4" style={{ background: "#12121a", border: "1px solid #2a2a3e" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555570" }}>
                  Transcripción (español)
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{result.transcribedText}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "#12121a", border: "1px solid #2a2a3e" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555570" }}>
                  Traducción ({result.targetLanguageName})
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{result.translatedText}</p>
              </div>
            </div>
          </div>
        )}
      </div>

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

/* ─── Transcribe Tab ─────────────────────────────────────── */
const TRANSCRIBE_LANGS = [
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "en", label: "Inglés",   flag: "🇬🇧" },
  { code: "ja", label: "Japonés",  flag: "🇯🇵" },
  { code: "ko", label: "Coreano",  flag: "🇰🇷" },
  { code: "zh", label: "Mandarín", flag: "🇨🇳" },
];

interface TranscribeResult {
  transcribedText: string;
  charCost: number;
  charsRemaining: number;
}

function TranscribeTab({ onTranscribed, plan, transcriptionUsed, onBilling }: {
  onTranscribed: () => void;
  plan: string;
  transcriptionUsed: number;
  onBilling: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const ok = f.type.startsWith("audio/") || ["mp3", "wav", "m4a", "flac"].includes(ext);
    if (!ok) { setError("Formato no soportado. Usa MP3, WAV, M4A o FLAC."); return; }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleTranscribe() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("language", lang);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setResult(data);
      onTranscribed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result?.transcribedText) return;
    navigator.clipboard.writeText(result.transcribedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!result?.transcribedText) return;
    const blob = new Blob([result.transcribedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcripcion-elitelabs.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const FREE_LIMIT = 2;
  const isFreeExhausted = plan === "free" && transcriptionUsed >= FREE_LIMIT;
  const freeRemaining = Math.max(0, FREE_LIMIT - transcriptionUsed);

  return (
    <div className="max-w-2xl">
      <p className="text-sm mb-4" style={{ color: "#8888a8" }}>
        Sube un archivo de audio y obtén la transcripción exacta usando reconocimiento de voz de Fish Audio.
      </p>

      {/* Free plan usage indicator */}
      {plan === "free" && (
        isFreeExhausted ? (
          <div className="mb-6 p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm" style={{ color: "#f87171" }}>
              Has agotado tus usos gratuitos. Actualiza tu plan para continuar.
            </p>
            <button
              onClick={onBilling}
              style={{ padding: "6px 14px", borderRadius: "8px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}
            >
              Ver planes
            </button>
          </div>
        ) : (
          <div className="mb-6 p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <p className="text-xs" style={{ color: "#4a6fa8" }}>
              Plan gratuito · <strong style={{ color: "#93c5fd" }}>{freeRemaining} de {FREE_LIMIT} usos restantes</strong> · Suscríbete para uso ilimitado
            </p>
          </div>
        )
      )}

      <div className="space-y-4">

        {/* Step 1 — File upload */}
        <div className="rounded-2xl border p-6" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>
            1 · Archivo de audio
          </p>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
            style={{ borderColor: dragging ? "#3b82f6" : "#2a2a3e", background: dragging ? "rgba(59,130,246,0.05)" : "transparent" }}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.m4a,.flac,audio/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div>
                <p className="font-medium mb-1" style={{ color: "#4ade80" }}>{file.name}</p>
                <p className="text-xs" style={{ color: "#8888a8" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-blue-400 hover:underline"
                  >
                    Cambiar
                  </button>
                </p>
              </div>
            ) : (
              <>
                <FileAudio size={28} className="mx-auto mb-3" style={{ color: "#8888a8" }} />
                <p className="text-sm text-gray-400 mb-1">Arrastra tu audio aquí o haz clic</p>
                <p className="text-xs" style={{ color: "#555570" }}>MP3, WAV, M4A, FLAC</p>
              </>
            )}
          </div>
        </div>

        {/* Step 2 — Language */}
        <div className="rounded-2xl border p-6" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>
            2 · Idioma del audio
          </p>
          <div className="grid grid-cols-5 gap-2">
            {TRANSCRIBE_LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-xs font-medium transition-all"
                style={
                  lang === l.code
                    ? { background: "rgba(59,130,246,0.18)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" }
                    : { background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }
                }
              >
                <span className="text-xl leading-none">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cost info */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "#8888a8" }}
        >
          <span className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }}>ℹ</span>
          <span>
            El coste se calcula según los caracteres transcritos al mismo precio que la generación de audio estándar.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleTranscribe}
          disabled={!file || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
              Transcribiendo...
            </>
          ) : (
            <><FileAudio size={15} /> Transcribir audio</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-2xl border p-6 space-y-4" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
              <p className="text-sm font-semibold text-white">Transcripción completada</p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ color: "#8888a8", background: "#12121a", border: "1px solid #2a2a3e" }}>
                {result.charCost.toLocaleString("es-ES")} créditos
              </span>
            </div>

            <div className="rounded-xl p-4" style={{ background: "#12121a", border: "1px solid #2a2a3e" }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e5e7eb" }}>
                {result.transcribedText}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: copied ? "rgba(74,222,128,0.15)" : "#12121a", color: copied ? "#4ade80" : "#93c5fd", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(59,130,246,0.3)"}` }}
              >
                <Copy size={13} />
                {copied ? "¡Copiado!" : "Copiar texto"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: "#12121a", color: "#8888a8", border: "1px solid #2a2a3e" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar .txt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Referral Tab ───────────────────────────────────────── */
interface ReferralEntry {
  id: string;
  status: string;
  rewardChars: number;
  createdAt: string;
  rewardedAt: string | null;
}

function ReferralTab({ onClaimed }: { onClaimed: () => void }) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [pendingReward, setPendingReward] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimedMsg, setClaimedMsg] = useState<number | null>(null);

  const fetchReferral = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      const data = await res.json();
      setReferralCode(data.referralCode ?? null);
      setReferrals(data.referrals ?? []);
      setPendingReward(data.pendingReward ?? 0);
      setTotalEarned(data.totalEarned ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${referralCode}`
    : "";

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/referral/claim", { method: "POST" });
      const data = await res.json();
      if (data.claimed > 0) {
        setClaimedMsg(data.claimed);
        setTimeout(() => setClaimedMsg(null), 4000);
        onClaimed();
        await fetchReferral();
      }
    } finally {
      setClaiming(false);
    }
  }

  const cardStyle = { background: "#12121a", borderColor: "#2a2a3e" };

  return (
    <div className="max-w-2xl">
      {/* Referral link */}
      <div className="rounded-xl border p-5 mb-6" style={cardStyle}>
        <p className="text-xs text-gray-500 mb-1">Tu enlace de referido</p>
        <p className="text-xs text-gray-400 mb-3">
          Comparte este enlace. Cuando alguien compre caracteres, recibirás el <span className="text-blue-400 font-semibold">5%</span> en caracteres.
        </p>
        {loading ? (
          <div className="h-10 rounded-lg animate-pulse" style={{ background: "#1a1a2e" }} />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono truncate"
              style={{ background: "#0a0a0f", border: "1px solid #2a2a3e", color: "#93c5fd" }}
            >
              {referralLink || "—"}
            </div>
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={copied
                ? { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }
                : { background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }
              }
            >
              <Copy size={12} />
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Referidos", value: loading ? "—" : referrals.length.toString() },
          { label: "Completados", value: loading ? "—" : referrals.filter(r => r.status !== "pending").length.toString() },
          { label: "Total ganado", value: loading ? "—" : `${totalEarned.toLocaleString("es-ES")} chars` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border p-4 text-center" style={cardStyle}>
            <p className="text-xl font-bold text-white mb-0.5">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Claim */}
      {(pendingReward > 0 || claimedMsg !== null) && (
        <div
          className="rounded-xl border p-5 mb-6 flex items-center justify-between gap-4"
          style={claimedMsg !== null
            ? { background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.3)" }
            : { background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.25)" }
          }
        >
          <div>
            {claimedMsg !== null ? (
              <>
                <p className="text-sm font-semibold text-green-400">¡Recompensa canjeada!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  +{claimedMsg.toLocaleString("es-ES")} caracteres añadidos a tu saldo
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Recompensa disponible</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="text-blue-400 font-semibold">{pendingReward.toLocaleString("es-ES")} caracteres</span> listos para canjear
                </p>
              </>
            )}
          </div>
          {claimedMsg === null && (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}
            >
              {claiming && (
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Canjear caracteres
            </button>
          )}
        </div>
      )}

      {/* Referral list */}
      <div>
        <p className="text-sm font-semibold text-gray-300 mb-3">Historial de referidos</p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "#12121a" }} />)}
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12 rounded-xl border" style={cardStyle}>
            <Gift size={36} style={{ color: "#8888a8" }} className="mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">Aún no tienes referidos</p>
            <p className="text-xs text-gray-600 mt-1">Comparte tu enlace y empieza a ganar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border" style={cardStyle}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Referido #{i + 1}</p>
                    <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={
                      r.status === "claimed"
                        ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
                        : r.status === "rewarded"
                        ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd" }
                        : { background: "rgba(255,255,255,0.06)", color: "#8888a8" }
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: r.status === "claimed" ? "#4ade80" : r.status === "rewarded" ? "#93c5fd" : "#8888a8" }}
                    />
                    {r.status === "claimed" ? "Canjeado" : r.status === "rewarded" ? "Listo" : "Pendiente"}
                  </span>
                  {r.rewardChars > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">+{r.rewardChars.toLocaleString("es-ES")} chars</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [transcriptionUsed, setTranscriptionUsed] = useState<number>(0);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const { t: tt, toggle: toggleLang } = useLang();

  const fetchCredits = useCallback(async () => {
    const res = await fetch("/api/credits");
    const data = await res.json();
    setCredits(data.characters);
    if (data.plan) setPlan(data.plan);
    if ("planExpiresAt" in data) setPlanExpiresAt(data.planExpiresAt);
    if (typeof data.transcriptionUsed === "number") setTranscriptionUsed(data.transcriptionUsed);
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

  const successPlan = searchParams.get("plan");

  function handleUseVoice(voice: SelectedVoice) {
    setSelectedVoice(voice);
    setActiveTab("generate");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#0a0a0f" }}>
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
      <Sidebar credits={credits} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-auto relative" style={{ padding: "0" }}>
        {/* Topbar */}
        {(() => {
          const TAB_META: Record<Tab, { title: string; Icon: React.ElementType }> = {
            home:       { title: tt.tabs.home,       Icon: Home },
            generate:   { title: tt.tabs.generate,   Icon: Type },
            transcribe: { title: tt.tabs.transcribe, Icon: FileAudio },
            translate:  { title: tt.tabs.translate,  Icon: Globe },
            history:    { title: tt.tabs.history,    Icon: Clock },
            billing:    { title: tt.tabs.billing,    Icon: CreditCard },
            voices:     { title: tt.tabs.voices,     Icon: Mic2 },
            referral:   { title: tt.tabs.referral,   Icon: Gift },
          };
          const { title, Icon } = TAB_META[activeTab] ?? { title: "", Icon: Home };
          return (
            <div style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #1a1a28", background: "#0a0a0f", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Icon size={16} style={{ color: "#4a4a65" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#e5e7eb" }}>{title}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={toggleLang}
                  title="Español / English"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #2a2a3e", background: "transparent", cursor: "pointer", color: "#4a4a65", transition: "color 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#93c5fd"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#4a4a65"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a3e"; }}
                >
                  <Languages size={15} />
                </button>
                <button
                  onClick={() => setSupportOpen(true)}
                  title="Soporte"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #2a2a3e", background: "transparent", cursor: "pointer", color: "#4a4a65", transition: "color 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#93c5fd"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#4a4a65"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a3e"; }}
                >
                  <HelpCircle size={15} />
                </button>
                <UserButton />
              </div>
            </div>
          );
        })()}
        {/* Page content */}
        <div style={{ padding: "24px" }}>
        {successPlan && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium text-sm">
              ¡Suscripción activada! Tu plan <strong className="capitalize">{successPlan}</strong> ya está activo.
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
            plan={plan}
          />
        )}
        {activeTab === "voices" && (
          <VoicesTab
            voices={voices}
            onRefresh={fetchVoices}
            onUseVoice={handleUseVoice}
            plan={plan}
          />
        )}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "billing" && (
          <BillingTab
            credits={credits}
            plan={plan}
            planExpiresAt={planExpiresAt}
            onRefresh={fetchCredits}
          />
        )}
        {activeTab === "referral" && (
          <ReferralTab onClaimed={fetchCredits} />
        )}
        {activeTab === "translate" && (
          <TranslateTab
            onGenerated={fetchCredits}
            voices={voices}
            plan={plan}
            transcriptionUsed={transcriptionUsed}
            onBilling={() => setActiveTab("billing")}
          />
        )}
        {activeTab === "transcribe" && (
          <TranscribeTab
            onTranscribed={fetchCredits}
            plan={plan}
            transcriptionUsed={transcriptionUsed}
            onBilling={() => setActiveTab("billing")}
          />
        )}
        </div>{/* end page content */}
      </main>
    </div>
  );
}
