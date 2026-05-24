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
import { CreditPackModal } from "./CreditPackModal";
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
  audioUrl: string | null;
  creditsUsed: number;
  durationSeconds: number;
  voiceId: string;
  createdAt: string;
  expiresAt: string | null;
}

type Tab = "home" | "generate" | "voices" | "history" | "billing" | "referral" | "translate" | "transcribe" | "team";

/* ─── Sidebar ─────────────────────────────────────────────── */
type NavSection = {
  label?: string;
  items: { key: Tab | "_account"; label: string; Icon: React.ElementType }[];
};

function Sidebar({
  credits,
  activeTab,
  setActiveTab,
  onClose,
  desktop = false,
  plan,
  memberInfo,
}: {
  credits: number | null;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  onClose?: () => void;
  desktop?: boolean;
  plan?: string;
  memberInfo?: { percentage: number; creditsLastDistributed: number; teamName: string } | null;
}) {
  const { openUserProfile } = useClerk();
  const { t } = useLang();
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setLeaving(false);
    }
  }

  const platformItems: { key: Tab | "_account"; label: string; Icon: React.ElementType }[] = [
    { key: "billing",   label: t.nav.billing,   Icon: CreditCard },
    { key: "referral",  label: t.nav.referrals, Icon: Gift },
    { key: "_account",  label: t.nav.account,   Icon: User },
  ];
  if (plan === "enterprise") {
    platformItems.unshift({ key: "team", label: "Equipo", Icon: Users });
  }

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
      items: platformItems,
    },
  ];

  function handleNav(key: Tab | "_account") {
    if (key === "_account") { openUserProfile(); return; }
    setActiveTab(key);
    onClose?.();
  }

  return (
    <aside
      className={desktop ? "hidden lg:flex" : "flex"}
      style={{
        width: "100%",
        height: "100vh",
        flexDirection: "column",
        ...(desktop ? { width: "240px", flexShrink: 0, position: "sticky", top: 0, borderRight: "1px solid #1e1e2e" } : {}),
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
          <button
            onClick={() => {
              setActiveTab("billing");
              onClose?.();
              setTimeout(() => {
                document.getElementById("creditos-extra")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 80);
            }}
            style={{ fontSize: "11px", fontWeight: 700, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {t.nav.buy}
          </button>
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

      {/* Team membership section — only for non-owner members */}
      {memberInfo && (
        <div style={{ borderTop: "1px solid #1a1a28", padding: "12px 20px 16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2e2e48", marginBottom: "8px" }}>
            Equipo
          </p>
          {leaveConfirm ? (
            <div style={{ background: "#110a0a", border: "1px solid #3a1a1a", borderRadius: "10px", padding: "10px 12px" }}>
              <p style={{ fontSize: "11px", color: "#fca5a5", marginBottom: "8px", lineHeight: 1.4 }}>
                ¿Salir del equipo <strong>{memberInfo.teamName}</strong>? Perderás{" "}
                {memberInfo.creditsLastDistributed > 0
                  ? <strong>{memberInfo.creditsLastDistributed.toLocaleString("es-ES")} créditos</strong>
                  : "los créditos asignados"}{" "}
                que se devolverán al administrador.
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setLeaveConfirm(false)}
                  disabled={leaving}
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "1px solid #2a2a3e", background: "transparent", color: "#5a5a78", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "none", background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", opacity: leaving ? 0.6 : 1 }}
                >
                  {leaving ? "..." : "Salir"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: "#111122", border: "1px solid #1e1e32", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={14} style={{ color: "#3b82f6" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {memberInfo.teamName}
                  </p>
                  <p style={{ fontSize: "11px", color: "#3a3a52", marginTop: "1px" }}>
                    Miembro · {(memberInfo.percentage > 0 ? Math.floor(5_000_000 * memberInfo.percentage / 100) : memberInfo.creditsLastDistributed).toLocaleString("es-ES")} car.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLeaveConfirm(true)}
                style={{ marginTop: "6px", width: "100%", padding: "5px 0", borderRadius: "7px", border: "1px solid #2a1a1a", background: "transparent", color: "#7a3a3a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#4a1a1a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#7a3a3a"; e.currentTarget.style.borderColor = "#2a1a1a"; }}
              >
                Salir del equipo
              </button>
            </>
          )}
        </div>
      )}
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
    { key: "generate",   Icon: Mic,       title: t.home.cardGenerate,   desc: t.home.cardGenerateDesc },
    { key: "voices",     Icon: Users,     title: t.home.cardVoices,     desc: t.home.cardVoicesDesc },
    { key: "history",    Icon: Clock,     title: t.home.cardHistory,    desc: t.home.cardHistoryDesc },
    { key: "transcribe", Icon: FileAudio, title: t.home.cardTranscribe, desc: t.home.cardTranscribeDesc },
    { key: "translate",  Icon: Languages, title: t.home.cardTranslate,  desc: t.home.cardTranslateDesc },
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 items-stretch">
        {cards.map(({ key, Icon, title, desc }, i) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="group relative overflow-hidden flex flex-col p-6 rounded-2xl border border-[#2a2a3e] hover:border-blue-700 text-left transition-all hover:-translate-y-0.5 h-full"
            style={{ background: "#12121a" }}
          >
            <svg className="absolute top-0 right-0 w-40 h-40 opacity-20 group-hover:opacity-30 transition-opacity duration-300" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              {i === 0 && <>
                {/* Texto a Voz: ondas suaves desde esquina */}
                <path d="M160 0 Q120 40 160 80" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q100 50 160 100" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q80 60 160 120" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <path d="M160 10 Q90 60 160 110" stroke="#2563eb" strokeWidth="1" fill="none"/>
                <path d="M160 20 Q100 65 160 120" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q110 70 160 140" stroke="#1d4ed8" strokeWidth="1.5" fill="none"/>
                <path d="M160 10 Q120 75 160 150" stroke="#1d4ed8" strokeWidth="1" fill="none"/>
                <path d="M140 0 Q100 55 150 120" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M120 0 Q90 50 140 110" stroke="#2563eb" strokeWidth="0.8" fill="none"/>
                <path d="M100 0 Q75 45 130 100" stroke="#1d4ed8" strokeWidth="0.8" fill="none"/>
              </>}
              {i === 1 && <>
                {/* Mis Voces: ondas cerradas y apretadas */}
                <path d="M160 0 Q145 20 160 40" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q140 30 160 60" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q135 40 160 80" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q130 50 160 100" stroke="#2563eb" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q125 60 160 120" stroke="#1d4ed8" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q120 70 160 140" stroke="#1d4ed8" strokeWidth="1.5" fill="none"/>
                <path d="M150 0 Q135 35 155 70" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M140 0 Q128 30 148 65" stroke="#2563eb" strokeWidth="0.8" fill="none"/>
                <path d="M130 0 Q118 28 142 58" stroke="#1d4ed8" strokeWidth="0.8" fill="none"/>
                <path d="M160 10 Q142 45 158 90" stroke="#3b82f6" strokeWidth="0.8" fill="none"/>
              </>}
              {i === 2 && <>
                {/* Historial: ondas abiertas y espaciadas */}
                <path d="M160 0 Q90 80 160 160" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q70 70 150 150" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q110 60 160 120" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M160 20 Q95 85 155 150" stroke="#1d4ed8" strokeWidth="1" fill="none"/>
                <path d="M140 0 Q70 65 135 145" stroke="#2563eb" strokeWidth="1" fill="none"/>
                <path d="M120 0 Q55 60 120 135" stroke="#1d4ed8" strokeWidth="1" fill="none"/>
                <path d="M160 40 Q100 90 155 145" stroke="#3b82f6" strokeWidth="0.8" fill="none"/>
                <path d="M100 0 Q40 55 105 125" stroke="#2563eb" strokeWidth="0.8" fill="none"/>
                <path d="M80 0 Q25 50 90 115" stroke="#1d4ed8" strokeWidth="0.8" fill="none"/>
                <path d="M160 60 Q105 100 150 148" stroke="#3b82f6" strokeWidth="0.8" fill="none"/>
              </>}
              {i === 3 && <>
                {/* Audio a Texto: diagonal pronunciada */}
                <path d="M160 0 Q60 60 100 160" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q70 55 110 160" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q80 50 120 160" stroke="#1d4ed8" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q90 45 130 160" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q100 40 140 160" stroke="#2563eb" strokeWidth="1" fill="none"/>
                <path d="M160 10 Q65 65 105 160" stroke="#1d4ed8" strokeWidth="1" fill="none"/>
                <path d="M160 20 Q75 65 115 160" stroke="#3b82f6" strokeWidth="0.8" fill="none"/>
                <path d="M160 30 Q85 65 125 160" stroke="#2563eb" strokeWidth="0.8" fill="none"/>
                <path d="M160 0 Q55 70 95 160" stroke="#1d4ed8" strokeWidth="0.8" fill="none"/>
                <path d="M160 0 Q50 80 90 160" stroke="#3b82f6" strokeWidth="0.8" fill="none"/>
              </>}
              {i === 4 && <>
                {/* Traducción: ondas cortas y densas */}
                <path d="M160 0 Q148 12 160 24" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q144 16 160 32" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q140 20 160 40" stroke="#1d4ed8" strokeWidth="1.5" fill="none"/>
                <path d="M160 0 Q135 25 160 50" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q130 30 160 60" stroke="#2563eb" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q124 36 160 72" stroke="#1d4ed8" strokeWidth="1" fill="none"/>
                <path d="M160 0 Q118 42 160 84" stroke="#3b82f6" strokeWidth="1" fill="none"/>
                <path d="M155 0 Q140 20 158 42" stroke="#2563eb" strokeWidth="0.8" fill="none"/>
                <path d="M150 0 Q133 22 154 46" stroke="#1d4ed8" strokeWidth="0.8" fill="none"/>
                <path d="M145 0 Q126 24 150 50" stroke="#3b82f6" strokeWidth="0.8" fill="none"/>
              </>}
            </svg>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Icon size={20} style={{ color: "#93c5fd" }} />
            </div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm mt-1" style={{ color: "#8888a8" }}>{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
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

/* ─── Job types ───────────────────────────────────────────── */
interface Job {
  id: string;
  status: string;
  text: string;
  voiceId: string;
  voiceName?: string | null;
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

/* ─── Slider + numeric input control ─────────────────────── */
function SliderControl({
  label, value, onChange, min, max, step, decimals, marks, defaultValue,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; decimals: number;
  marks: [string, string, string]; defaultValue: number;
}) {
  const [inputText, setInputText] = useState(value.toFixed(decimals));
  const isDefault = value === defaultValue;

  // Keep input text in sync when slider moves
  useEffect(() => {
    setInputText(value.toFixed(decimals));
  }, [value, decimals]);

  function commitInput(raw: string) {
    const parsed = parseFloat(raw);
    const clamped = isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed));
    const rounded = Math.round(clamped / step) * step;
    onChange(parseFloat(rounded.toFixed(decimals)));
    setInputText(parseFloat(rounded.toFixed(decimals)).toFixed(decimals));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={(e) => commitInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitInput((e.target as HTMLInputElement).value)}
          className="text-xs font-mono text-right rounded px-1.5 py-0.5 w-16 outline-none"
          style={{
            color: !isDefault ? "#93c5fd" : "#8888a8",
            background: !isDefault ? "rgba(59,130,246,0.12)" : "#1a1a28",
            border: "1px solid #2a2a3e",
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "#3b82f6", background: "#2a2a3e" }}
      />
      <div className="flex justify-between mt-1 text-xs" style={{ color: "#555570" }}>
        {marks.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

/* ─── Generate Tab ────────────────────────────────────────── */
function GenerateTab({
  voices,
  onGenerated,
  selectedVoice,
  onVoiceChange,
  plan,
}: {
  voices: Voice[];
  onGenerated: () => void;
  selectedVoice: SelectedVoice | null;
  onVoiceChange: (v: SelectedVoice | null) => void;
  plan: string;
}) {
  const [text, setText] = useState("");
  const [showBrowser, setShowBrowser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [pitch, setPitch] = useState(0.0);
  const [normalize, setNormalize] = useState(true);
  const [temperature, setTemperature] = useState(0.9);
  const [topP, setTopP] = useState(0.9);
  const [selectedModel, setSelectedModel] = useState("speech-1.6");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [previewing, setPreviewing] = useState<"idle" | "loading" | "playing">("idle");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
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
    if (!modelDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modelDropdownOpen]);

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
      const prosody = (speed !== 1 || volume !== 1 || pitch !== 0) ? { speed, volume, pitch } : undefined;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          reference_id: selectedVoice?.referenceId ?? undefined,
          voiceName: selectedVoice?.name ?? "Voz por defecto",
          prosody,
          normalize,
          model: selectedModel,
          ...(selectedModel === "speech-1.5" && { temperature, topP }),
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

  async function handlePreview() {
    if (previewing === "playing") {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPreviewing("idle");
      return;
    }

    setPreviewing("loading");
    try {
      const prosody = (speed !== 1 || volume !== 1 || pitch !== 0) ? { speed, volume, pitch } : undefined;
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_id: selectedVoice?.referenceId ?? undefined, prosody }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Error al generar la pre-escucha");
        setPreviewing("idle");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      setPreviewing("playing");
      audio.onended = () => { setPreviewing("idle"); URL.revokeObjectURL(url); previewAudioRef.current = null; };
      audio.onerror = () => { setPreviewing("idle"); URL.revokeObjectURL(url); previewAudioRef.current = null; };
      audio.play();
    } catch {
      setFormError("Error al generar la pre-escucha");
      setPreviewing("idle");
    }
  }

  return (
    <div style={{ height: "calc(100vh - 88px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>

      {/* ── LEFT: Editor ── */}
      <div className="flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#0d0d17", borderColor: "#2a2a3e", minHeight: 0 }}>
        {/* Voice header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "#2a2a3e" }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(59,130,246,0.15)" }}
          >
            <Mic size={18} style={{ color: "#93c5fd" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selectedVoice?.name ?? t.generate.defaultVoice}</p>
            <p className="text-xs" style={{ color: "#8888a8" }}>{selectedVoice?.isCloned ? t.generate.clonedVoice : t.generate.systemVoice}</p>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.generate.placeholder}
          disabled={submitting}
          className="w-full px-6 py-5 text-sm text-gray-200 resize-none focus:outline-none disabled:opacity-60"
          style={{ background: "#0d0d17", lineHeight: "1.75", minHeight: "200px", flex: 1 }}
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
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
      <div className="rounded-2xl border flex flex-col" style={{ background: "#0d0d17", borderColor: "#2a2a3e", overflow: "hidden", minHeight: 0 }}>
        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "#2a2a3e" }}>
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
          <div className="p-5 space-y-6 overflow-y-auto flex-1">
            {/* Voz */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#555570" }}>{t.generate.voiceLabel}</p>
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

              {/* Preview button */}
              {plan !== "free" && (
                <button
                  onClick={handlePreview}
                  disabled={previewing === "loading"}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: previewing === "playing" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.08)",
                    border: `1px solid ${previewing === "playing" ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.2)"}`,
                    color: previewing === "playing" ? "#f87171" : previewing === "loading" ? "#8888a8" : "#93c5fd",
                    cursor: previewing === "loading" ? "not-allowed" : "pointer",
                    opacity: previewing === "loading" ? 0.6 : 1,
                  }}
                >
                  {previewing === "loading" && (
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {previewing === "idle" && "▶ Pre-escuchar"}
                  {previewing === "loading" && "Generando..."}
                  {previewing === "playing" && "⏹ Detener"}
                </button>
              )}
            </div>

            {/* Model selector */}
            <div className="border-t pt-5" style={{ borderColor: "#2a2a3e" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#555570" }}>Modelo</p>
              <div className="relative" ref={modelDropdownRef}>
                {/* Trigger */}
                <button
                  onClick={() => setModelDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-all"
                  style={{ background: "#0d0d17", border: "1px solid #2a2a3e", borderRadius: "10px", color: "#e2e2f0" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {selectedModel === "speech-1.6" ? "Elite Labs E2 Pro" : "Elite Labs E1"}
                    </span>
                    {selectedModel === "speech-1.6" && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "#3b82f622", color: "#3b82f6", border: "1px solid #3b82f644" }}>
                        El más nuevo
                      </span>
                    )}
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="flex-shrink-0 transition-transform"
                    style={{ color: "#555570", transform: modelDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Menu */}
                {modelDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 z-20 mt-1 py-1"
                    style={{ background: "#0d0d17", border: "1px solid #2a2a3e", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  >
                    {([
                      { value: "speech-1.6", label: "Elite Labs E2 Pro", sub: "Nuestro modelo insignia", badge: "El más nuevo", badgeColor: "#3b82f6" },
                      { value: "speech-1.5", label: "Elite Labs E1",     sub: "Heredado",                badge: null,           badgeColor: "" },
                    ] as const).map(({ value, label, sub, badge, badgeColor }) => (
                      <button
                        key={value}
                        onClick={() => { setSelectedModel(value); setModelDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors"
                        style={{ background: "transparent", color: selectedModel === value ? "#e2e2f0" : "#8888a8" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{label}</span>
                            {badge && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44` }}>
                                {badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs mt-0.5" style={{ color: "#444460" }}>{sub}</span>
                        </div>
                        {selectedModel === value && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Audio controls */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555570" }}>{t.generate.audioControls}</p>
              <div className="space-y-5">
                <SliderControl
                  label={t.generate.speed}
                  value={speed}
                  onChange={setSpeed}
                  min={0.5} max={1.5} step={0.01} decimals={2}
                  marks={["0.50", "1.00", "1.50"]}
                  defaultValue={1}
                />
                <SliderControl
                  label={t.generate.volume}
                  value={volume}
                  onChange={setVolume}
                  min={0} max={2} step={0.01} decimals={2}
                  marks={["0.00", "1.00", "2.00"]}
                  defaultValue={1}
                />
                {selectedModel === "speech-1.5" && (
                  <>
                    <SliderControl
                      label="Temperatura"
                      value={temperature}
                      onChange={setTemperature}
                      min={0} max={1} step={0.1} decimals={1}
                      marks={["0.0", "0.5", "1.0"]}
                      defaultValue={0.9}
                    />
                    <SliderControl
                      label="Top P"
                      value={topP}
                      onChange={setTopP}
                      min={0} max={1} step={0.1} decimals={1}
                      marks={["0.0", "0.5", "1.0"]}
                      defaultValue={0.9}
                    />
                  </>
                )}
                <SliderControl
                  label={t.generate.pitch}
                  value={pitch}
                  onChange={setPitch}
                  min={-6} max={6} step={0.1} decimals={1}
                  marks={["Grave", "Normal", "Agudo"]}
                  defaultValue={0}
                />
              </div>
            </div>

            {/* Normalization toggle */}
            <div className="border-t pt-5" style={{ borderColor: "#2a2a3e" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {selectedModel === "speech-1.5" ? (
                    <>
                      <p className="text-sm text-gray-300">Normalización de texto</p>
                      <p className="text-xs mt-0.5" style={{ color: "#8888a8" }}>Normaliza números y abreviaturas</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-300">Normalización de volumen</p>
                      <p className="text-xs mt-0.5" style={{ color: "#8888a8" }}>Iguala el volumen del audio</p>
                    </>
                  )}
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

            {(speed !== 1 || volume !== 1 || pitch !== 0 || (selectedModel === "speech-1.5" && (temperature !== 0.9 || topP !== 0.9))) && (
              <button
                onClick={() => { setSpeed(1); setVolume(1); setPitch(0); setTemperature(0.9); setTopP(0.9); }}
                className="text-xs transition-colors"
                style={{ color: "#8888a8" }}
              >
                Restablecer valores
              </button>
            )}
          </div>
        )}

        {rightTab === "historial" && (
          <div className="p-4 overflow-y-auto flex-1">
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
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showBrowser && (
        <VoiceBrowser
          clonedVoices={clonedVoices}
          onSelect={onVoiceChange}
          onClose={() => setShowBrowser(false)}
          plan={plan}
        />
      )}
    </div>
    </div>
  );
}

/* ─── Job Card ─────────────────────────────────────────────── */
function JobCard({ job }: { job: Job }) {
  const [showPlayer, setShowPlayer] = useState(false);

  const voiceName = job.voiceName ?? "Voz por defecto";

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
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    const allowed = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"];
    if (!allowed.includes(f.type)) {
      setError("Formato no soportado. Usa WAV, MP3 o M4A.");
      return;
    }
    const duration = await new Promise<number>((resolve) => {
      const url = URL.createObjectURL(f);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => { URL.revokeObjectURL(url); resolve(audio.duration); }, { once: true });
      audio.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(0); }, { once: true });
    });
    if (duration < 10) {
      setError("El audio debe tener al menos 10 segundos de duración.");
      setFile(null);
      setFileDuration(null);
      return;
    }
    setFile(f);
    setFileDuration(duration);
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
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(0)} KB
                {fileDuration !== null && ` · ${Math.floor(fileDuration)}s`}
              </p>
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
  const atLimit = slotLimit !== Infinity && cloned.length >= slotLimit;

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
            <p className="text-xs mt-0.5" style={{ color: "#3a3a52" }}>
              {slotLimit === Infinity ? `${cloned.length} / Ilimitadas` : `${cloned.length}/${slotLimit} slots utilizados`}
            </p>
          </div>
          <button
            onClick={() => !atLimit && setShowModal(true)}
            disabled={atLimit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={atLimit ? { background: "#1a1a28", border: "1px solid #2a2a3e", color: "#3a3a52" } : { background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            {atLimit ? `Límite alcanzado (${cloned.length}/${slotLimit})` : "+ Clonar nueva voz"}
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
function HistoryTab({ plan }: { plan: string }) {
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
      {/* Free plan banner */}
      {plan === "free" && (
        <div className="mb-5 p-3 rounded-xl flex items-start gap-3 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          <span style={{ flexShrink: 0, marginTop: "1px" }}>⚠️</span>
          <span>Tus audios expiran a las <strong>72 horas</strong>. Suscríbete para guardarlos hasta 30 días.</span>
        </div>
      )}

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
            {generations.map((gen) => {
              const expiry = formatExpiry(gen.expiresAt ?? null);
              const isExpired = expiry?.expired || !gen.audioUrl;
              return (
                <div key={gen.id} className="p-4 rounded-xl border" style={{ background: "#12121a", borderColor: isExpired ? "#1e1e2e" : "#2a2a3e" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isExpired ? "text-gray-600" : "text-gray-300"}`}>{gen.text}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>{formatDate(gen.createdAt)}</span>
                        <span>·</span>
                        <span>{gen.creditsUsed.toLocaleString("es-ES")} chars</span>
                        <span>·</span>
                        <span>{gen.durationSeconds.toFixed(1)}s</span>
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpired ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#12121a", color: "#4a4a65", border: "1px solid #1e1e2e" }}>
                          Audio expirado
                        </span>
                      ) : (
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
                      )}
                    </div>
                  </div>
                  {!isExpired && playingId === gen.id && (
                    <div className="mt-3">
                      <AudioPlayer src={gen.audioUrl!} filename={`elitelabs-${gen.id}.mp3`} />
                    </div>
                  )}
                </div>
              );
            })}
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
const VOICE_SLOT_LIMITS: Record<string, number> = { free: 1, starter: 3, pro: 10, elite: 20, enterprise: Infinity };

/* ─── Billing Tab ────────────────────────────────────────── */
const BILLING_PLANS = [
  {
    key: "free",
    name: "Free",
    description: "Para explorar la plataforma",
    price: 0,
    characters: 10_000,
    popular: false,
    features: ["10.000 caracteres/mes", "Voces del sistema", "Transcripciones (30 min/mes)", "Historial 7 días"],
  },
  {
    key: "starter",
    name: "Starter",
    description: "Para creadores que están empezando",
    price: 7,
    characters: 200_000,
    popular: false,
    features: ["200.000 caracteres/mes", "Selección de voz completa", "Transcripciones ilimitadas", "3 voces clonadas", "Audios 14 días"],
  },
  {
    key: "pro",
    name: "Pro",
    description: "La mejor opción para creadores activos",
    price: 13,
    characters: 500_000,
    popular: true,
    features: ["500.000 caracteres/mes", "Selección de voz completa", "Transcripciones ilimitadas", "10 voces clonadas", "Generación prioritaria", "Audios 30 días"],
  },
  {
    key: "elite",
    name: "Elite",
    description: "Máximo rendimiento sin límites",
    price: 25,
    characters: 1_000_000,
    popular: false,
    features: ["1.000.000 caracteres/mes", "Selección de voz completa", "Transcripciones ilimitadas", "20 voces clonadas", "Soporte preferente", "Audios 30 días"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Para profesionales y equipos",
    price: 110,
    characters: 5_000_000,
    popular: false,
    features: ["5.000.000 caracteres/mes", "Voces clonadas ilimitadas", "Transcripciones ilimitadas", "Traducción +10% (vs +20%)", "Generación prioritaria", "Soporte preferente", "Audios 90 días"],
  },
];

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  free:       { label: "Gratis",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  starter:    { label: "Starter",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  pro:        { label: "Pro",        color: "#93c5fd", bg: "rgba(59,130,246,0.15)"  },
  elite:      { label: "Elite",      color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  enterprise: { label: "Enterprise", color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
};

function costPer10k(price: number, characters: number): string {
  return `$${((price / characters) * 10_000).toFixed(2)}/10k`;
}

function BillingTab({
  credits,
  extraCredits,
  plan,
  planExpiresAt,
  nextRenewalDate,
  daysUntilRenewal,
  onRefresh,
}: {
  credits: number | null;
  extraCredits: number;
  plan: string;
  planExpiresAt: string | null;
  nextRenewalDate: string | null;
  daysUntilRenewal: number | null;
  onRefresh: () => void;
}) {
  const [activePlan, setActivePlan] = useState<BillingPlan | null>(null);
  const [activePack, setActivePack] = useState<string | null>(null);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free;

  const renewalDateLabel = nextRenewalDate
    ? new Date(nextRenewalDate).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    : null;
  const renewalSoon = daysUntilRenewal !== null && daysUntilRenewal <= 2;

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
    <div style={{ width: "100%" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: 0 }}>Suscripción</h2>
        <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 11px", borderRadius: "999px", color: badge.color, background: badge.bg, letterSpacing: "0.05em" }}>
          {badge.label}
        </span>
      </div>

      {/* ── Info banner ── */}
      <div style={{ borderRadius: "12px", border: "1px solid #1e1e2e", background: "#0d0d17", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#3a3a52", marginBottom: "3px" }}>Caracteres disponibles</p>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {credits !== null ? credits.toLocaleString("es-ES") : "—"}
              {extraCredits > 0 && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#34d399" }}>+{extraCredits.toLocaleString("es-ES")} extra</span>
              )}
            </p>
          </div>
          {renewalDateLabel && (
            <>
              <div style={{ width: "1px", height: "32px", background: "#1e1e2e", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "11px", color: "#3a3a52", marginBottom: "3px" }}>
                  {plan === "free" ? "Próxima recarga" : "Próxima renovación"}
                </p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: renewalSoon ? "#f59e0b" : "#d1d5db", display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {renewalDateLabel}
                  {renewalSoon && <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700 }}>· ¡pronto!</span>}
                  {!renewalSoon && daysUntilRenewal !== null && (
                    <span style={{ fontSize: "11px", color: "#3a3a52", fontWeight: 400 }}>· en {daysUntilRenewal}d</span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
        {plan !== "free" && (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "transparent", color: "#d1d5db", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading ? "Cargando..." : "Gestionar suscripción →"}
          </button>
        )}
      </div>

      {/* ── Monthly / Annual toggle ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
        <div style={{ display: "inline-flex", background: "#0d0d17", border: "1px solid #1e1e2e", borderRadius: "10px", padding: "3px", gap: "2px" }}>
          <button
            onClick={() => setBilling("monthly")}
            style={{ padding: "7px 22px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: billing === "monthly" ? "#1a1a2e" : "transparent", color: billing === "monthly" ? "#e5e7eb" : "#4a4a65", transition: "all 0.15s" }}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling("annual")}
            style={{ padding: "7px 22px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: billing === "annual" ? "#1a1a2e" : "transparent", color: billing === "annual" ? "#e5e7eb" : "#4a4a65", display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s" }}
          >
            Anual
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e", letterSpacing: "0.03em" }}>
              −17%
            </span>
          </button>
        </div>
      </div>

      {/* ── Plan cards (5 in a row) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 w-full">
        {BILLING_PLANS.map((p) => {
          const isCurrent = plan === p.key;
          const planBadge = PLAN_BADGE[p.key];
          const monthlyPrice = billing === "annual" && p.price > 0
            ? Math.round(p.price * 0.83 * 10) / 10
            : p.price;
          const borderColor = isCurrent ? (planBadge?.color ?? "#3b82f6") : p.popular ? "#3b82f6" : "#1e1e2e";
          const bgColor = isCurrent
            ? "rgba(255,255,255,0.03)"
            : p.popular ? "rgba(30,58,138,0.12)" : "#0d0d17";
          const isDowngrade = plan !== "free" && p.key === "free";

          return (
            <div
              key={p.key}
              style={{ borderRadius: "14px", border: `1px solid ${borderColor}`, background: bgColor, padding: "18px 14px", display: "flex", flexDirection: "column" }}
            >
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px", minHeight: "28px" }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>{p.name}</p>
                {isCurrent ? (
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", color: planBadge?.color, background: planBadge?.bg, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>
                    ACTUAL
                  </span>
                ) : p.popular ? (
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", color: "#93c5fd", background: "rgba(59,130,246,0.15)", letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>
                    POPULAR
                  </span>
                ) : null}
              </div>

              {/* Price */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                  <span style={{ fontSize: "26px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                    {p.price === 0 ? "Gratis" : `$${monthlyPrice}`}
                  </span>
                  {p.price > 0 && <span style={{ fontSize: "11px", color: "#3a3a52" }}>/mes</span>}
                </div>
                {billing === "annual" && p.price > 0 && (
                  <p style={{ fontSize: "10px", color: "#4a4a65", marginTop: "2px" }}>
                    ${Math.round(monthlyPrice * 12)}/año
                  </p>
                )}
                <p style={{ fontSize: "11px", color: "#4a4a65", marginTop: "5px" }}>
                  {p.characters.toLocaleString("es-ES")} chars/mes
                </p>
                {p.price > 0 && (
                  <p style={{ fontSize: "10px", color: "#3a3a52", marginTop: "2px" }}>
                    {costPer10k(monthlyPrice, p.characters)}
                  </p>
                )}
              </div>

              {/* CTA button */}
              <button
                onClick={() => {
                  if (isCurrent) return;
                  if (isDowngrade || p.key === "free") { openPortal(); return; }
                  setActivePlan(p);
                }}
                disabled={isCurrent}
                style={
                  isCurrent
                    ? { width: "100%", padding: "9px 8px", borderRadius: "9px", border: "1px solid #2a2a3e", background: "transparent", color: "#3a3a52", fontSize: "12px", fontWeight: 600, marginBottom: "14px", cursor: "not-allowed" }
                    : p.popular
                    ? { width: "100%", padding: "9px 8px", borderRadius: "9px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }
                    : { width: "100%", padding: "9px 8px", borderRadius: "9px", border: "1px solid #2a2a3e", cursor: "pointer", background: "transparent", color: "#d1d5db", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }
                }
              >
                {isCurrent
                  ? "Plan actual"
                  : isDowngrade
                  ? "Cambiar a Free"
                  : plan !== "free"
                  ? `Cambiar a ${p.name}`
                  : p.key === "free"
                  ? "Plan actual"
                  : "Suscribirse"}
              </button>

              {/* Features */}
              <div style={{ height: "1px", background: "#1a1a28", marginBottom: "12px" }} />
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11px", color: "#6b6b88", lineHeight: 1.4 }}>
                    <Check size={11} style={{ color: p.key === "enterprise" ? "#34d399" : "#3b82f6", flexShrink: 0, marginTop: "1px" }} />
                    {f}
                  </li>
                ))}
              </ul>

              {p.key === "enterprise" && (
                <div style={{ marginTop: "12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                      <Users size={12} style={{ color: "#fff", flexShrink: 0 }} /> Seats
                    </span>
                    <span style={{ fontSize: "10px", color: "#555570", textDecoration: "line-through" }}>$5/seat/mes</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", borderRadius: "6px", padding: "3px 8px", fontSize: "10px", fontWeight: 700, color: "#4ade80" }}>
                      EliteLabs lo patrocina · GRATIS
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Extra credits section ── */}
      <div id="creditos-extra" style={{ marginTop: "44px", marginBottom: "16px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#e5e7eb", marginBottom: "3px" }}>Créditos extra</p>
        <p style={{ fontSize: "13px", color: "#3a3a52" }}>Compra créditos adicionales a tu plan. Válidos 3 meses, pago único.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {[
          { key: "100k", credits: 100_000,   price: 5,  label: "100.000 créditos" },
          { key: "300k", credits: 300_000,   price: 12, label: "300.000 créditos" },
          { key: "600k", credits: 600_000,   price: 19, label: "600.000 créditos" },
          { key: "1m",   credits: 1_000_000, price: 30, label: "1.000.000 créditos" },
        ].map((pack) => (
          <div
            key={pack.key}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: "12px", border: "1px solid #1e1e2e", background: "#0d0d17" }}
          >
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#e5e7eb" }}>{pack.label}</p>
              <p style={{ fontSize: "11px", color: "#3a3a52", marginTop: "2px" }}>
                {costPer10k(pack.price, pack.credits)} · Válidos 3 meses
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>${pack.price}</span>
              <button
                onClick={() => setActivePack(pack.key)}
                style={{ padding: "8px 18px", borderRadius: "9px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}
              >
                Comprar →
              </button>
            </div>
          </div>
        ))}
      </div>

      {successCredits !== null && (
        <div className="mt-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <Check size={18} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 font-medium text-sm">
            ¡Recarga exitosa! Se han añadido <strong>{successCredits.toLocaleString("es-ES")}</strong> créditos extra a tu cuenta.
          </p>
        </div>
      )}

      {activePlan && (
        <PaymentModal
          plan={activePlan}
          billing={billing}
          onClose={() => setActivePlan(null)}
          onSuccess={() => {
            setActivePlan(null);
            onRefresh();
          }}
        />
      )}

      {activePack && (
        <CreditPackModal
          packKey={activePack}
          onClose={() => setActivePack(null)}
          onSuccess={(credits) => {
            setActivePack(null);
            setSuccessCredits(credits);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Translate Tab ───────────────────────────────────────── */
const TRANSLATE_LANGS = [
  { code: "en", label: "Inglés",    flag: "🇺🇸" },
  { code: "zh", label: "Chino",     flag: "🇨🇳" },
  { code: "de", label: "Alemán",    flag: "🇩🇪" },
  { code: "ja", label: "Japonés",   flag: "🇯🇵" },
  { code: "fr", label: "Francés",   flag: "🇫🇷" },
  { code: "es", label: "Español",   flag: "🇪🇸" },
  { code: "ko", label: "Coreano",   flag: "🇰🇷" },
  { code: "ar", label: "Árabe",     flag: "🇸🇦" },
  { code: "ru", label: "Ruso",      flag: "🇷🇺" },
  { code: "pt", label: "Portugués", flag: "🇧🇷" },
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

function TranslateTab({ onGenerated, voices, plan, transcriptionUsed, onBilling, selectedVoice, onVoiceChange }: {
  onGenerated: () => void;
  voices: Voice[];
  plan: string;
  transcriptionUsed: number;
  onBilling: () => void;
  selectedVoice: SelectedVoice | null;
  onVoiceChange: (v: SelectedVoice | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("en");
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
            <span className="font-semibold" style={{ color: "#93c5fd" }}>{plan === "enterprise" ? "10%" : "20%"}</span>{" "}
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
          onSelect={onVoiceChange}
          onClose={() => setShowBrowser(false)}
          plan={plan}
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

/* ─── TeamTab ─────────────────────────────────────────────── */
interface TeamMemberData {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  percentage: number;
  createdAt: string;
}

interface TeamData {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMemberData[];
}

const ENTERPRISE_CREDITS = 5_000_000;

function TeamTab({ credits }: { credits: number | null }) {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => {
        if (data.team) {
          setTeam(data.team);
          const p: Record<string, number> = {};
          data.team.members.forEach((m: TeamMemberData) => { p[m.id] = m.percentage; });
          setPercentages(p);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function flash(type: "error" | "success", msg: string) {
    if (type === "error") { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  }

  async function handleCreate() {
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash("error", data.error); return; }
      setTeam(data.team);
      setPercentages({});
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash("error", data.error); return; }
      setTeam((t) => t ? { ...t, members: [...t.members, data.member] } : t);
      setPercentages((p) => ({ ...p, [data.member.id]: 0 }));
      setInviteEmail("");
      flash("success", "Miembro añadido al equipo");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { flash("error", data.error); return; }
    setTeam((t) => t ? { ...t, members: t.members.filter((m) => m.id !== memberId) } : t);
    setPercentages((p) => { const c = { ...p }; delete c[memberId]; return c; });
  }

  async function handleDeleteTeam() {
    setDeletingTeam(true);
    try {
      const res = await fetch("/api/team", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { flash("error", data.error); setShowDeleteModal(false); return; }
      setTeam(null);
      setShowDeleteModal(false);
    } finally {
      setDeletingTeam(false);
    }
  }

  async function handleSaveDistribution() {
    if (!team) return;
    setSaving(true);
    try {
      const distributions = team.members.map((m) => ({
        memberId: m.id,
        percentage: percentages[m.id] ?? 0,
      }));
      const res = await fetch("/api/team/distribute", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distributions }),
      });
      const data = await res.json();
      if (!res.ok) { flash("error", data.error); return; }
      setTeam(data.team);
      flash("success", "Distribución guardada");
    } finally {
      setSaving(false);
    }
  }

  const totalAssigned = Object.values(percentages).reduce((sum, p) => sum + (p || 0), 0);
  const ownerPercent = 100 - totalAssigned;
  const ownerCredits = Math.floor(ENTERPRISE_CREDITS * ownerPercent / 100);

  const cardStyle = { background: "#0d0d17", borderColor: "#2a2a3e" };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-10 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-lg mx-auto py-10 space-y-6">
        <div className="rounded-2xl border p-8 text-center space-y-3" style={cardStyle}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(59,130,246,0.1)" }}>
            <Users size={26} style={{ color: "#3b82f6" }} />
          </div>
          <h2 className="text-lg font-bold text-white">Crear tu equipo</h2>
          <p className="text-sm" style={{ color: "#8888a8" }}>
            Crea un equipo para distribuir caracteres mensuales entre tus miembros automáticamente cada mes.
          </p>
        </div>
        <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "#555570" }}>
            Nombre del equipo
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ej. Equipo de Marketing"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-200 focus:outline-none"
            style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !teamName.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            {creating ? "Creando..." : "Crear equipo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.12)" }}>
          <Users size={18} style={{ color: "#3b82f6" }} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">{team.name}</h2>
          <p className="text-xs" style={{ color: "#555570" }}>{team.members.length} miembro{team.members.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Credits summary */}
      <div className="rounded-2xl border p-5 space-y-3" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#555570" }}>
          Resumen de créditos este mes
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: "#12121a", border: "1px solid #1e1e2e" }}>
            <p className="text-xs mb-1" style={{ color: "#555570" }}>Total equipo</p>
            <p className="text-sm font-bold text-white">{ENTERPRISE_CREDITS.toLocaleString("es-ES")}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#12121a", border: "1px solid #1e1e2e" }}>
            <p className="text-xs mb-1" style={{ color: "#555570" }}>Tu parte ({ownerPercent}%)</p>
            <p className="text-sm font-bold" style={{ color: "#93c5fd" }}>{ownerCredits.toLocaleString("es-ES")}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#12121a", border: "1px solid #1e1e2e" }}>
            <p className="text-xs mb-1" style={{ color: "#555570" }}>Distribuidos</p>
            <p className="text-sm font-bold" style={{ color: totalAssigned > 100 ? "#f87171" : "#4ade80" }}>{totalAssigned}%</p>
          </div>
        </div>
        {totalAssigned > 100 && (
          <p className="text-xs font-medium text-center" style={{ color: "#f87171" }}>
            Los porcentajes superan el 100%. Ajústalos antes de guardar.
          </p>
        )}
      </div>

      {/* Members */}
      <div className="rounded-2xl border p-5 space-y-4" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#555570" }}>
          Miembros y distribución
        </p>

        {team.members.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "#555570" }}>
            Aún no hay miembros. Invita a alguien abajo.
          </p>
        ) : (
          <div className="space-y-3">
            {team.members.map((member) => {
              const pct = percentages[member.id] ?? 0;
              const chars = Math.floor(ENTERPRISE_CREDITS * pct / 100);
              return (
                <div key={member.id} className="rounded-xl p-4 space-y-3" style={{ background: "#12121a", border: "1px solid #1e1e2e" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                        {(member.name ?? member.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{member.name ?? member.email}</p>
                        <p className="text-xs truncate" style={{ color: "#555570" }}>{member.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ml-2"
                      style={{ color: "#555570", background: "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#555570")}
                      title="Eliminar miembro"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) => setPercentages((p) => ({ ...p, [member.id]: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => setPercentages((p) => ({ ...p, [member.id]: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        className="w-14 px-2 py-1 rounded-lg text-sm text-center text-white focus:outline-none"
                        style={{ background: "#0a0a12", border: "1px solid #2a2a3e" }}
                      />
                      <span className="text-xs" style={{ color: "#555570" }}>%</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "#555570" }}>
                    {chars.toLocaleString("es-ES")} caracteres / mes
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm px-1" style={{ color: "#f87171" }}>{error}</p>}
        {success && <p className="text-sm px-1" style={{ color: "#4ade80" }}>{success}</p>}

        {team.members.length > 0 && (
          <>
            <button
              onClick={handleSaveDistribution}
              disabled={saving || totalAssigned > 100}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
            >
              {saving ? "Guardando..." : "Guardar distribución"}
            </button>
            <p className="text-xs text-center leading-relaxed" style={{ color: "#555570" }}>
              Los cambios se aplican inmediatamente. En cada renovación mensual los créditos se redistribuyen automáticamente.
            </p>
          </>
        )}
      </div>

      {/* Invite */}
      <div className="rounded-2xl border p-5 space-y-3" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#555570" }}>
          Invitar miembro
        </p>
        <p className="text-xs" style={{ color: "#555570" }}>
          El usuario debe tener cuenta activa en Elite Labs.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm text-gray-200 focus:outline-none"
            style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            {inviting ? "..." : "Invitar"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border p-5" style={{ background: "#0d0d17", borderColor: "#3a1a1a" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7a3a3a" }}>
          Zona de peligro
        </p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "#555570" }}>
            Al eliminar el equipo los créditos asignados a los miembros se devolverán a tu cuenta.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          >
            Eliminar equipo
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl border p-6 w-full max-w-sm space-y-4" style={{ background: "#0d0d17", borderColor: "#2a2a3e" }}>
            <h3 className="text-base font-bold text-white">¿Eliminar el equipo &ldquo;{team.name}&rdquo;?</h3>
            <p className="text-sm" style={{ color: "#8888a8" }}>
              Los créditos asignados a los miembros se devolverán automáticamente a tu cuenta antes de eliminar el equipo. Los miembros perderán acceso inmediatamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingTeam}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "#1a1a2e", border: "1px solid #2a2a3e", color: "#8888a8" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deletingTeam}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
              >
                {deletingTeam ? "Eliminando..." : "Eliminar equipo"}
              </button>
            </div>
          </div>
        </div>
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
  const [extraCredits, setExtraCredits] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [effectivePlan, setEffectivePlan] = useState<string>("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [transcriptionUsed, setTranscriptionUsed] = useState<number>(0);
  const [memberInfo, setMemberInfo] = useState<{ percentage: number; creditsLastDistributed: number; teamName: string } | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [translateVoice, setTranslateVoice] = useState<SelectedVoice | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nextRenewalDate, setNextRenewalDate] = useState<string | null>(null);
  const [daysUntilRenewal, setDaysUntilRenewal] = useState<number | null>(null);
  const { t: tt, toggle: toggleLang } = useLang();

  const fetchCredits = useCallback(async () => {
    const res = await fetch("/api/credits");
    const data = await res.json();
    setCredits(data.characters);
    if (typeof data.extraCredits === "number") setExtraCredits(data.extraCredits);
    if (data.plan) setPlan(data.plan);
    if (data.effectivePlan) setEffectivePlan(data.effectivePlan);
    if ("planExpiresAt" in data) setPlanExpiresAt(data.planExpiresAt);
    if (typeof data.transcriptionUsed === "number") setTranscriptionUsed(data.transcriptionUsed);
    if ("nextRenewalDate" in data) setNextRenewalDate(data.nextRenewalDate);
    if (typeof data.daysUntilRenewal === "number") setDaysUntilRenewal(data.daysUntilRenewal);
  }, []);

  const fetchVoices = useCallback(async () => {
    const res = await fetch("/api/voices");
    const data = await res.json();
    setVoices(data);
  }, []);

  const fetchMemberInfo = useCallback(async () => {
    const res = await fetch("/api/team");
    if (!res.ok) return;
    const data = await res.json();
    if (data.memberInfo) setMemberInfo(data.memberInfo);
  }, []);

  useEffect(() => {
    fetchCredits();
    fetchVoices();
    fetchMemberInfo();
  }, [fetchCredits, fetchVoices, fetchMemberInfo]);

  const successPlan     = searchParams.get("plan");
  const creditsBought   = searchParams.get("creditsBought");

  function handleUseVoice(voice: SelectedVoice) {
    setSelectedVoice(voice);
    setActiveTab("generate");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#0a0a0f" }}>
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: "260px", background: "#0d0d17", borderRight: "1px solid #1e1e2e" }}
      >
        <Sidebar credits={credits} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} plan={plan} memberInfo={memberInfo} />
      </div>

      {/* Desktop sidebar */}
      <Sidebar credits={credits} activeTab={activeTab} setActiveTab={setActiveTab} desktop plan={plan} memberInfo={memberInfo} />

      <main className="flex-1 overflow-auto relative min-w-0" style={{ padding: "0" }}>
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
            team:       { title: "Equipo",            Icon: Users },
          };
          const { title, Icon } = TAB_META[activeTab] ?? { title: "", Icon: Home };
          return (
            <div style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #1a1a28", background: "#0a0a0f", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Hamburger — mobile only */}
                <button
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "transparent", cursor: "pointer", color: "#8888a8", flexShrink: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="12.5" width="16" height="1.5" rx="0.75" fill="currentColor"/></svg>
                </button>
                <Icon size={16} style={{ color: "#4a4a65" }} />
                <span className="hidden sm:inline" style={{ fontSize: "14px", fontWeight: 600, color: "#e5e7eb" }}>{title}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
        <div className="p-4">
        {successPlan && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium text-sm">
              ¡Suscripción activada! Tu plan <strong className="capitalize">{successPlan}</strong> ya está activo.
            </p>
          </div>
        )}
        {creditsBought && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium text-sm">
              ¡Recarga exitosa! Se han añadido <strong>{parseInt(creditsBought).toLocaleString("es-ES")}</strong> créditos extra a tu cuenta.
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
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            plan={effectivePlan}
          />
        )}
        {activeTab === "voices" && (
          <VoicesTab
            voices={voices}
            onRefresh={fetchVoices}
            onUseVoice={handleUseVoice}
            plan={effectivePlan}
          />
        )}
        {activeTab === "history" && <HistoryTab plan={effectivePlan} />}
        {activeTab === "billing" && (
          <BillingTab
            credits={credits}
            extraCredits={extraCredits}
            plan={plan}
            planExpiresAt={planExpiresAt}
            nextRenewalDate={nextRenewalDate}
            daysUntilRenewal={daysUntilRenewal}
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
            plan={effectivePlan}
            transcriptionUsed={transcriptionUsed}
            onBilling={() => setActiveTab("billing")}
            selectedVoice={translateVoice}
            onVoiceChange={setTranslateVoice}
          />
        )}
        {activeTab === "transcribe" && (
          <TranscribeTab
            onTranscribed={fetchCredits}
            plan={effectivePlan}
            transcriptionUsed={transcriptionUsed}
            onBilling={() => setActiveTab("billing")}
          />
        )}
        {activeTab === "team" && <TeamTab credits={credits} />}
        </div>{/* end page content */}
      </main>
    </div>
  );
}
