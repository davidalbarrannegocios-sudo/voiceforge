// v2
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { Home, Mic, Mic2, Users, Clock, Check, Play, Pause, CreditCard, Gift, Copy, Globe, FileAudio, Type, User, HelpCircle, Languages, Trash2, MoreVertical, AudioWaveform, Zap, Search, MoreHorizontal, RefreshCw, Share2, Download, Upload, X, Square, DollarSign, ChevronRight, ChevronsUpDown, Info, Settings, MessageSquare } from "lucide-react";
import { DialogueEditor } from "@/components/DialogueEditor";
import { ImageVideoEditor } from "@/components/ImageVideoEditor";
import { Image as ImageIcon } from "lucide-react";
import { calculateCharCost, formatDate } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";
import { VoiceBrowser, SelectedVoice, VoiceAvatar, getGender, formatCount } from "./VoiceBrowser";
import { AudioPlayer } from "./AudioPlayer";
import { SupportModal } from "./SupportModal";
import { ManageBillingPanel } from "./BillingModal";
import { useLang } from "./LanguageContext";
import AudioHistoryList from "@/components/AudioHistoryList";
import { CustomSelect } from "@/components/CustomSelect";
import { VoiceAvatarGenerative } from "@/components/VoiceAvatarGenerative";
import { generateVoiceGradient } from "@/lib/voice-gradient";
import { TaggedTextEditor } from "@/components/TaggedTextEditor";
import { NoCreditsModal } from "@/components/NoCreditsModal";

/* ─── Types ──────────────────────────────────────────────── */
interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: string;
  isSystem: boolean;
  fishAudioModelId?: string;
  minimaxVoiceId?: string;
  provider?: string;
  createdAt?: string;
  clipCount?: number;
  isPublic?: boolean;
}

type Tab = "home" | "generate" | "voices" | "history" | "billing" | "referral" | "translate" | "transcribe" | "team" | "dialogue" | "imagevideo";

/* ─── Sidebar ─────────────────────────────────────────────── */
type NavSection = {
  label?: string;
  items: { key: Tab; label: string; Icon: React.ElementType }[];
};

function Sidebar({
  activeTab,
  setActiveTab,
  onClose,
  desktop = false,
  plan,
  memberInfo,
  collapsed = false,
}: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  onClose?: () => void;
  desktop?: boolean;
  plan?: string;
  memberInfo?: { percentage: number; creditsLastDistributed: number; teamName: string } | null;
  collapsed?: boolean;
}) {
  const { t } = useLang();
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showProductMenu, setShowProductMenu] = useState(false);

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setLeaving(false);
    }
  }

  const platformItems: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: "billing",  label: t.nav.billing,   Icon: CreditCard },
    { key: "referral", label: t.nav.referrals, Icon: Gift },
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
        { key: "dialogue",   label: "Texto a Diálogo", Icon: MessageSquare },
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

  function handleNav(key: Tab) {
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
        ...(desktop ? {
          width: collapsed ? "64px" : "240px",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          borderRight: "1px solid #1a1a1a",
          transition: "width 0.2s ease-in-out",
          overflowX: "hidden",
        } : {}),
        background: "#111111",
      }}
    >
      {/* Logo */}
      <div style={{ height: "56px", display: "flex", alignItems: "center", paddingLeft: collapsed && desktop ? "0" : "20px", paddingRight: collapsed && desktop ? "0" : "20px", justifyContent: collapsed && desktop ? "center" : "flex-start", flexShrink: 0 }}>
        <Link href="/" className="flex items-center gap-2.5" title={collapsed && desktop ? "Elite Labs" : undefined}>
          <Image
            src="/elitelabs.png"
            alt="Elite Labs"
            width={28}
            height={28}
            style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast", flexShrink: 0 }}
            className="rounded-lg"
          />
          {!(collapsed && desktop) && <span className="font-bold text-white tracking-tight text-sm">Elite Labs</span>}
        </Link>
      </div>

      {/* Product selector */}
      {!(collapsed && desktop) && (
        <div className="px-3 pb-2 relative flex-shrink-0">
          <button
            onClick={() => setShowProductMenu(p => !p)}
            className="w-full flex items-center justify-between gap-2
                       px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8
                       border border-white/8 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎙️</span>
              <span className="text-sm font-medium text-white">Elite Studio</span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-white/30" />
          </button>

          {showProductMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProductMenu(false)} />
              <div className="absolute top-full left-3 right-3 mt-1 z-50
                              bg-[#111] border border-white/10 rounded-xl
                              shadow-2xl p-1">

                {/* Elite Studio — activo */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/8">
                  <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10
                                  flex items-center justify-center text-sm flex-shrink-0">
                    🎙️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Elite Studio</p>
                    <p className="text-xs text-white/40">Genera y clona voz con IA</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                </div>

                {/* Elite API — en desarrollo */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg opacity-40 cursor-not-allowed">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8
                                  flex items-center justify-center text-sm flex-shrink-0">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white">Elite API</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full
                                       bg-white/5 text-white/30 border border-white/8">
                        Pronto
                      </span>
                    </div>
                    <p className="text-xs text-white/40">API de síntesis de voz</p>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: "8px", paddingBottom: "8px", paddingLeft: collapsed && desktop ? "8px" : "12px", paddingRight: collapsed && desktop ? "8px" : "12px", overflowY: "auto" }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: si < sections.length - 1 ? "20px" : 0 }}>
            {section.label && !(collapsed && desktop) && (
              <p style={{ paddingLeft: "12px", marginBottom: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#444444" }}>
                {section.label}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map(({ key, label, Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleNav(key)}
                    title={collapsed && desktop ? label : undefined}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed && desktop ? "center" : "flex-start",
                      gap: collapsed && desktop ? 0 : "10px",
                      padding: collapsed && desktop ? "8px 0" : "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                      color: isActive ? "#aaaaaa" : "#555555",
                    }}
                  >
                    <Icon size={15} style={{ color: isActive ? "#aaaaaa" : "#444444", flexShrink: 0 }} />
                    {!(collapsed && desktop) && (
                      <>
                        <span style={{ flex: 1 }}>{label}</span>
                        {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Mi cuenta */}
        <Link
          href="/dashboard/mi-cuenta"
          title={collapsed && desktop ? "Mi cuenta" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && desktop ? "center" : "flex-start",
            gap: collapsed && desktop ? 0 : "10px",
            padding: collapsed && desktop ? "8px 0" : "8px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            marginTop: "2px",
            transition: "background 0.15s",
            background: "transparent",
            color: "#555555",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#d1d5db"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555555"; }}
        >
          <Settings size={15} style={{ color: "#444444", flexShrink: 0 }} />
          {!(collapsed && desktop) && <span style={{ flex: 1 }}>Mi cuenta</span>}
        </Link>
      </nav>

      {/* Team membership section — only for non-owner members */}
      {memberInfo && !(collapsed && desktop) && (
        <div style={{ borderTop: "1px solid #1a1a1a", padding: "12px 20px 16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#444444", marginBottom: "8px" }}>
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
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "1px solid #222222", background: "transparent", color: "#555555", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
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
              <div style={{ background: "#111111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={14} style={{ color: "#ffffff" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {memberInfo.teamName}
                  </p>
                  <p style={{ fontSize: "11px", color: "#444444", marginTop: "1px" }}>
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

      {/* Upgrade button — hidden for enterprise */}
      {plan !== "enterprise" && (
        <div style={{ padding: collapsed && desktop ? "0 8px 0" : "0 12px 0", flexShrink: 0 }}>
          <button
            onClick={() => { setActiveTab("billing"); onClose?.(); }}
            title={collapsed && desktop ? "Mejorar plan" : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed && desktop ? "center" : "flex-start",
              gap: collapsed && desktop ? 0 : "8px",
              padding: collapsed && desktop ? "10px 0" : "10px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              background: "#111111",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "#111111"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "#111111"; }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)",
              }}
            />
            <div style={{ position: "relative", zIndex: 1, width: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={13} style={{ color: "#aaaaaa" }} />
            </div>
            {!(collapsed && desktop) && (
              <>
                <span style={{ position: "relative", zIndex: 1, fontSize: "13px", fontWeight: 600, color: "#cccccc", flex: 1, textAlign: "left" }}>Mejorar plan</span>
                <svg style={{ position: "relative", zIndex: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

    </aside>
  );
}

/* ─── Home Tab ────────────────────────────────────────────── */
interface RecentGeneration {
  id: string
  voiceId?: string
  voiceName?: string
  text?: string
  audioUrl?: string
  createdAt: string
}

interface ClonedVoiceItem {
  id: string
  name: string
  provider?: string
  isSystem?: boolean
}

function HomeTab({
  user,
  credits,
  setActiveTab,
}: {
  user: { firstName?: string | null } | null | undefined;
  credits: number | null;
  setActiveTab: (t: Tab) => void;
}) {
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([])
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/history?page=1').then(r => r.json()) as Promise<{ generations: RecentGeneration[] }>,
      fetch('/api/voices').then(r => r.json()) as Promise<ClonedVoiceItem[]>,
    ]).then(([gens, voices]) => {
      setRecentGenerations((gens.generations ?? []).slice(0, 4))
      setClonedVoices(voices.filter(v => !v.isSystem).slice(0, 4))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const PRODUCT_CARDS = [
    { id: 'generate',   title: 'Texto a Voz',         description: 'Convierte texto en voz natural al instante',            Icon: Type },
    { id: 'dialogue',   title: 'Texto a Diálogo',      description: 'Genera audios con múltiples voces y personajes',        Icon: MessageSquare },
    { id: 'transcribe', title: 'Audio a Texto',         description: 'Transcribe cualquier audio a texto al instante',        Icon: FileAudio },
    { id: 'translate',   title: 'Traducción de Audio',   description: 'Traduce tus audios a otros idiomas automáticamente',  Icon: Globe },
    { id: 'imagevideo',  title: 'Imagen y Video',        description: 'Genera imágenes y vídeos con IA',                      Icon: ImageIcon },
  ]

  return (
    <div className="space-y-8">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {user?.firstName ?? 'Usuario'}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#555555" }}>
          <span style={{ color: "#aaaaaa", fontWeight: 600 }}>
            {credits !== null ? credits.toLocaleString('es-ES') : '—'}
          </span>{' '}
          caracteres disponibles
        </p>
      </div>

      {/* 4 cards de productos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PRODUCT_CARDS.map((card, i) => {
          const Icon = card.Icon
          return (
            <button
              key={card.id}
              onClick={() => setActiveTab(card.id as Tab)}
              className="group relative overflow-hidden flex flex-col p-5 rounded-2xl border hover:border-white/20 text-left transition-all hover:-translate-y-0.5"
              style={{ background: "#111111", borderColor: "#1e1e1e" }}
            >
              <svg
                className={`absolute top-0 right-0 w-36 h-36 opacity-15 group-hover:opacity-25 transition-opacity duration-300 wave-anim-${(i % 3) + 1}`}
                style={{ animationDelay: `${-i * 2}s` }}
                viewBox="0 0 160 160" fill="none"
              >
                {i === 0 && <>
                  <path d="M160 0 Q120 40 160 80" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none"/>
                  <path d="M160 20 Q110 60 160 100" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none"/>
                  <path d="M160 40 Q100 80 160 120" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" fill="none"/>
                </>}
                {i === 1 && <>
                  <ellipse cx="130" cy="30" rx="40" ry="20" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" fill="none"/>
                  <ellipse cx="140" cy="60" rx="30" ry="15" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
                  <ellipse cx="148" cy="85" rx="20" ry="10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" fill="none"/>
                </>}
                {i === 2 && <>
                  <path d="M120 0 L160 40 L160 0 Z" fill="rgba(255,255,255,0.08)"/>
                  <path d="M140 0 L160 20 L160 0 Z" fill="rgba(255,255,255,0.12)"/>
                  <circle cx="150" cy="60" r="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none"/>
                </>}
                {i === 3 && <>
                  <path d="M80 0 Q120 30 160 20 Q140 60 160 80" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none"/>
                  <path d="M100 0 Q130 40 160 40" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none"/>
                  <path d="M120 0 Q145 35 160 60" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" fill="none"/>
                </>}
              </svg>

              <div className="relative z-10">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
                     style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Icon size={16} style={{ color: "#aaaaaa" }} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{card.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#555555" }}>{card.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Últimas generaciones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Historia de la generación</h2>
          <button onClick={() => setActiveTab('history')}
                  className="text-xs transition-colors"
                  style={{ color: "#555555" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#555555")}>
            Ver todo →
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : recentGenerations.length === 0 ? (
          <div className="text-center py-8 text-sm rounded-xl"
               style={{ color: "#444444", border: "1px dashed #222222" }}>
            Aún no tienes generaciones.{' '}
            <button onClick={() => setActiveTab('generate')}
                    className="underline transition-colors"
                    style={{ color: "#666666" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#666666")}>
              Crear primera →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentGenerations.map(gen => (
              <div key={gen.id}
                   className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                   style={{ border: "1px solid #1a1a1a", background: "rgba(255,255,255,0.01)" }}
                   onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                   onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}>
                <div className="w-9 h-9 rounded-lg flex-shrink-0"
                     style={{ background: generateVoiceGradient(gen.voiceId ?? gen.id) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#cccccc" }}>
                    {gen.voiceName ?? 'Voz'}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#444444" }}>
                    {gen.text?.slice(0, 70)}{(gen.text?.length ?? 0) > 70 ? '…' : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <p className="text-xs" style={{ color: "#444444" }}>
                    {new Date(gen.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                  {gen.audioUrl && (
                    <a href={gen.audioUrl} download
                       className="text-xs transition-colors"
                       style={{ color: "#555555" }}
                       onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                       onMouseLeave={e => (e.currentTarget.style.color = "#555555")}>
                      ↓ MP3
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Últimas voces clonadas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Mis voces clonadas</h2>
          <button onClick={() => setActiveTab('voices')}
                  className="text-xs transition-colors"
                  style={{ color: "#555555" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#555555")}>
            Ver todo →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : clonedVoices.length === 0 ? (
          <div className="text-center py-8 text-sm rounded-xl"
               style={{ color: "#444444", border: "1px dashed #222222" }}>
            No tienes voces clonadas.{' '}
            <button onClick={() => setActiveTab('voices')}
                    className="underline transition-colors"
                    style={{ color: "#666666" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#666666")}>
              Clonar voz →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {clonedVoices.map(voice => (
              <button
                key={voice.id}
                onClick={() => setActiveTab('voices')}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                style={{ border: "1px solid #1a1a1a", background: "rgba(255,255,255,0.01)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}>
                <div className="w-10 h-10 rounded-lg flex-shrink-0"
                     style={{ background: generateVoiceGradient(voice.id) }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#cccccc" }}>{voice.name}</p>
                  <p className="text-xs capitalize" style={{ color: "#444444" }}>
                    {voice.provider === 'minimax' ? 'MiniMax' : 'Fish Audio'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

/* ─── Slider + numeric input control ─────────────────────── */
function CompactSlider({
  label, value, onChange, min, max, step, decimals, defaultValue,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; decimals: number; defaultValue: number;
}) {
  const [inputText, setInputText] = useState(value.toFixed(decimals));
  const isDefault = value === defaultValue;

  useEffect(() => { setInputText(value.toFixed(decimals)); }, [value, decimals]);

  function commitInput(raw: string) {
    const parsed = parseFloat(raw);
    const clamped = isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed));
    const rounded = parseFloat((Math.round(clamped / step) * step).toFixed(decimals));
    onChange(rounded);
    setInputText(rounded.toFixed(decimals));
  }

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      className="flex items-center gap-3 px-3.5"
      style={{ background: "#111111", borderRadius: "10px", height: "40px" }}
    >
      <span className="text-xs font-medium flex-shrink-0 w-20" style={{ color: "#888888" }}>{label}</span>
      <div className="flex-1 relative flex items-center" style={{ height: "4px" }}>
        <div className="w-full h-full rounded-full" style={{ background: "#222222" }} />
        <div
          className="absolute left-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: "#ffffff" }}
        />
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: "100%", margin: 0 }}
        />
      </div>
      <input
        type="number"
        min={min} max={max} step={step}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onBlur={(e) => commitInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commitInput((e.target as HTMLInputElement).value)}
        className="text-xs font-mono text-right rounded-md outline-none flex-shrink-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        style={{
          width: "48px", minWidth: "48px", padding: "2px 4px",
          color: !isDefault ? "#aaaaaa" : "#e5e7eb",
          background: !isDefault ? "rgba(255,255,255,0.06)" : "transparent",
          border: "1px solid transparent",
        }}
      />
    </div>
  );
}

function M1Slider({
  label, leftLabel, rightLabel, value, onChange, min, max, step, defaultValue,
}: {
  label: string; leftLabel: string; rightLabel: string;
  value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; defaultValue: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = step < 0.1 ? 2 : step < 1 ? 2 : 0;
  const isDefault = value === defaultValue;
  return (
    <div style={{ background: "#111111", borderRadius: "10px", padding: "8px 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>{label}</span>
        <span style={{ fontSize: "11px", fontFamily: "monospace", color: isDefault ? "#e5e7eb" : "#aaaaaa" }}>{value.toFixed(decimals)}</span>
      </div>
      <div style={{ position: "relative", height: "4px", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "9999px", background: "#222222" }} />
        <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: "100%", borderRadius: "9999px", background: "#ffffff" }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", color: "#666666" }}>{leftLabel}</span>
        <span style={{ fontSize: "10px", color: "#666666" }}>{rightLabel}</span>
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
  const [showNoCredits, setShowNoCredits] = useState(false);
  const [speed, setSpeed] = useState<number>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).speed ?? 1.0) : 1.0; } catch { return 1.0; } });
  const [volume, setVolume] = useState<number>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).volume ?? 1.0) : 1.0; } catch { return 1.0; } });

  const [normalize, setNormalize] = useState<boolean>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).normalize ?? true) : true; } catch { return true; } });
  const [proNormText, setProNormText] = useState<boolean>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).normalizeText ?? false) : false; } catch { return false; } });
  const [proHighBitrate, setProHighBitrate] = useState<boolean>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).highBitrate ?? false) : false; } catch { return false; } });
  const [temperature, setTemperature] = useState<number>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).temperature ?? 0.9) : 0.9; } catch { return 0.9; } });
  const [topP, setTopP] = useState<number>(() => { try { const s = localStorage.getItem("elitelabs_fish_settings"); return s ? (JSON.parse(s).topP ?? 0.9) : 0.9; } catch { return 0.9; } });
  const [selectedModel, setSelectedModel] = useState<string>(() => { try { return localStorage.getItem("elitelabs_selected_model") ?? "speech-1.6"; } catch { return "speech-1.6"; } });
  const [turboAdminStatus, setTurboAdminStatus] = useState("active");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  // M1 (ElevenLabs) controls
  const [m1Speed, setM1Speed] = useState(1.0);
  const [m1Stability, setM1Stability] = useState(0.5);
  const [m1Similarity, setM1Similarity] = useState(0.75);
  const [m1StyleExag, setM1StyleExag] = useState(0);
  const [m1LangOverride, setM1LangOverride] = useState(false);
  const [m1OutputFormat, setM1OutputFormat] = useState("mp3_44100_128");
  const [m1SpeakerBoost, setM1SpeakerBoost] = useState(true);
  const [m1OutDropOpen, setM1OutDropOpen] = useState(false);
  const m1OutDropRef = useRef<HTMLDivElement>(null);
  const [previewing, setPreviewing] = useState<"idle" | "loading" | "playing">("idle");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const tagsAreaRef = useRef<HTMLDivElement>(null);
  const [rightTab, setRightTab] = useState<"ajustes" | "historial">("ajustes");
  const { t } = useLang();

  const [elapsed, setElapsed] = useState(0);

  const charCost = calculateCharCost(text.length);
  const displayCost = selectedModel === "turbo" ? Math.ceil(charCost / 2) : charCost;
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
    if (!m1OutDropOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (m1OutDropRef.current && !m1OutDropRef.current.contains(e.target as Node)) {
        setM1OutDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [m1OutDropOpen]);

  // Load M1 settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("elitelabs_m1_settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (typeof s.speed === "number") setM1Speed(s.speed);
        if (typeof s.stability === "number") setM1Stability(s.stability);
        if (typeof s.similarity === "number") setM1Similarity(s.similarity);
        if (typeof s.styleExag === "number") setM1StyleExag(s.styleExag);
        if (typeof s.langOverride === "boolean") setM1LangOverride(s.langOverride);
        if (typeof s.outputFormat === "string") setM1OutputFormat(s.outputFormat);
        if (typeof s.speakerBoost === "boolean") setM1SpeakerBoost(s.speakerBoost);
      }
    } catch { /* ignore */ }
  }, []);

  // Save M1 settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("elitelabs_m1_settings", JSON.stringify({
        speed: m1Speed, stability: m1Stability, similarity: m1Similarity,
        styleExag: m1StyleExag, langOverride: m1LangOverride,
        outputFormat: m1OutputFormat, speakerBoost: m1SpeakerBoost,
      }));
    } catch { /* ignore */ }
  }, [m1Speed, m1Stability, m1Similarity, m1StyleExag, m1LangOverride, m1OutputFormat, m1SpeakerBoost]);

  // Save Fish Audio settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("elitelabs_fish_settings", JSON.stringify({
        speed, volume, normalize, normalizeText: proNormText,
        highBitrate: proHighBitrate, temperature, topP,
      }));
    } catch { /* ignore */ }
  }, [speed, volume, normalize, proNormText, proHighBitrate, temperature, topP]);

  // Save selected model to localStorage on change
  useEffect(() => {
    try { localStorage.setItem("elitelabs_selected_model", selectedModel); } catch { /* ignore */ }
  }, [selectedModel]);

  useEffect(() => {
    const cached = localStorage.getItem("turboStatusCache");
    const cachedTime = localStorage.getItem("turboStatusCacheTime");
    if (cached && cachedTime && Date.now() - Number(cachedTime) < 300000) {
      setTurboAdminStatus(cached);
      return;
    }
    fetch("/api/admin/system-config")
      .then((r) => r.json())
      .then((d: { elitelabsTurboStatus?: string }) => {
        const status = d.elitelabsTurboStatus ?? "active";
        setTurboAdminStatus(status);
        localStorage.setItem("turboStatusCache", status);
        localStorage.setItem("turboStatusCacheTime", String(Date.now()));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turboDisabled = turboAdminStatus === "maintenance" || turboAdminStatus === "disabled";

  useEffect(() => {
    if (turboDisabled && selectedModel === "turbo") {
      setSelectedModel("speech-1.6");
      onVoiceChange(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turboDisabled]);

  useEffect(() => {
    if (!tagsOpen) return;
    function handleClick(e: MouseEvent) {
      if (tagsAreaRef.current && !tagsAreaRef.current.contains(e.target as Node)) {
        setTagsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tagsOpen]);

  const TAG_GROUPS = selectedModel === "speech-1.5"
    ? [
        { label: "Emociones básicas", tags: ["(happy)", "(sad)", "(angry)", "(excited)", "(calm)", "(nervous)", "(confident)", "(surprised)", "(satisfied)", "(delighted)", "(scared)", "(worried)", "(upset)", "(frustrated)", "(embarrassed)", "(empathetic)", "(disgusted)", "(moved)", "(proud)", "(relaxed)", "(grateful)", "(curious)", "(sarcastic)"] },
        { label: "Emociones avanzadas", tags: ["(disdainful)", "(unhappy)", "(anxious)", "(hysterical)", "(indifferent)", "(confused)", "(disappointed)", "(regretful)", "(guilty)", "(hopeful)", "(optimistic)", "(pessimistic)", "(nostalgic)", "(lonely)", "(bored)", "(contemptuous)", "(sympathetic)", "(determined)"] },
        { label: "Tono", tags: ["(in a hurry tone)", "(shouting)", "(screaming)", "(whispering)", "(soft tone)"] },
        { label: "Efectos de audio", tags: ["(laughing)", "(chuckling)", "(sobbing)", "(crying loudly)", "(sighing)", "(groaning)", "(panting)", "(gasping)", "(yawning)"] },
        { label: "Efectos especiales", tags: ["(audience laughing)", "(background laughter)", "(crowd laughing)", "(break)", "(long-break)"] },
      ]
    : [
        { label: "Tono emocional", tags: ["[angry]", "[sad]", "[embarrassed]", "[emphasis]", "[whispering]", "[soft]", "[breathy]", "[excited]"] },
        { label: "Efectos de audio", tags: ["[laughing]", "[chuckling]", "[moaning]", "[clear throat]", "[sobbing]", "[crying loudly]", "[sighing]", "[panting]", "[groaning]", "[crowd laughing]", "[background laughter]", "[audience laughing]", "[pause]", "[long pause]"] },
        { label: "Avanzadas", tags: ["[inhale]", "[exhale]", "[singing]", "[screaming]", "[shouting]", "[surprised]", "[shocked]", "[volume up]", "[volume down]", "[echo]", "[loud]", "[low volume]", "[whisper]", "[sigh]", "[short pause]", "[clearing throat]", "[delight]", "[with strong accent]"] },
      ];

  const tagSyntaxHint = selectedModel === "speech-1.5"
    ? "Las etiquetas (…) deben ir al inicio de cada frase"
    : "Las etiquetas […] deben ir al inicio de cada frase";

  function insertTagAtCursor(tag: string) {
    const editor = document.querySelector('[data-tts-editor]') as HTMLElement;
    if (!editor) return;
    editor.focus();
    document.execCommand('insertText', false, tag);
  }

  async function handleAutoTag() {
    if (!text.trim() || isAutoTagging) return;
    setIsAutoTagging(true);
    try {
      const res = await fetch("/api/tts/auto-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al etiquetar");
      if (data.taggedText) setText(data.taggedText);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al etiquetar automáticamente");
      setTimeout(() => setFormError(null), 3000);
    } finally {
      setIsAutoTagging(false);
    }
  }

  async function handleGenerate() {
    setFormError(null);
    if (selectedModel === "turbo" && turboDisabled) {
      setFormError("Elite Labs Turbo no está disponible en este momento. Por favor selecciona otro modelo.");
      return;
    }
    setSubmitting(true);
    try {
      if (selectedModel === "turbo") {
        // Turbo (ElevenLabs) — synchronous, waits for audio
        const turboBody = {
          text,
          voice_id: selectedVoice?.referenceId ?? undefined,
          voiceName: selectedVoice?.name ?? "Voz por defecto",
          provider: "elevenlabs",
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: m1Stability,
            similarity_boost: m1Similarity,
            style: m1StyleExag,
            use_speaker_boost: m1SpeakerBoost,
          },
          speed: m1Speed,
          language_code: m1LangOverride ? "auto" : undefined,
          output_format: m1OutputFormat,
        };
        const res = await fetch("/api/generate-ai33", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(turboBody),
        });
        const data = await res.json();
        if (res.status === 402) { setSubmitting(false); setShowNoCredits(true); return; }
        if (!res.ok) throw new Error(data.error || "Error al generar");
        window.dispatchEvent(new CustomEvent("audio-history-changed"));
        onGenerated();
        setText("");
        setRightTab("historial");
      } else {
        // Fish Audio — async background job
        const prosody = (speed !== 1 || volume !== 1) ? { speed, volume } : undefined;
        const res = await fetch("/api/tts-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            reference_id: selectedVoice?.referenceId ?? undefined,
            voiceName: selectedVoice?.name ?? "Voz por defecto",
            prosody,
            normalizeLoudness: normalize,
            model: selectedModel,
            ...(selectedModel === "speech-1.5" && { temperature, topP }),
            ...(selectedModel === "speech-1.6" && {
              normalizeText: proNormText,
              mp3Bitrate: proHighBitrate ? 192 : 128,
            }),
          }),
        });
        const data = await res.json();
        if (res.status === 402) { setSubmitting(false); setShowNoCredits(true); return; }
        if (!res.ok) throw new Error(data.error || "Error al generar");

        const { jobId } = data as { jobId: string };
        const jobEntry = {
          jobId,
          voiceName: selectedVoice?.name ?? "Voz por defecto",
          voiceId: selectedVoice?.referenceId ?? "default",
          text: text.slice(0, 80),
          createdAt: Date.now(),
        };

        // Persist so polling survives navigation/reload
        try {
          const stored = JSON.parse(localStorage.getItem("pendingTtsJobs") || "[]");
          stored.push(jobEntry);
          localStorage.setItem("pendingTtsJobs", JSON.stringify(stored));
        } catch { /* ignore */ }

        // Notify AudioHistoryList to show spinner card and start polling
        window.dispatchEvent(new CustomEvent("tts-job-created", { detail: jobEntry }));

        // Fire and forget — Railway keeps running even when client disconnects
        fetch("/api/tts-job/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });

        onGenerated();
        setText("");
        setRightTab("historial");
      }
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
      const prosody = (speed !== 1 || volume !== 1) ? { speed, volume } : undefined;
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

  const voiceGender = selectedVoice?.tags ? getGender(selectedVoice.tags) : null;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 88px)", overflow: "auto" }}>

      {/* ── Unified two-column container ── */}
      <div className="flex flex-col lg:flex-row" style={{ flex: 1, minHeight: 0, maxHeight: "calc(100vh - 120px)", background: "#000000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden" }}>

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-64 lg:min-h-0 border-b lg:border-b-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>

          {/* Left header: avatar + voice name → opens browser */}
          <button
            onClick={() => setShowBrowser(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", flexShrink: 0, width: "100%", textAlign: "left", background: "transparent", cursor: "pointer", border: "none" }}
          >
            <div className="ring-2 ring-white/30 ring-offset-1 ring-offset-[#000000] rounded-lg flex-shrink-0">
              <VoiceAvatar name={selectedVoice?.name ?? "V"} coverImage={selectedVoice?.coverImage} size="xs" id={selectedVoice?.referenceId} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 400, color: "#9ca3af" }}>{selectedVoice?.name ?? t.generate.defaultVoice}</span>
          </button>

          {/* Tags toolbar — only for Fish Audio (M2) models */}
          {selectedModel !== "turbo" && (
            <div ref={tagsAreaRef} style={{ position: "relative", padding: "0 12px 6px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={() => setTagsOpen(o => !o)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, background: tagsOpen ? "rgba(255,255,255,0.08)" : "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", cursor: "pointer" }}
                >
                  Etiquetas
                  <span style={{ display: "inline-block", transition: "transform 0.15s", transform: tagsOpen ? "rotate(90deg)" : "none", fontSize: "10px" }}>›</span>
                </button>
                <button
                  onClick={handleAutoTag}
                  disabled={isAutoTagging || !text.trim()}
                  title="Añade etiquetas de emoción automáticamente con IA"
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: isAutoTagging || !text.trim() ? "#444444" : "#9ca3af", cursor: isAutoTagging || !text.trim() ? "not-allowed" : "pointer", transition: "color 0.15s, border-color 0.15s" }}
                >
                  {isAutoTagging ? (
                    <><svg style={{ width: "11px", height: "11px", animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Etiquetando...</>
                  ) : <>✦ Etiquetado automático</>}
                </button>
              </div>

              {tagsOpen && (
                <div className="tags-panel" style={{ position: "absolute", top: "calc(100% + 4px)", left: "12px", zIndex: 50, background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "14px 16px", minWidth: "340px", maxWidth: "520px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxHeight: "60vh", overflowY: "auto" }}>
                  {TAG_GROUPS.map((group, gi) => (
                    <div key={group.label} style={{ marginBottom: gi < TAG_GROUPS.length - 1 ? "12px" : "10px" }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555555", marginBottom: "8px" }}>{group.label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {group.tags.map(tag => (
                          <button
                            key={tag}
                            onMouseDown={e => { e.preventDefault(); insertTagAtCursor(tag); }}
                            style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d5db", cursor: "pointer", transition: "background 0.1s, color 0.1s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#2a2a2a"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"; }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: "10px", color: "#444444", marginTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                    💡 {tagSyntaxHint}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tagged text editor (contenteditable) */}
          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <TaggedTextEditor
              value={text}
              onChange={setText}
              isS2={selectedModel !== "speech-1.5"}
              placeholder={t.generate.placeholder}
              disabled={submitting}
            />
          </div>

          {/* Left footer */}
          <div style={{ flexShrink: 0 }}>
            {submitting && (
              <div style={{ padding: "10px 16px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "#aaaaaa" }}>Generando audio... {Math.round(progress)}%</span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>{elapsedLabel}</span>
                </div>
                <div style={{ height: "3px", borderRadius: "9999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "9999px", width: `${progress}%`, background: "#ffffff", transition: "width 1s linear" }} />
                </div>
              </div>
            )}
            {formError && (
              <div style={{ margin: "10px 16px 0", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                {formError}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>
                {text.length.toLocaleString("es-ES")} {t.generate.characters}
                {text.length > 0 && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#444444" }}>· {displayCost.toLocaleString("es-ES")} {t.generate.credits}</span>}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {plan !== "free" && (
                  <button
                    onClick={handlePreview}
                    disabled={previewing === "loading"}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: previewing === "playing" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${previewing === "playing" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`, color: previewing === "playing" ? "#f87171" : previewing === "loading" ? "#6b7280" : "#aaaaaa", cursor: previewing === "loading" ? "not-allowed" : "pointer", opacity: previewing === "loading" ? 0.6 : 1 }}
                  >
                    {previewing === "loading" && <svg className="animate-spin" style={{ width: "12px", height: "12px" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    {previewing === "idle" && "▶ Pre-escuchar"}
                    {previewing === "loading" && "Generando..."}
                    {previewing === "playing" && "⏹ Detener"}
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={submitting || text.trim().length === 0}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#000000", border: "none", cursor: submitting || text.trim().length === 0 ? "not-allowed" : "pointer", background: "#ffffff", boxShadow: submitting ? "none" : "0 4px 15px rgba(255,255,255,0.1)", opacity: submitting || text.trim().length === 0 ? 0.6 : 1 }}
                >
                  {submitting ? <><svg className="animate-spin" style={{ width: "14px", height: "14px" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t.generate.generating}</> : t.generate.generateBtn}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col min-h-0">

          {/* Sliding pill tab toggle */}
          <div style={{ padding: "12px", flexShrink: 0 }}>
            <div style={{ position: "relative", display: "flex", background: "#111111", borderRadius: "8px", padding: "4px" }}>
              <div style={{ position: "absolute", top: "4px", bottom: "4px", left: "4px", width: "calc(50% - 4px)", background: "#222222", borderRadius: "6px", transform: rightTab === "ajustes" ? "translateX(0)" : "translateX(100%)", transition: "transform 200ms ease-out" }} />
              <button onClick={() => setRightTab("ajustes")} style={{ position: "relative", zIndex: 10, flex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 500, textAlign: "center", color: rightTab === "ajustes" ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>{t.generate.settingsTab}</button>
              <button onClick={() => setRightTab("historial")} style={{ position: "relative", zIndex: 10, flex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 500, textAlign: "center", color: rightTab === "historial" ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>{t.generate.historyTab}</button>
            </div>
          </div>

          {rightTab === "ajustes" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px", display: "flex", flexDirection: "column", gap: "20px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>

              {/* VOZ */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "8px" }}>{t.generate.voiceLabel}</p>

                <button
                  onClick={() => setShowBrowser(true)}
                  style={{ width: "100%", textAlign: "left", background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <VoiceAvatar name={selectedVoice?.name ?? "V"} coverImage={selectedVoice?.coverImage} size="lg" id={selectedVoice?.referenceId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", marginBottom: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{selectedVoice?.name ?? t.generate.defaultVoice}</span>
                        {voiceGender && <span style={{ fontSize: "12px", color: "#6b7280" }}>· {voiceGender === "male" ? "Masculino" : "Femenino"}</span>}
                      </div>
                      {selectedVoice?.description && <p style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "6px" }}>{selectedVoice.description}</p>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {selectedVoice?.languages?.slice(0, 3).map((l) => (
                          <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", fontSize: "11px", color: "#e2e8f0" }}>
                            <span className={`fi fi-${l.toLowerCase()}`} style={{ width: "14px", height: "10px", display: "inline-block", borderRadius: "2px" }} />{l.toUpperCase()}
                          </span>
                        ))}
                        {voiceGender && <span style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", fontSize: "11px", color: "#e2e8f0" }}>{voiceGender === "male" ? "Masculino" : "Femenino"}</span>}
                      </div>
                      {((selectedVoice?.taskCount ?? 0) > 0 || (selectedVoice?.likeCount ?? 0) > 0) && (
                        <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                          {(selectedVoice?.taskCount ?? 0) > 0 && <span style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "3px" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>{formatCount(selectedVoice!.taskCount!)}</span>}
                          {(selectedVoice?.likeCount ?? 0) > 0 && <span style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "3px" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{formatCount(selectedVoice!.likeCount!)}</span>}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: "#6b7280", flexShrink: 0 }}>→</span>
                  </div>
                </button>
              </div>

              {/* MODELO */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "8px" }}>Modelo</p>
                <div style={{ position: "relative" }} ref={modelDropdownRef}>
                  <button
                    onClick={() => setModelDropdownOpen((o) => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", fontSize: "13px", background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#e2e2f0", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Elite Labs
                      </span>
                      {selectedModel === "speech-1.6" && <span className="badge-shimmer-purple" style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", flexShrink: 0 }}>Pro</span>}
                      {selectedModel === "speech-1.5" && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>Legacy</span>}
                      {selectedModel === "turbo" && !turboDisabled && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "white", flexShrink: 0 }}>Turbo</span>}
                      {selectedModel === "turbo" && turboDisabled  && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", flexShrink: 0 }}>Mantenimiento</span>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6b7280", flexShrink: 0, transform: modelDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {modelDropdownOpen && (
                    <div style={{ position: "absolute", left: 0, right: 0, zIndex: 20, marginTop: "4px", padding: "4px", background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                      {([
                        { value: "speech-1.6", sub: "Nuestro modelo insignia",                    disabled: false },
                        { value: "speech-1.5", sub: "Heredado",                                    disabled: false },
                        { value: "turbo",      sub: "Voces premium · 2x rendimiento de caracteres", disabled: turboDisabled },
                      ]).map(({ value, sub, disabled }) => (
                        <button
                          key={value}
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            if (value === "turbo" || selectedModel === "turbo") onVoiceChange(null);
                            setSelectedModel(value);
                            setModelDropdownOpen(false);
                          }}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", fontSize: "13px", textAlign: "left", background: "transparent", border: "none", borderRadius: "8px", color: disabled ? "#4b5563" : selectedModel === value ? "#e2e2f0" : "#6b7280", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}
                          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 500 }}>Elite Labs</span>
                              {value === "speech-1.6" && <span className="badge-shimmer-purple" style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", flexShrink: 0 }}>Pro</span>}
                              {value === "speech-1.5" && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>Legacy</span>}
                              {value === "turbo" && !turboDisabled && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "white", flexShrink: 0 }}>Turbo</span>}
                              {value === "turbo" && turboDisabled  && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", flexShrink: 0 }}>Mantenimiento</span>}
                            </div>
                            <span style={{ fontSize: "11px", marginTop: "2px", color: "#444444" }}>{sub}</span>
                          </div>
                          {selectedModel === value && !disabled && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "8px" }}><polyline points="20 6 9 17 4 12" /></svg>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CONTROLES DE AUDIO */}
              {selectedModel !== "turbo" && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "8px" }}>{t.generate.audioControls}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <CompactSlider label={t.generate.speed} value={speed} onChange={setSpeed} min={0.5} max={1.5} step={0.01} decimals={2} defaultValue={1} />
                  <CompactSlider label={t.generate.volume} value={volume} onChange={setVolume} min={0} max={2} step={0.01} decimals={2} defaultValue={1} />
                  {selectedModel === "speech-1.5" && (
                    <>
                      <CompactSlider label="Temperatura" value={temperature} onChange={setTemperature} min={0} max={1} step={0.1} decimals={1} defaultValue={0.9} />
                      <CompactSlider label="Top P" value={topP} onChange={setTopP} min={0} max={1} step={0.1} decimals={1} defaultValue={0.9} />
                    </>
                  )}
                  {/* Normalización de volumen */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "#111111", borderRadius: "10px", height: "40px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>{selectedModel === "speech-1.5" ? "Norm. texto" : "Norm. de volumen"}</span>
                    <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                      <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: normalize ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                      <button onClick={() => setNormalize(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !normalize ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>No</button>
                      <button onClick={() => setNormalize(true)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: normalize ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Sí</button>
                    </div>
                  </div>
                  {/* Pro-only controls */}
                  {selectedModel === "speech-1.6" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "#111111", borderRadius: "10px", height: "40px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Norm. de texto</span>
                      <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                        <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: proNormText ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                        <button onClick={() => setProNormText(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !proNormText ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>No</button>
                        <button onClick={() => setProNormText(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  proNormText ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Sí</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "#111111", borderRadius: "10px", height: "40px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Calidad MP3</span>
                      <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                        <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: proHighBitrate ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                        <button onClick={() => setProHighBitrate(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !proHighBitrate ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>128k</button>
                        <button onClick={() => setProHighBitrate(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  proHighBitrate ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>192k</button>
                      </div>
                    </div>
                  </>)}
                </div>
                {(speed !== 1 || volume !== 1 || (selectedModel === "speech-1.5" && (temperature !== 0.9 || topP !== 0.9))) && (
                  <button onClick={() => { setSpeed(1); setVolume(1); setTemperature(0.9); setTopP(0.9); }} style={{ marginTop: "10px", fontSize: "11px", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Restablecer valores</button>
                )}
              </div>
              )}

              {/* CONTROLES DE AUDIO — Turbo (ElevenLabs) */}
              {selectedModel === "turbo" && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "8px" }}>Controles de Audio</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <M1Slider label="Speed"              leftLabel="Slower"        rightLabel="Faster"       value={m1Speed}     onChange={setM1Speed}     min={0.7}  max={1.2}  step={0.01} defaultValue={1.0} />
                  <M1Slider label="Stability"          leftLabel="More variable" rightLabel="More stable"  value={m1Stability} onChange={setM1Stability} min={0}    max={1}    step={0.01} defaultValue={0.5} />
                  <M1Slider label="Similarity"         leftLabel="Low"           rightLabel="High"         value={m1Similarity} onChange={setM1Similarity} min={0} max={1}    step={0.01} defaultValue={0.75} />
                  <M1Slider label="Style Exaggeration" leftLabel="None"          rightLabel="Exaggerated"  value={m1StyleExag} onChange={setM1StyleExag} min={0}    max={1}    step={0.01} defaultValue={0} />

                  {/* Language Override toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "#111111", borderRadius: "10px", height: "40px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Language Override</span>
                    <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                      <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: m1LangOverride ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                      <button onClick={() => setM1LangOverride(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !m1LangOverride ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Off</button>
                      <button onClick={() => setM1LangOverride(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  m1LangOverride ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>On</button>
                    </div>
                  </div>

                  {/* Output Format dropdown */}
                  <div style={{ position: "relative" }} ref={m1OutDropRef}>
                    <button
                      onClick={() => setM1OutDropOpen((o) => !o)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: "40px", fontSize: "12px", background: "#111111", border: "none", borderRadius: "10px", color: "#e2e2f0", cursor: "pointer" }}
                    >
                      <span style={{ fontWeight: 500, color: "#888888" }}>Output Format</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: m1OutputFormat !== "mp3_44100_128" ? "#aaaaaa" : "#6b7280" }}>
                          {m1OutputFormat === "mp3_44100_128" ? "MP3 44.1kHz 128k" : m1OutputFormat === "mp3_44100_192" ? "MP3 44.1kHz 192k" : m1OutputFormat === "pcm_16000" ? "PCM 16kHz" : m1OutputFormat === "pcm_22050" ? "PCM 22kHz" : "PCM 44.1kHz"}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6b7280", transform: m1OutDropOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </button>
                    {m1OutDropOpen && (
                      <div style={{ position: "absolute", left: 0, right: 0, zIndex: 20, marginTop: "2px", padding: "4px", background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                        {([
                          { value: "mp3_44100_128", label: "MP3 44.1 kHz (128kbps)" },
                          { value: "mp3_44100_192", label: "MP3 44.1 kHz (192kbps)" },
                          { value: "pcm_16000",     label: "PCM 16kHz" },
                          { value: "pcm_22050",     label: "PCM 22kHz" },
                          { value: "pcm_44100",     label: "PCM 44.1kHz" },
                        ] as const).map(({ value, label }) => (
                          <button key={value} onClick={() => { setM1OutputFormat(value); setM1OutDropOpen(false); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", fontSize: "12px", textAlign: "left", background: "transparent", border: "none", borderRadius: "8px", color: m1OutputFormat === value ? "#e2e2f0" : "#6b7280", cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            {label}
                            {m1OutputFormat === value && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Speaker Boost toggle + Reset */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "#111111", borderRadius: "10px", height: "40px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Speaker Boost</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                        <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: m1SpeakerBoost ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                        <button onClick={() => setM1SpeakerBoost(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !m1SpeakerBoost ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Off</button>
                        <button onClick={() => setM1SpeakerBoost(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  m1SpeakerBoost ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>On</button>
                      </div>
                      <button
                        onClick={() => { setM1Speed(1.0); setM1Stability(0.5); setM1Similarity(0.75); setM1StyleExag(0); setM1LangOverride(false); setM1OutputFormat("mp3_44100_128"); setM1SpeakerBoost(true); }}
                        style={{ fontSize: "11px", color: "#6b7280", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                      >Reset values</button>
                    </div>
                  </div>
                </div>
              </div>
              )}

            </div>
          )}

          {rightTab === "historial" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
              <AudioHistoryList compact plan={plan} />
            </div>
          )}
        </div>
      </div>

      {showBrowser && (
        <VoiceBrowser
          clonedVoices={clonedVoices}
          onSelect={onVoiceChange}
          onClose={() => setShowBrowser(false)}
          plan={plan}
          voiceListEndpoint={selectedModel === "turbo" ? "/api/ai33-voices-eleven" : undefined}
          disablePremiumLock={selectedModel === "turbo"}
          showExternalFilters={selectedModel === "turbo"}
          defaultLanguage={selectedModel === "turbo" ? "en" : "es"}
        />
      )}

      <NoCreditsModal
        isOpen={showNoCredits}
        onClose={() => setShowNoCredits(false)}
        currentPlan={plan.toLowerCase()}
      />
    </div>
  );
}

/* ─── Clone Modal ─────────────────────────────────────────── */
const CLONE_LANGUAGES = [
  { value: "es", label: "Español",   fi: "es" },
  { value: "en", label: "Inglés",    fi: "us" },
  { value: "fr", label: "Francés",   fi: "fr" },
  { value: "de", label: "Alemán",    fi: "de" },
  { value: "it", label: "Italiano",  fi: "it" },
  { value: "pt", label: "Portugués", fi: "br" },
  { value: "ja", label: "Japonés",   fi: "jp" },
  { value: "zh", label: "Chino",     fi: "cn" },
  { value: "ko", label: "Coreano",   fi: "kr" },
  { value: "ar", label: "Árabe",     fi: "sa" },
];

const CLONE_LANGUAGE_OPTIONS = CLONE_LANGUAGES.map((l) => ({
  value: l.value,
  label: l.label,
  icon: <span className={`fi fi-${l.fi}`} style={{ borderRadius: "2px", width: "20px", height: "15px", display: "inline-block" }} />,
}));

function CloneModal({ onClose, onCloned }: { onClose: () => void; onCloned: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [language, setLanguage] = useState("es");
  const [gender, setGender] = useState<"masculine" | "feminine">("masculine");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".mp3") && f.type !== "audio/mpeg") {
      setFile(null);
      setFileDuration(null);
      setError("Solo se admiten archivos MP3");
      setTimeout(() => setError(null), 3000);
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
      fd.append("language", language);
      fd.append("gender", gender);
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
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#111111", border: "1px solid #222222" }}>
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
          style={{ borderColor: dragging ? "#ffffff" : "#222222", background: dragging ? "rgba(255,255,255,0.03)" : "transparent" }}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".mp3,audio/mpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
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
                <Mic size={32} style={{ color: "#888888" }} />
              </div>
              <p className="text-sm text-gray-400 mb-1">Arrastra tu audio aquí o haz clic</p>
              <p className="text-xs text-gray-600">Solo MP3 · Ideal: 10-30 segundos</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs mb-3" style={{ color: "#f87171" }}>{error}</p>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Nombre de la voz</label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Ej: Mi voz, Narrador masculino..."
            className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/20"
            style={{ background: "#000000", border: "1px solid #222222" }}
          />
        </div>

        {/* Language + Gender row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Idioma</label>
            <CustomSelect options={CLONE_LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Género</label>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", background: "#000000", border: "1px solid #222222", borderRadius: "8px", padding: "3px" }}>
              <div style={{ position: "absolute", top: "3px", left: "3px", width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "#1a1a1a", borderRadius: "5px", pointerEvents: "none", transition: "transform 0.2s ease", transform: `translateX(${gender === "feminine" ? "100%" : "0%"})` }} />
              <button type="button" onClick={() => setGender("masculine")} style={{ position: "relative", zIndex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", color: gender === "masculine" ? "#e5e7eb" : "#444444", transition: "color 0.2s ease" }}>♂ Masc.</button>
              <button type="button" onClick={() => setGender("feminine")} style={{ position: "relative", zIndex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", color: gender === "feminine" ? "#e5e7eb" : "#444444", transition: "color 0.2s ease" }}>♀ Fem.</button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">La clonación es gratuita</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors" style={{ background: "#1a1a1a", border: "1px solid #222222" }}>
            Cancelar
          </button>
          <button
            onClick={handleClone}
            disabled={!file || !voiceName.trim() || loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "#ffffff" }}
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

/* ─── Voice Card ─────────────────────────────────────────── */
function VoiceCard({
  voice,
  previewState,
  deletingId,
  onPreview,
  onUse,
  onDelete,
  onToggleVisibility,
}: {
  voice: Voice;
  previewState: Record<string, "idle" | "loading" | "playing">;
  deletingId: string | null;
  onPreview: (v: Voice) => void;
  onUse: (v: Voice) => void;
  onDelete: (id: string) => void;
  onToggleVisibility?: (id: string, isPublic: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const effectiveId = voice.fishAudioModelId ?? voice.id;

  function handleCopy() {
    navigator.clipboard.writeText(effectiveId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const genderLabel = voice.gender === "masculine" ? "Masculino" : voice.gender === "feminine" ? "Femenino" : "Indefinido";
  const menuRef = useRef<HTMLDivElement>(null);
  const ps = previewState[voice.id] ?? "idle";
  const isDeleting = deletingId === voice.id;

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div
      className="rounded-xl border p-3 transition-colors"
      style={{ background: hovered ? "#191919" : "#111111", borderColor: hovered ? "#222222" : "#1a1a1a" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      {/* Top row: avatar · name+date */}
      <div className="flex items-center gap-3 mb-2">
        <VoiceAvatarGenerative seed={voice.fishAudioModelId ?? voice.id} size={40} className="flex-shrink-0 rounded-lg" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-semibold text-white text-sm truncate">{voice.name}</span>
            {voice.language && <span className="text-xs leading-none flex-shrink-0">{<span className={`fi fi-${voice.language}`} style={{width:"16px",height:"12px",display:"inline-block",borderRadius:"2px"}} />}</span>}
            {voice.gender && <span className="text-xs flex-shrink-0" style={{ color: "#444444" }}>{voice.gender === "masculine" ? "♂" : "♀"}</span>}
            {voice.isPublic !== undefined && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium leading-none"
                style={{
                  background: voice.isPublic ? "rgba(74,222,128,0.12)" : "rgba(107,114,128,0.1)",
                  color: voice.isPublic ? "#4ade80" : "#444444",
                  border: `1px solid ${voice.isPublic ? "rgba(74,222,128,0.25)" : "rgba(107,114,128,0.15)"}`,
                }}
              >
                {voice.isPublic ? "Pública" : "Privada"}
              </span>
            )}
          </div>
          {voice.createdAt && (
            <span className="text-xs flex-shrink-0" style={{ color: "#444444" }}>{formatDate(voice.createdAt)}</span>
          )}
        </div>
      </div>

      {/* Bottom row: clips · actions (on hover) */}
      <div className="flex items-center justify-between" style={{ paddingLeft: "52px" }}>
        {/* Gender */}
        <div className="flex items-center gap-1 text-xs" style={{ color: "#444444" }}>
          <User size={9} />
          <span>{genderLabel}</span>
        </div>

        {/* Hover actions */}
        <div
          className="flex items-center gap-1.5"
          style={{ opacity: hovered ? 1 : 0, transition: "opacity 150ms ease", pointerEvents: hovered ? "auto" : "none" }}
        >
          {/* Copy ID */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: copied ? "#4ade80" : "#444444" }}
            title="Copiar ID de voz"
            onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}
            onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#444444"; }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: menuOpen ? "#9ca3af" : "#444444", background: menuOpen ? "rgba(255,255,255,0.06)" : "transparent" }}
              title="Más opciones"
            >
              <MoreVertical size={13} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 bottom-full mb-1.5 rounded-xl py-1 z-20 min-w-[150px]"
                style={{ background: "#1a1a1a", border: "1px solid #222222", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
              >
                <button
                  onClick={() => { onPreview(voice); setMenuOpen(false); }}
                  disabled={!voice.fishAudioModelId}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors disabled:opacity-40"
                  style={{ color: "#d1d5db" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {ps === "loading" ? (
                    <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : ps === "playing" ? (
                    <Pause size={12} className="flex-shrink-0" />
                  ) : (
                    <Play size={12} className="flex-shrink-0" />
                  )}
                  {ps === "playing" ? "Detener preview" : "Escuchar preview"}
                </button>
                {onToggleVisibility && (
                  <>
                    <div style={{ height: "1px", background: "#222222", margin: "2px 0" }} />
                    <button
                      onClick={() => { onToggleVisibility(voice.id, !voice.isPublic); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                      style={{ color: "#d1d5db" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Globe size={12} className="flex-shrink-0" />
                      {voice.isPublic ? "Hacer privada" : "Hacer pública"}
                    </button>
                  </>
                )}
                <div style={{ height: "1px", background: "#222222", margin: "2px 0" }} />
                <button
                  onClick={() => { onDelete(voice.id); setMenuOpen(false); }}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors disabled:opacity-40"
                  style={{ color: "#f87171" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Trash2 size={12} className="flex-shrink-0" />
                  Eliminar
                </button>
              </div>
            )}
          </div>

          {/* Use pill */}
          <button
            onClick={() => onUse(voice)}
            disabled={!voice.fishAudioModelId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-40"
            style={{ background: "#ffffff", color: "#000000" }}
          >
            <AudioWaveform size={11} />
            Usar
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
  const [previewState, setPreviewState] = useState<Record<string, "idle" | "loading" | "playing">>({});
  const previewAudiosRef = useRef<Record<string, HTMLAudioElement>>({});
  const [search, setSearch] = useState("");

  const allCloned = voices.filter((v) => !v.isSystem);
  const cloned = allCloned.filter((v) => !v.provider || v.provider === "fish_audio");

  const slotLimit = VOICE_SLOT_LIMITS[plan] ?? 0;
  const atLimit = slotLimit !== Infinity && cloned.length >= slotLimit;
  const slotLabel = slotLimit === Infinity ? `${cloned.length} voces` : `${cloned.length}/${slotLimit} slots`;

  const filtered = search.trim()
    ? cloned.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
    : cloned;

  async function handlePreview(voice: Voice) {
    const state = previewState[voice.id] ?? "idle";
    if (state === "playing") {
      previewAudiosRef.current[voice.id]?.pause();
      setPreviewState((s) => ({ ...s, [voice.id]: "idle" }));
      return;
    }
    if (state === "loading") return;
    setPreviewState((s) => ({ ...s, [voice.id]: "loading" }));
    try {
      const res = await fetch(`/api/voices/${voice.id}/preview`, { method: "POST" });
      if (!res.ok) throw new Error("Error");
      const { url } = await res.json() as { url: string };
      const audio = new Audio(url);
      previewAudiosRef.current[voice.id] = audio;
      audio.onended = () => setPreviewState((s) => ({ ...s, [voice.id]: "idle" }));
      audio.onerror = () => setPreviewState((s) => ({ ...s, [voice.id]: "idle" }));
      await audio.play();
      setPreviewState((s) => ({ ...s, [voice.id]: "playing" }));
    } catch {
      setPreviewState((s) => ({ ...s, [voice.id]: "idle" }));
    }
  }

  async function handleDelete(voiceId: string) {
    setDeletingId(voiceId);
    try {
      await fetch(`/api/voices/${voiceId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleVisibility(voiceId: string, isPublic: boolean) {
    await fetch(`/api/voices/${voiceId}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });
    onRefresh();
  }

  return (
    <>
      {showModal && (
        <CloneModal
          onClose={() => setShowModal(false)}
          onCloned={() => { setShowModal(false); onRefresh(); }}
        />
      )}

      {/* Toolbar: slots · search · clone button */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs flex-shrink-0" style={{ color: "#444444" }}>{slotLabel}</span>
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444444" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar voces..."
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
            style={{ background: "#111111", border: "1px solid #1a1a1a", color: "#d1d5db" }}
          />
        </div>
        <button
          onClick={() => !atLimit && setShowModal(true)}
          disabled={atLimit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-black flex-shrink-0 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#ffffff" }}
        >
          <span className="text-base leading-none">+</span>
          Clonar nueva voz
        </button>
      </div>

      {/* Grid */}
      {cloned.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#888888" }}>
          <Mic size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No tienes voces clonadas</p>
          <p className="text-sm opacity-60">Clona una voz con 10 segundos de audio</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#888888" }}>
          <p className="text-sm">Sin resultados para &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              previewState={previewState}
              deletingId={deletingId}
              onPreview={handlePreview}
              onUse={(v) => onUseVoice({ referenceId: v.fishAudioModelId ?? "", name: v.name, isCloned: true })}
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ─── History Tab ─────────────────────────────────────────── */
interface HistoryGen {
  id: string;
  status: string;
  text: string;
  audioUrl: string | null;
  creditsUsed: number;
  durationSeconds: number | null;
  voiceId: string | null;
  voiceName: string | null;
  error: string | null;
  createdAt: string;
  expiresAt: string | null;
}

function HistoryTab({ plan }: { plan: string }) {
  const [gens, setGens] = useState<HistoryGen[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playTime, setPlayTime] = useState<{ current: number; duration: number }>({ current: 0, duration: 0 });
  void plan;

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?page=${p}`);
      const data = await res.json() as { generations: HistoryGen[]; total: number; page: number; totalPages: number };
      setGens(data.generations ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenuId]);

  const filtered = search.trim()
    ? gens.filter((g) => g.text.toLowerCase().includes(search.toLowerCase()))
    : gens;

  function fmtGroupDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const groups: { date: string; items: HistoryGen[] }[] = [];
  for (const g of filtered) {
    const d = fmtGroupDate(g.createdAt);
    const last = groups[groups.length - 1];
    if (!last || last.date !== d) groups.push({ date: d, items: [g] });
    else last.items.push(g);
  }

  function fmtMSS(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }

  function togglePlay(gen: HistoryGen) {
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

  async function handleDelete(id: string) {
    setOpenMenuId(null);
    setRemovingIds((prev) => new Set([...prev, id]));
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setTimeout(() => {
        setGens((prev) => prev.filter((g) => g.id !== id));
        setRemovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        setTotal((t) => Math.max(0, t - 1));
      }, 300);
    } catch {
      setRemovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Search header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexShrink: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#444444", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en historial..."
            style={{
              width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              background: "#111111", border: "1px solid #1a1a1a", borderRadius: 8,
              color: "#d1d5db", fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => fetchHistory(page)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: "#111111", border: "1px solid #1a1a1a", color: "#9ca3af", cursor: "pointer",
          }}
          title="Actualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#444444", fontSize: 14 }}>Cargando...</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <Clock size={40} style={{ margin: "0 auto 12px", color: "#222222" }} />
            <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Sin generaciones</p>
            <p style={{ color: "#444444", fontSize: 12, marginTop: 4 }}>Tus audios generados aparecerán aquí</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {groups.map(({ date, items }) => (
              <div key={date} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                {/* Date label */}
                <div style={{ width: 52, flexShrink: 0, paddingTop: 5 }}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{date}</span>
                </div>

                {/* 2-col card grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1">
                  {items.map((gen) => {
                    const isRemoving = removingIds.has(gen.id);
                    const isPlaying = playingId === gen.id;
                    const seed = gen.voiceId ?? gen.id;

                    const isProcessing = gen.status === "processing";
                    const isStale = isProcessing && (Date.now() - new Date(gen.createdAt).getTime()) > 10 * 60 * 1000;
                    const isError = gen.status === "error" || isStale;

                    return (
                      <div
                        key={gen.id}
                        style={{
                          background: "#111111",
                          border: isError ? "1px solid rgba(239,68,68,0.2)" : isProcessing ? "1px solid rgba(255,255,255,0.08)" : "1px solid #1a1a1a",
                          borderRadius: 10,
                          padding: 14, position: "relative",
                          transition: "opacity 0.3s, transform 0.3s",
                          opacity: isRemoving ? 0 : 1,
                          transform: isRemoving ? "scale(0.95)" : "scale(1)",
                        }}
                      >
                        {/* Top row: time + voice avatar */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{fmtTime(gen.createdAt)}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <VoiceAvatarGenerative seed={seed} size={20} />
                            <span style={{ fontSize: 11, color: "#6b7280" }}>{gen.voiceName ?? "Voz"}</span>
                          </div>
                        </div>

                        {/* Text */}
                        <p style={{
                          fontSize: 12, color: "#c9cad4", lineHeight: 1.55, marginBottom: 12,
                          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}>
                          {gen.text}
                        </p>

                        {/* Processing state */}
                        {isProcessing && !isStale && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                            <svg style={{ color: "#6b7280", flexShrink: 0 }} className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>Generando audio...</span>
                          </div>
                        )}

                        {/* Error state */}
                        {isError && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
                            <span style={{ fontSize: 11, color: "#f87171" }}>
                              {isStale ? "Tiempo de espera agotado — contacta con soporte" : (gen.error ? gen.error.slice(0, 80) : "Error al generar el audio")}
                            </span>
                          </div>
                        )}

                        {/* Actions — only for done generations */}
                        {!isProcessing && !isError && <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={() => togglePlay(gen)}
                            disabled={!gen.audioUrl}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "4px 9px", borderRadius: 20,
                              background: isPlaying ? "rgba(255,255,255,0.08)" : "#1a1a1a",
                              border: isPlaying ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
                              color: isPlaying ? "#aaaaaa" : "#9ca3af",
                              fontSize: 11, cursor: gen.audioUrl ? "pointer" : "not-allowed",
                              opacity: gen.audioUrl ? 1 : 0.4, flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                          >
                            {isPlaying ? (
                              <><Pause size={10} /><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMSS(playTime.current)}/{fmtMSS(playTime.duration)}</span></>
                            ) : (
                              <><Play size={10} />Play</>
                            )}
                          </button>

                          <div style={{ flex: 1 }} />

                          {gen.audioUrl && (
                            <a
                              href={gen.audioUrl}
                              download
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 26, height: 26, borderRadius: "50%",
                                background: "#1a1a1a", color: "#9ca3af", textDecoration: "none",
                              }}
                              title="Descargar"
                            >
                              <Download size={11} />
                            </a>
                          )}

                          <button
                            onClick={() => gen.audioUrl && navigator.clipboard.writeText(gen.audioUrl)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, borderRadius: "50%",
                              background: "#1a1a1a", color: "#9ca3af", border: "none", cursor: "pointer",
                            }}
                            title="Copiar enlace"
                          >
                            <Share2 size={11} />
                          </button>

                          {/* More dropdown */}
                          <div style={{ position: "relative" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === gen.id ? null : gen.id); }}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 26, height: 26, borderRadius: "50%",
                                background: "#1a1a1a", color: "#9ca3af", border: "none", cursor: "pointer",
                              }}
                            >
                              <MoreHorizontal size={13} />
                            </button>
                            {openMenuId === gen.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
                                  background: "#111111", border: "1px solid #1a1a1a", borderRadius: 8,
                                  padding: 4, minWidth: 120, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                }}
                              >
                                <button
                                  onClick={() => handleDelete(gen.id)}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1a1a1a"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    width: "100%", padding: "8px 10px", borderRadius: 6,
                                    background: "transparent", border: "none", cursor: "pointer",
                                    color: "#ef4444", fontSize: 13,
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          paddingTop: 16, marginTop: 16, borderTop: "1px solid #1a1a1a", flexShrink: 0,
        }}>
          <button
            onClick={() => fetchHistory(page - 1)}
            disabled={page <= 1}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: page <= 1 ? "not-allowed" : "pointer",
              background: "#111111", border: "1px solid #1a1a1a", color: page <= 1 ? "#444444" : "#9ca3af",
            }}
          >Anterior</button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{page} / {totalPages}</span>
          <button
            onClick={() => fetchHistory(page + 1)}
            disabled={page >= totalPages}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: page >= totalPages ? "not-allowed" : "pointer",
              background: "#111111", border: "1px solid #1a1a1a", color: page >= totalPages ? "#444444" : "#9ca3af",
            }}
          >Siguiente</button>
        </div>
      )}

      {total > 0 && (
        <p style={{ fontSize: 11, color: "#444444", textAlign: "center", paddingTop: 8, flexShrink: 0 }}>
          {total} generaci{total !== 1 ? "ones" : "ón"} en total
        </p>
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
    characters: 5_000,
    popular: false,
    features: [
      "5.000 caracteres al registrarte",
      "Voz aleatoria (sin selección)",
      "2 transcripciones/traducciones",
      "Sin clonación de voz",
      "Audios disponibles 72 horas",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    description: "Para creadores que están empezando",
    price: 7,
    characters: 200_000,
    popular: false,
    features: [
      "200.000 caracteres/mes (x2 con EliteLabs 2)",
      "Selección de voz completa",
      "Transcripciones y traducciones ilimitadas",
      "3 voces clonadas",
      "Audios disponibles 14 días",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    description: "La mejor opción para creadores activos",
    price: 13,
    characters: 500_000,
    popular: true,
    features: [
      "500.000 caracteres/mes (x2 con EliteLabs 2)",
      "Selección de voz completa",
      "Transcripciones y traducciones ilimitadas",
      "10 voces clonadas",
      "Generación prioritaria",
      "Audios disponibles 30 días",
    ],
  },
  {
    key: "elite",
    name: "Elite",
    description: "Máximo rendimiento sin límites",
    price: 25,
    characters: 1_000_000,
    popular: false,
    features: [
      "1.000.000 caracteres/mes (x2 con EliteLabs 2)",
      "Selección de voz completa",
      "Transcripciones y traducciones ilimitadas",
      "20 voces clonadas",
      "Prioridad máxima",
      "Soporte preferente",
      "Audios disponibles 30 días",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Para profesionales y equipos",
    price: 110,
    characters: 5_000_000,
    popular: false,
    features: [
      "5.000.000 caracteres/mes (x2 con EliteLabs 2)",
      "Voces clonadas ilimitadas",
      "Transcripciones y traducciones ilimitadas",
      "Traducción de audio +10%",
      "Generación prioritaria",
      "Soporte preferente",
      "Audios disponibles 90 días",
    ],
  },
];

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  free:       { label: "Gratis",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  starter:    { label: "Starter",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  pro:        { label: "Pro",        color: "#aaaaaa", bg: "rgba(255,255,255,0.08)"  },
  elite:      { label: "Elite",      color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  enterprise: { label: "Enterprise", color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
};

function costPer10k(price: number, characters: number): string {
  return `$${((price / characters) * 10_000).toFixed(2)}/10k`;
}

function FeatureTick() {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: "50%",
      background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: "2px",
    }}>
      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function BillingTab({
  credits,
  extraCredits,
  plan,
  nextRenewalDate,
  daysUntilRenewal,
  onRefresh,
}: {
  credits: number | null;
  extraCredits: number;
  plan: string;
  nextRenewalDate: string | null;
  daysUntilRenewal: number | null;
  onRefresh: () => void;
}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showManage, setShowManage] = useState(false);
  const router = useRouter();

  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free;

  const renewalDateLabel = nextRenewalDate
    ? new Date(nextRenewalDate).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    : null;
  const renewalSoon = daysUntilRenewal !== null && daysUntilRenewal <= 2;

  async function openPortal() {
    const res = await fetch("/api/create-portal-session", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  if (showManage) {
    return <ManageBillingPanel plan={plan} onBack={() => setShowManage(false)} />;
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
      <div style={{ borderRadius: "12px", border: "1px solid #1a1a1a", background: "#111111", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#444444", marginBottom: "3px" }}>Caracteres disponibles</p>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {credits !== null ? credits.toLocaleString("es-ES") : "—"}
              {extraCredits > 0 && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#34d399" }}>+{extraCredits.toLocaleString("es-ES")} extra</span>
              )}
            </p>
          </div>
          {renewalDateLabel && (
            <>
              <div style={{ width: "1px", height: "32px", background: "#1a1a1a", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "11px", color: "#444444", marginBottom: "3px" }}>
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
                    <span style={{ fontSize: "11px", color: "#444444", fontWeight: 400 }}>· en {daysUntilRenewal}d</span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
        {plan !== "free" && (
          <button
            onClick={() => setShowManage(true)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #222222", background: "transparent", color: "#d1d5db", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Gestionar suscripción →
          </button>
        )}
      </div>

      {/* ── Monthly / Annual toggle ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
        <div style={{ position: "relative", display: "inline-grid", gridTemplateColumns: "1fr 1fr", background: "#111111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "3px" }}>
          {/* Sliding pill */}
          <div style={{ position: "absolute", top: "3px", left: "3px", width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "#1a1a1a", borderRadius: "7px", pointerEvents: "none", transition: "transform 0.2s ease", transform: `translateX(${billing === "annual" ? "100%" : "0%"})` }} />
          <button
            onClick={() => setBilling("monthly")}
            style={{ position: "relative", zIndex: 1, padding: "7px 22px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: "transparent", color: billing === "monthly" ? "#e5e7eb" : "#444444", transition: "color 0.2s ease" }}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling("annual")}
            style={{ position: "relative", zIndex: 1, padding: "7px 22px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: "transparent", color: billing === "annual" ? "#e5e7eb" : "#444444", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "color 0.2s ease" }}
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
          const borderColor = isCurrent ? (planBadge?.color ?? "#888888") : p.popular ? "#333333" : "#1a1a1a";
          const isDowngrade = plan !== "free" && p.key === "free";

          return (
            <div
              key={p.key}
              style={{
                borderRadius: "16px",
                border: `1px solid ${borderColor}`,
                background: isCurrent ? "rgba(255,255,255,0.03)" : "#0a0a0a",
                padding: "22px 16px 18px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Name + badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{p.name}</span>
                {isCurrent ? (
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", color: planBadge?.color, background: planBadge?.bg, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>
                    ACTUAL
                  </span>
                ) : p.popular ? (
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", background: "rgba(255,255,255,0.05)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Popular
                  </span>
                ) : p.key === "enterprise" ? (
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.45)", color: "#6ee7b7", background: "rgba(16,185,129,0.05)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Equipos
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "16px", lineHeight: 1.4 }}>
                {p.description}
              </p>

              {/* Price */}
              <div style={{ marginBottom: "16px", minHeight: "58px" }}>
                {p.price === 0 ? (
                  <>
                    <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1, display: "block" }}>Gratis</span>
                    <p style={{ fontSize: "11px", color: "transparent", marginTop: "4px", userSelect: "none" }}>·</p>
                  </>
                ) : (
                  <>
                    {billing === "annual" && (
                      <p style={{ fontSize: "13px", color: "#444444", textDecoration: "line-through", marginBottom: "0px", lineHeight: 1 }}>
                        ${p.price}/mes
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                      <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                        ${monthlyPrice}
                      </span>
                      <span style={{ fontSize: "12px", color: "#444444", marginLeft: "2px" }}>/mes</span>
                    </div>
                    {billing === "annual" ? (
                      <p style={{ fontSize: "11px", color: "#555555", marginTop: "3px" }}>
                        ${Math.round(monthlyPrice * 12)} facturado anualmente
                      </p>
                    ) : (
                      <p style={{ fontSize: "11px", color: "transparent", marginTop: "3px", userSelect: "none" }}>·</p>
                    )}
                    <p style={{ fontSize: "10px", color: "#444444", marginTop: "2px" }}>
                      {costPer10k(monthlyPrice, p.characters)}
                    </p>
                  </>
                )}
              </div>

              {/* CTA button */}
              <button
                onClick={() => {
                  if (isCurrent) return;
                  if (isDowngrade || p.key === "free") { openPortal(); return; }
                  router.push(`/checkout/${p.key}?billing=${billing}`);
                }}
                disabled={isCurrent}
                style={
                  isCurrent
                    ? { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #222222", background: "transparent", color: "#444444", fontSize: "13px", fontWeight: 600, marginBottom: "16px", cursor: "not-allowed" }
                    : p.popular
                    ? { width: "100%", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", background: "#ffffff", color: "#000000", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
                    : { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333333", cursor: "pointer", background: "#1a1a1a", color: "#e5e7eb", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
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

              {/* Divider */}
              <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "14px" }} />

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {p.features.map((f, i) => (
                  <li
                    key={f}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.80)",
                      paddingTop: "10px", paddingBottom: "10px",
                      borderBottom: i < p.features.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                    }}
                  >
                    <FeatureTick />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Enterprise seats block */}
              {p.key === "enterprise" && (
                <div style={{ marginTop: "14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                      <Users size={12} style={{ color: "#fff", flexShrink: 0 }} /> Seats
                    </span>
                    <span style={{ fontSize: "11px", color: "#555555", textDecoration: "line-through" }}>$5/seat/mes</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: 700, color: "#4ade80" }}>
                      EliteLabs lo patrocina · GRATIS
                    </span>
                  </div>
                </div>
              )}

              {/* Card footer — character count */}
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.60)", textAlign: "center" }}>
                  {p.characters.toLocaleString("es-ES")} caracteres/mes
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Extra credits section ── */}
      <div id="creditos-extra" style={{ marginTop: "44px", marginBottom: "20px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#e5e7eb", marginBottom: "4px" }}>Créditos extra</p>
        <p style={{ fontSize: "13px", color: "#444444" }}>Compra caracteres adicionales · Válidos 3 meses · Pago único</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 w-full">
        {/* Empty first column — aligns the 4 packs under plans 2–5 */}
        <div className="hidden lg:block" />
        {[
          { key: "100k", credits: 100_000,   price: 5,  label: "100.000" },
          { key: "300k", credits: 300_000,   price: 12, label: "300.000" },
          { key: "600k", credits: 600_000,   price: 19, label: "600.000" },
          { key: "1m",   credits: 1_000_000, price: 30, label: "1.000.000" },
        ].map((pack) => (
          <div
            key={pack.key}
            style={{
              background: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Credits amount */}
            <div style={{ marginBottom: "14px" }}>
              <p style={{ fontSize: "26px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{pack.label}</p>
              <p style={{ fontSize: "12px", color: "#555555", marginTop: "4px" }}>créditos</p>
            </div>

            {/* Price */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>${pack.price}</span>
              </div>
              <p style={{ fontSize: "11px", color: "#444444", marginTop: "4px" }}>{costPer10k(pack.price, pack.credits)} chars</p>
            </div>

            {/* Validity */}
            <p style={{ fontSize: "11px", color: "#444444", flex: 1, marginBottom: "16px" }}>Válidos 3 meses</p>

            {/* CTA */}
            <button
              onClick={() => router.push(`/checkout/credits-${pack.key}?type=credits`)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333333", cursor: "pointer", background: "#1a1a1a", color: "#e5e7eb", fontSize: "13px", fontWeight: 600 }}
            >
              Comprar →
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ─── Translate Tab ───────────────────────────────────────── */
const TRANSLATE_LANGS = [
  { code: "en", label: "Inglés",    fi: "us" },
  { code: "zh", label: "Chino",     fi: "cn" },
  { code: "de", label: "Alemán",    fi: "de" },
  { code: "ja", label: "Japonés",   fi: "jp" },
  { code: "fr", label: "Francés",   fi: "fr" },
  { code: "es", label: "Español",   fi: "es" },
  { code: "ko", label: "Coreano",   fi: "kr" },
  { code: "ar", label: "Árabe",     fi: "sa" },
  { code: "ru", label: "Ruso",      fi: "ru" },
  { code: "pt", label: "Portugués", fi: "br" },
];

interface TranslateResult {
  audioUrl: string;
  durationSeconds: number;
  transcribedText: string;
  translatedText: string;
  targetLanguageName: string;
  charCost: number;
}

interface TTranslateTask {
  id: string;
  fileName: string;
  targetLanguage: string;
  targetLanguageName: string;
  status: string;
  creditsUsed: number;
  durationSeconds: number | null;
  audioUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string | null;
}

const TRANSLATE_RETENTION: Record<string, number> = {
  free: 3, starter: 14, pro: 30, elite: 30, enterprise: 90,
};

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
  const [innerTab, setInnerTab] = useState<"convert" | "history">("convert");

  // Convert state
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [voiceSubTab, setVoiceSubTab] = useState<"model" | "reference">("model");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History state
  const [historyTasks, setHistoryTasks] = useState<TTranslateTask[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const clonedVoices = voices.filter((v) => !v.isSystem);
  const FREE_LIMIT = 2;
  const isFreeExhausted = plan === "free" && transcriptionUsed >= FREE_LIMIT;
  const freeRemaining = Math.max(0, FREE_LIMIT - transcriptionUsed);

  function fmtSec(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const okType = f.type.startsWith("audio/") || ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext);
    if (!okType) { setError("Formato no soportado. Usa MP3, WAV o M4A."); return; }
    if (f.size > 50 * 1024 * 1024) { setError("El archivo supera el límite de 50 MB."); return; }
    setFile(f);
    setError(null);
    setResult(null);
    setFileDuration(null);
    const url = URL.createObjectURL(f);
    const a = new Audio(url);
    a.onloadedmetadata = () => { if (isFinite(a.duration)) setFileDuration(a.duration); URL.revokeObjectURL(url); };
    a.onerror = () => URL.revokeObjectURL(url);
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recordingChunks.current, { type: "audio/webm" });
        handleFile(new File([blob], `grabacion-${Date.now()}.webm`, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  }

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/translation-tasks");
      const data = await res.json();
      setHistoryTasks(data.tasks ?? []);
    } catch { /* ignore */ } finally { setLoadingHistory(false); }
  }

  useEffect(() => {
    if (innerTab === "history") fetchHistory();
  }, [innerTab]);

  async function uploadInChunks(f: File, label: string): Promise<string> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — safely under Railway's ~8 MB limit
    const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, f.size);
      const chunk = f.slice(start, end);

      const fd = new FormData();
      fd.append("chunk", chunk);
      fd.append("uploadId", uploadId);
      fd.append("chunkIndex", String(i));
      fd.append("totalChunks", String(totalChunks));
      fd.append("filename", f.name);

      const pct = Math.round(((i + 1) / totalChunks) * 100);
      setStepLabel(`${label} ${pct}%`);

      const res = await fetch("/api/upload-chunk", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error al subir chunk ${i}`);
      if (data.done) return data.fileKey as string;
    }
    throw new Error("Upload incompleto — no se recibió fileKey");
  }

  async function handleTranslate() {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 200 MB.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    stepTimers.current.forEach(clearTimeout);

    try {
      // ── Paso 1: subir audio principal en chunks ──
      const fileKey = await uploadInChunks(file, "Subiendo audio...");

      // ── Paso 1b: subir audio de referencia si hay ──
      let referenceFileKey: string | undefined;
      if (voiceSubTab === "reference" && referenceFile) {
        referenceFileKey = await uploadInChunks(referenceFile, "Subiendo referencia...");
      }

      // ── Paso 2: traducir (servidor descarga de R2 internamente) ──
      setStepLabel("Transcribiendo audio...");
      stepTimers.current = [
        setTimeout(() => setStepLabel("Traduciendo texto..."), 9000),
        setTimeout(() => setStepLabel("Generando audio traducido..."), 18000),
      ];

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey,
          targetLang,
          referenceId: voiceSubTab === "model" ? (selectedVoice?.referenceId || undefined) : undefined,
          referenceFileKey,
        }),
      });
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

  const filteredHistory = historyTasks.filter((t) =>
    t.fileName.toLowerCase().includes(historySearch.toLowerCase()) ||
    t.targetLanguageName.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="max-w-2xl">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-white">Traducción de Audio</h1>
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", padding: "2px 8px", borderRadius: "9999px", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>
            PREVIEW
          </span>
        </div>
        <p className="text-sm" style={{ color: "#888888" }}>
          Transforma tu audio a cualquier idioma manteniendo tu voz original
        </p>

        {plan === "free" && (
          isFreeExhausted ? (
            <div className="mt-4 p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-sm" style={{ color: "#f87171" }}>Has agotado tus usos gratuitos. Actualiza tu plan para continuar.</p>
              <button onClick={onBilling} style={{ padding: "6px 14px", borderRadius: "8px", background: "#ffffff", color: "#000000", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}>Ver planes</button>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs" style={{ color: "#4a6fa8" }}>Plan gratuito · <strong style={{ color: "#aaaaaa" }}>{freeRemaining} de {FREE_LIMIT} usos restantes</strong> · Suscríbete para uso ilimitado</p>
            </div>
          )
        )}

        {/* Inner tabs */}
        <div className="flex mt-5" style={{ borderBottom: "1px solid #222222" }}>
          {(["convert", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setInnerTab(t)}
              className="relative pb-3 px-1 mr-6 text-sm font-medium transition-colors"
              style={{ color: innerTab === t ? "#fff" : "#888888", background: "none", border: "none", cursor: "pointer" }}
            >
              {t === "convert" ? "Convertir" : "Historial"}
              {innerTab === t && (
                <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: "2px", background: "#ffffff", borderRadius: "2px 2px 0 0" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Convertir tab ── */}
      {innerTab === "convert" && (
        <div className="space-y-5">

          {/* Upload card */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ background: "#111111", border: "1px solid #1a1a1a" }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >

            <div className="relative p-8 text-center">
              {dragging && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.06)", border: "2px dashed rgba(255,255,255,0.3)", borderRadius: "inherit", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p className="text-gray-300 font-medium">Suelta el archivo aquí</p>
                </div>
              )}
              <h3 className="text-base font-semibold text-white mb-1">Subir audio fuente</h3>
              <p className="text-sm mb-1" style={{ color: "#9ca3af" }}>Sube el audio que quieres traducir</p>
              <p className="text-xs mb-6" style={{ color: "#666666" }}>MP3, WAV, M4A · MAX 50MB</p>

              {file ? (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 mx-auto max-w-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <FileAudio size={18} style={{ color: "#a78bfa", flexShrink: 0 }} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs" style={{ color: "#888888" }}>
                      {fileDuration != null ? fmtSec(Math.round(fileDuration)) + " · " : ""}
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setFileDuration(null); setResult(null); }}
                    style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#d1d5db" }}
                  >
                    <Upload size={14} /> Elegir archivo
                  </button>
                  <button
                    onClick={toggleRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: recording ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${recording ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.15)"}`,
                      color: recording ? "#f87171" : "#d1d5db",
                    }}
                  >
                    {recording
                      ? <><Square size={12} style={{ fill: "#f87171" }} /> {fmtSec(recordingTime)}</>
                      : <><Mic size={14} /> Grabar</>
                    }
                  </button>
                </div>
              )}
              <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
          </div>

          {/* Language selector */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">Idioma de destino</p>
            <div className="grid grid-cols-5 gap-2">
              {TRANSLATE_LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setTargetLang(lang.code)}
                  className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-xs font-medium transition-all"
                  style={
                    targetLang === lang.code
                      ? { background: "rgba(255,255,255,0.1)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
                      : { background: "#111111", color: "#888888", border: "1px solid #222222" }
                  }
                >
                  <span className={`fi fi-${lang.fi}`} style={{ width: "24px", height: "18px", display: "inline-block", borderRadius: "3px", flexShrink: 0 }} />
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice section */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">Voz para el audio traducido</p>
            <div className="flex p-1 rounded-xl gap-1 mb-3" style={{ background: "#111111", border: "1px solid #222222" }}>
              {(["model", "reference"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setVoiceSubTab(t)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                  style={{ background: voiceSubTab === t ? "#1a1a1a" : "transparent", color: voiceSubTab === t ? "#e5e7eb" : "#6b7280", border: "none", cursor: "pointer" }}
                >
                  {t === "model" ? "Seleccionar modelo" : "Subir referencia"}
                </button>
              ))}
            </div>

            {voiceSubTab === "model" ? (
              <button
                onClick={() => setShowBrowser(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all hover:border-white/20"
                style={{ background: "#111111", border: "1px solid #222222" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <Mic size={13} style={{ color: "#aaaaaa" }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedVoice?.name ?? "Voz por defecto"}</p>
                  <p className="text-xs" style={{ color: "#888888" }}>{selectedVoice?.isCloned ? "Voz clonada" : "Sistema"}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "#888888" }}>→</span>
              </button>
            ) : (
              <div>
                {referenceFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#111111", border: "1px solid #222222" }}>
                    <Mic2 size={16} style={{ color: "#a78bfa", flexShrink: 0 }} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{referenceFile.name}</p>
                      <p className="text-xs" style={{ color: "#888888" }}>{(referenceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={() => setReferenceFile(null)} style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => refInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 px-4 py-6 rounded-xl cursor-pointer transition-all hover:border-white/15"
                    style={{ background: "#111111", border: "1px dashed #222222" }}
                  >
                    <Mic2 size={20} style={{ color: "#666666" }} />
                    <p className="text-sm" style={{ color: "#888888" }}>Sube un audio de referencia de voz</p>
                    <p className="text-xs" style={{ color: "#666666" }}>MP3, WAV, M4A</p>
                  </div>
                )}
                <input ref={refInputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setReferenceFile(f); e.target.value = ""; }} />
              </div>
            )}
          </div>

          {/* Cost note */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888888" }}>
            <span className="flex-shrink-0 mt-0.5" style={{ color: "#ffffff" }}>ℹ</span>
            <span>
              Se aplica un incremento del{" "}
              <span className="font-semibold" style={{ color: "#aaaaaa" }}>{plan === "enterprise" ? "10%" : "20%"}</span>{" "}
              sobre el coste estándar para cubrir los costes de transcripción y traducción automática.
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleTranslate}
              disabled={!file || loading || isFreeExhausted}
              className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-black text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: "#ffffff", boxShadow: loading || !file ? "none" : "0 4px 20px rgba(255,255,255,0.2)" }}
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
                <><Globe size={15} /> Iniciar traducción</>
              )}
            </button>
            <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
              Los audios se eliminan automáticamente en {TRANSLATE_RETENTION[plan] ?? 3} días · Descárgalos una vez generados
            </p>
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-2xl border p-6 space-y-5" style={{ background: "#111111", borderColor: "#222222" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
                <p className="text-sm font-semibold text-white">Audio traducido al {result.targetLanguageName}</p>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ color: "#888888", background: "#111111", border: "1px solid #222222" }}>
                  {result.charCost.toLocaleString("es-ES")} créditos · {result.durationSeconds.toFixed(1)}s
                </span>
              </div>
              <AudioPlayer src={result.audioUrl} filename={`traduccion-${result.targetLanguageName.toLowerCase()}.mp3`} />
              <div className="grid gap-3">
                <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #222222" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#666666" }}>Transcripción (español)</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{result.transcribedText}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "#111111", border: "1px solid #222222" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#666666" }}>Traducción ({result.targetLanguageName})</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{result.translatedText}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Historial tab ── */}
      {innerTab === "history" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#444444", pointerEvents: "none" }} />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar traducciones..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ background: "#111111", border: "1px solid #222222", color: "#e5e7eb" }}
              />
            </div>
            <button onClick={fetchHistory} className="p-2.5 rounded-xl transition-colors hover:bg-white/5" style={{ border: "1px solid #222222", color: "#888888", background: "transparent", cursor: "pointer" }}>
              <RefreshCw size={14} className={loadingHistory ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24" style={{ color: "#ffffff" }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe size={32} style={{ color: "#222222", marginBottom: "12px" }} />
              <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
                {historySearch ? "No se encontraron traducciones" : "Sin traducciones aún"}
              </p>
              {!historySearch && <p className="text-xs mt-1" style={{ color: "#444444" }}>Las traducciones que realices aparecerán aquí</p>}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #222222" }}>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#111111", borderBottom: "1px solid #222222" }}>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>Archivo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>Idioma destino</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>Retención</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((task, i) => {
                    const langInfo = TRANSLATE_LANGS.find((l) => l.code === task.targetLanguage);
                    return (
                      <tr
                        key={task.id}
                        style={{ background: i % 2 === 0 ? "#000000" : "#111111", borderBottom: i < filteredHistory.length - 1 ? "1px solid #1a1a1a" : "none" }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Globe size={13} style={{ color: "#666666", flexShrink: 0 }} />
                            <span className="text-sm text-white truncate" style={{ maxWidth: 160 }}>{task.fileName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {langInfo && <span className={`fi fi-${langInfo.fi}`} style={{ width: "18px", height: "14px", display: "inline-block", borderRadius: "2px", flexShrink: 0 }} />}
                            <span className="text-sm" style={{ color: "#d1d5db" }}>{task.targetLanguageName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={
                              task.status === "completed"
                                ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                                : task.status === "processing"
                                ? { background: "rgba(250,204,21,0.12)", color: "#fbbf24", border: "1px solid rgba(250,204,21,0.25)" }
                                : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
                            }
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                            {task.status === "completed" ? "Completado" : task.status === "processing" ? "Procesando" : "Error"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: "#6b7280" }}>
                            {new Date(task.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {task.expiresAt && (() => {
                            const daysLeft = Math.ceil((new Date(task.expiresAt).getTime() - Date.now()) / 86_400_000);
                            return daysLeft <= 0
                              ? <span style={{ fontSize: "11px", color: "#f87171" }}>Expirado</span>
                              : <span style={{ fontSize: "11px", color: daysLeft <= 3 ? "#f59e0b" : "#6b7280" }}>Expira en {daysLeft}d</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {task.audioUrl && task.status !== "expired" && (
                            <a
                              href={task.audioUrl}
                              download={`traduccion-${task.targetLanguage}-${task.id}.mp3`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                              style={{ background: "rgba(255,255,255,0.06)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <Download size={11} /> Descargar
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
interface TTask {
  id: string;
  fileName: string;
  status: string;
  creditsUsed: number;
  speakers: string;
  durationSeconds: number | null;
  transcriptionText: string | null;
  errorMessage: string | null;
  createdAt: string;
}

function TranscribeTab({ onTranscribed, plan, transcriptionUsed, onBilling }: {
  onTranscribed: () => void;
  plan: string;
  transcriptionUsed: number;
  onBilling: () => void;
}) {
  const [tasks, setTasks] = useState<TTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewerTask, setViewerTask] = useState<TTask | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Create modal state
  const [file, setFile] = useState<File | null>(null);
  const [speakers, setSpeakers] = useState("auto");
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Viewer copy
  const [copied, setCopied] = useState(false);

  const FREE_LIMIT = 2;
  const isFreeExhausted = plan === "free" && transcriptionUsed >= FREE_LIMIT;

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/transcription-tasks");
      const data = await res.json() as { tasks: TTask[] };
      setTasks(data.tasks ?? []);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const ok = f.type.startsWith("audio/") || f.type.startsWith("video/") ||
      ["mp3", "wav", "m4a", "flac", "mp4", "mov", "webm"].includes(ext);
    if (!ok) { setCreateError("Formato no soportado. Usa MP3, WAV, M4A, FLAC o vídeo."); return; }
    setFile(f);
    setCreateError(null);
    setFileDuration(null);
    // Estimate duration client-side
    const url = URL.createObjectURL(f);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setFileDuration(isFinite(audio.duration) ? audio.duration : null);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    if (!file || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("speakers", speakers);
      fd.append("language", "es");
      const res = await fetch("/api/transcription-tasks", { method: "POST", body: fd });
      const data = await res.json() as { task?: TTask; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      onTranscribed();
      setShowCreate(false);
      setFile(null);
      setSpeakers("auto");
      setFileDuration(null);
      await fetchTasks();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setRemovingId(id);
    try {
      await fetch(`/api/transcription-tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setRemovingId(null);
    }
  }

  function handleDownload(task: TTask) {
    if (!task.transcriptionText) return;
    const blob = new Blob([task.transcriptionText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.fileName.replace(/\.[^.]+$/, "")}-transcripcion.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function fmtRelative(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  function fmtDur(s: number) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const filtered = search.trim()
    ? tasks.filter((t) => t.fileName.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  const thStyle: React.CSSProperties = {
    padding: "10px 16px", fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.06em",
    color: "#666666", textAlign: "left", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: "#c9cad4", verticalAlign: "middle",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Audio a Texto</h2>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#bbbbbb", border: "1px solid rgba(255,255,255,0.15)" }}>
            BETA
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Transcribe audio y vídeo a texto usando reconocimiento de voz de alta precisión.
        </p>
      </div>

      {/* Free plan banner */}
      {plan === "free" && (isFreeExhausted ? (
        <div style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>Has agotado tus usos gratuitos. Actualiza tu plan para continuar.</p>
          <button onClick={onBilling} style={{ padding: "5px 12px", borderRadius: 7, background: "#ffffff", color: "#000000", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}>Ver planes</button>
        </div>
      ) : (
        <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 12, color: "#4a6fa8", margin: 0 }}>
            Plan gratuito · <strong style={{ color: "#aaaaaa" }}>{Math.max(0, FREE_LIMIT - transcriptionUsed)} de {FREE_LIMIT} usos restantes</strong> · Suscríbete para uso ilimitado
          </p>
        </div>
      ))}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#444444", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de archivo..."
            style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: "#111111", border: "1px solid #1a1a1a", borderRadius: 8, color: "#d1d5db", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={() => { if (!isFreeExhausted) setShowCreate(true); else onBilling(); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, background: "#ffffff", color: "#000000", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 10px rgba(255,255,255,0.08)" }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Crear tarea
        </button>
        <button onClick={fetchTasks} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "#111111", border: "1px solid #1a1a1a", color: "#9ca3af", cursor: "pointer", flexShrink: 0 }} title="Actualizar">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#111111", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
              <th style={thStyle}>Archivo</th>
              <th style={thStyle}>Actualizado</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Créditos</th>
              <th style={thStyle}>Hablantes</th>
              <th style={thStyle}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loadingTasks ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <td key={j} style={tdStyle}>
                      <div style={{ height: 14, borderRadius: 4, background: "#1a1a1a", animation: "pulse 2s infinite", width: j === 1 ? "70%" : "40%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: "48px 16px", color: "#444444" }}>
                  <FileAudio size={32} style={{ margin: "0 auto 10px", color: "#222222" }} />
                  <p style={{ margin: 0, fontWeight: 500, color: "#666666" }}>{search ? "Sin resultados" : "No hay tareas aún"}</p>
                  {!search && <p style={{ margin: "4px 0 0", fontSize: 12 }}>Haz click en &ldquo;Crear tarea&rdquo; para transcribir tu primer audio</p>}
                </td>
              </tr>
            ) : (
              filtered.map((task, idx) => {
                const isRemoving = removingId === task.id;
                const rowBg = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                const statusBadge = task.status === "completed"
                  ? { label: "Completado", bg: "rgba(74,222,128,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.25)" }
                  : task.status === "processing"
                  ? { label: "Procesando", bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" }
                  : { label: "Error", bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)" };

                return (
                  <tr
                    key={task.id}
                    style={{ background: isRemoving ? "rgba(239,68,68,0.05)" : rowBg, borderBottom: "1px solid #111111", transition: "background 0.15s, opacity 0.3s", opacity: isRemoving ? 0.4 : 1 }}
                    onMouseEnter={(e) => { if (!isRemoving) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { if (!isRemoving) e.currentTarget.style.background = isRemoving ? "rgba(239,68,68,0.05)" : rowBg; }}
                  >
                    {/* File */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: "#111111", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <FileAudio size={14} style={{ color: "#ffffff" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{task.fileName}</p>
                          {task.durationSeconds && (
                            <p style={{ margin: 0, fontSize: 11, color: "#666666" }}>{fmtDur(task.durationSeconds)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Updated */}
                    <td style={{ ...tdStyle, color: "#6b7280", fontSize: 12 }}>{fmtRelative(task.createdAt)}</td>
                    {/* Status */}
                    <td style={tdStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                        {statusBadge.label}
                      </span>
                    </td>
                    {/* Credits */}
                    <td style={{ ...tdStyle, color: "#9ca3af" }}>
                      {task.creditsUsed > 0 ? task.creditsUsed.toLocaleString("es-ES") : "—"}
                    </td>
                    {/* Speakers */}
                    <td style={{ ...tdStyle, color: "#9ca3af" }}>
                      {task.speakers === "auto" ? "Auto" : task.speakers}
                    </td>
                    {/* Action */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {task.status === "completed" && (
                          <button
                            onClick={() => setViewerTask(task)}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.06)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}
                          >
                            <Type size={11} /> Abrir visor
                          </button>
                        )}
                        {task.status === "error" && (
                          <span style={{ fontSize: 11, color: "#f87171", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={task.errorMessage ?? ""}>
                            {task.errorMessage ?? "Error"}
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(task.id)}
                          disabled={isRemoving}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "transparent", border: "none", color: "#444444", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#444444"; e.currentTarget.style.background = "transparent"; }}
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setFile(null); setCreateError(null); } }}
        >
          <div style={{ width: "100%", maxWidth: 480, background: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #1a1a1a" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>Crear tarea de transcripción</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>El audio se procesará y el resultado quedará guardado</p>
              </div>
              <button onClick={() => { setShowCreate(false); setFile(null); setCreateError(null); }} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                style={{ border: `2px dashed ${dragging ? "#ffffff" : "#1a1a1a"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(255,255,255,0.03)" : "#000000", transition: "all 0.15s" }}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.flac,.mp4,.mov,.webm,audio/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {file ? (
                  <div>
                    <FileAudio size={24} style={{ color: "#ffffff", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#e5e7eb" }}>{file.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {fileDuration !== null && ` · ${fmtDur(fileDuration)}`}
                      {" · "}<button onClick={(ev) => { ev.stopPropagation(); setFile(null); setFileDuration(null); }} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: 12, padding: 0 }}>Cambiar</button>
                    </p>
                  </div>
                ) : (
                  <>
                    <FileAudio size={28} style={{ color: "#444444", margin: "0 auto 10px" }} />
                    <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>Arrastra tu archivo aquí o haz clic para elegir</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#444444" }}>MP3, WAV, M4A, FLAC, MP4, MOV, WEBM</p>
                  </>
                )}
              </div>

              {/* Speakers */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>Número de hablantes</label>
                <CustomSelect
                  options={[
                    { value: "auto", label: "Automático (detección por IA)" },
                    { value: "1", label: "1 hablante" },
                    { value: "2", label: "2 hablantes" },
                    { value: "3", label: "3 hablantes" },
                    { value: "4+", label: "4+ hablantes" },
                  ]}
                  value={speakers}
                  onChange={setSpeakers}
                />
              </div>

              {/* Info */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ color: "#ffffff", fontSize: 13, flexShrink: 0, marginTop: 1 }}>ℹ</span>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                  Los créditos se calculan según los caracteres transcritos, al mismo precio que la generación de audio.
                  {fileDuration !== null && ` Duración estimada: ${fmtDur(fileDuration)}.`}
                </p>
              </div>

              {createError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13 }}>
                  {createError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowCreate(false); setFile(null); setCreateError(null); }} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "transparent", border: "1px solid #1a1a1a", color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!file || creating}
                  style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, background: "#ffffff", color: "#000000", fontSize: 13, fontWeight: 600, border: "none", cursor: !file || creating ? "not-allowed" : "pointer", opacity: !file || creating ? 0.6 : 1, boxShadow: !file || creating ? "none" : "0 2px 10px rgba(255,255,255,0.08)" }}
                >
                  {creating ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Transcribiendo...</>
                  ) : (
                    <><FileAudio size={14} /> Crear tarea</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Viewer Modal ── */}
      {viewerTask && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewerTask(null); }}
        >
          <div style={{ width: "100%", maxWidth: 620, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#111111", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileAudio size={16} style={{ color: "#ffffff" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewerTask.fileName}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#666666" }}>
                  {viewerTask.creditsUsed.toLocaleString("es-ES")} créditos · {fmtRelative(viewerTask.createdAt)}
                </p>
              </div>
              <button onClick={() => setViewerTask(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Text */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <p style={{ margin: 0, fontSize: 14, color: "#e5e7eb", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {viewerTask.transcriptionText}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
              <button
                onClick={() => { if (!viewerTask.transcriptionText) return; navigator.clipboard.writeText(viewerTask.transcriptionText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: copied ? "rgba(74,222,128,0.15)" : "#111111", color: copied ? "#4ade80" : "#aaaaaa", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.15)"}`, cursor: "pointer" }}
              >
                <Copy size={12} />{copied ? "¡Copiado!" : "Copiar texto"}
              </button>
              <button
                onClick={() => handleDownload(viewerTask)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "#111111", color: "#9ca3af", border: "1px solid #1a1a1a", cursor: "pointer" }}
              >
                <Download size={12} /> Descargar .txt
              </button>
            </div>
          </div>
        </div>
      )}
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

const REDEEM_PLANS = [
  { key: "starter",    label: "Starter",    price: 7,   chars: 200_000   },
  { key: "pro",        label: "Pro",         price: 13,  chars: 500_000   },
  { key: "elite",      label: "Elite",       price: 25,  chars: 1_000_000 },
  { key: "enterprise", label: "Enterprise",  price: 110, chars: 5_000_000 },
] as const;

const REDEEM_PACKS = [
  { key: "100k", label: "100.000 caracteres", price: 5,  chars: 100_000   },
  { key: "300k", label: "300.000 caracteres", price: 12, chars: 300_000   },
  { key: "600k", label: "600.000 caracteres", price: 19, chars: 600_000   },
  { key: "1m",   label: "1.000.000 caracteres", price: 30, chars: 1_000_000 },
] as const;

function WithdrawModal({ balance, onClose, onSuccess }: { balance: number; onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState<"paypal" | "transfer">("paypal");
  const [amount, setAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxAmount = balance / 100;
  const numAmount = parseFloat(amount) || 0;
  const canSubmit = numAmount >= 20 && numAmount <= maxAmount && (method === "paypal" ? !!paypalEmail : !!(bankName && bankIban));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const details = method === "paypal" ? { email: paypalEmail } : { bankName, iban: bankIban };
      const res = await fetch("/api/referral/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, method, details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const inputSt = { background: "#000000", border: "1px solid #222222", color: "#e5e7eb", borderRadius: "10px", padding: "10px 14px", width: "100%", fontSize: "14px", outline: "none" };
  const labelSt = { display: "block", fontSize: "12px", fontWeight: 600 as const, color: "#888888", marginBottom: "6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#111111", border: "1px solid #222222", borderRadius: "20px", width: "100%", maxWidth: "420px", padding: "28px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "18px", lineHeight: 1 }}>✕</button>

        <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>Retirar en efectivo</h2>
        <p style={{ color: "#888888", fontSize: "13px", margin: "0 0 20px" }}>
          Saldo disponible: <strong style={{ color: "#4ade80" }}>${maxAmount.toFixed(2)}</strong> · Mín. $20
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Method toggle */}
          <div>
            <label style={labelSt}>Método de pago</label>
            <div style={{ position: "relative", background: "#000000", border: "1px solid #222222", borderRadius: "8px", padding: "3px", display: "flex" }}>
              <div style={{ position: "absolute", top: "3px", left: "3px", width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "#1a1a1a", borderRadius: "5px", transition: "transform 0.2s ease", transform: `translateX(${method === "transfer" ? "100%" : "0%"})`, border: "1px solid #222222" }} />
              {(["paypal", "transfer"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  style={{ flex: 1, position: "relative", zIndex: 1, padding: "8px", borderRadius: "5px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: method === m ? "#e5e7eb" : "#6b7280", transition: "color 0.2s" }}
                >
                  {m === "paypal" ? "PayPal" : "Transferencia"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label style={labelSt}>Importe (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: "14px" }}>$</span>
              <input
                style={{ ...inputSt, paddingLeft: "28px" }}
                type="number"
                min="20"
                max={maxAmount}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="20.00"
                required
              />
            </div>
            {numAmount > maxAmount && numAmount > 0 && (
              <p style={{ color: "#f87171", fontSize: "12px", marginTop: 4 }}>Supera tu saldo disponible</p>
            )}
          </div>

          {/* PayPal fields */}
          {method === "paypal" && (
            <div>
              <label style={labelSt}>Email de PayPal</label>
              <input style={inputSt} type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} placeholder="tu@paypal.com" required />
            </div>
          )}

          {/* Transfer fields */}
          {method === "transfer" && (
            <>
              <div>
                <label style={labelSt}>Nombre del banco</label>
                <input style={inputSt} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Nombre del banco" required />
              </div>
              <div>
                <label style={labelSt}>IBAN / Número de cuenta</label>
                <input style={inputSt} value={bankIban} onChange={e => setBankIban(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" required />
              </div>
            </>
          )}

          {error && <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            style={{ padding: "12px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: canSubmit && !loading ? "pointer" : "not-allowed", opacity: canSubmit && !loading ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loading ? (
              <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            Solicitar retiro
          </button>
        </form>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function ReferralTab({ onClaimed }: { onClaimed: () => void }) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralBalance, setReferralBalance] = useState(0);
  const [referralEarned, setReferralEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  // Redeem state
  const [openRedeem, setOpenRedeem] = useState<"plan" | "chars" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<typeof REDEEM_PLANS[number]["key"]>("starter");
  const [selectedPack, setSelectedPack] = useState<typeof REDEEM_PACKS[number]["key"]>("100k");
  const [redeemingPlan, setRedeemingPlan] = useState(false);
  const [redeemingChars, setRedeemingChars] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchReferral = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      const data = await res.json();
      setReferralCode(data.referralCode ?? null);
      setReferrals(data.referrals ?? []);
      setReferralBalance(data.referralBalance ?? 0);
      setReferralEarned(data.referralEarned ?? 0);
      setCanWithdraw(data.canWithdraw ?? false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const referralLink = referralCode ? `https://elitelabs.es/?ref=${referralCode}` : "";

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRedeemPlan() {
    setRedeemingPlan(true);
    setRedeemMsg(null);
    try {
      const res = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "plan", planKey: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemMsg({ ok: false, text: data.error ?? "Error al canjear" });
      } else {
        const plan = REDEEM_PLANS.find(p => p.key === selectedPlan);
        setRedeemMsg({ ok: true, text: `¡${plan?.chars.toLocaleString("es-ES")} caracteres añadidos!` });
        onClaimed();
        fetchReferral();
        setTimeout(() => setRedeemMsg(null), 5000);
      }
    } finally {
      setRedeemingPlan(false);
    }
  }

  async function handleRedeemChars() {
    setRedeemingChars(true);
    setRedeemMsg(null);
    try {
      const res = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chars", packKey: selectedPack }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemMsg({ ok: false, text: data.error ?? "Error al canjear" });
      } else {
        const pack = REDEEM_PACKS.find(p => p.key === selectedPack);
        setRedeemMsg({ ok: true, text: `¡${pack?.chars.toLocaleString("es-ES")} caracteres añadidos!` });
        onClaimed();
        fetchReferral();
        setTimeout(() => setRedeemMsg(null), 5000);
      }
    } finally {
      setRedeemingChars(false);
    }
  }

  function centsToUSD(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

  const currentPlan = REDEEM_PLANS.find(p => p.key === selectedPlan)!;
  const currentPack = REDEEM_PACKS.find(p => p.key === selectedPack)!;
  const canRedeemPlan = referralBalance >= currentPlan.price * 100;
  const canRedeemChars = referralBalance >= currentPack.price * 100;

  const spin = (
    <svg style={{ width: 13, height: 13, animation: "spin 1s linear infinite", flexShrink: 0 }} fill="none" viewBox="0 0 24 24">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  // Outline button style for the Canjear column
  const redeemRowBtn = (active: boolean): React.CSSProperties => ({
    width: "100%", textAlign: "center" as const, padding: "10px 14px",
    borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500,
    background: active ? "#1a1a1a" : "transparent",
    border: `1px solid ${active ? "#3a3a5e" : "#222222"}`,
    color: active ? "#e5e7eb" : "#9ca3af",
    transition: "all 0.15s",
  });

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
      {showWithdrawModal && (
        <WithdrawModal
          balance={referralBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setWithdrawMsg("¡Solicitud de retiro enviada! Te contactaremos pronto.");
            fetchReferral();
            setTimeout(() => setWithdrawMsg(null), 6000);
          }}
        />
      )}

      {/* Page title */}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 32 }}>
        Gana recompensas de dos maneras
      </h1>

      {/* ── SECCIÓN 1 ───────────────────────────────────────── */}
      <div style={{ paddingBottom: 36, marginBottom: 36, borderBottom: "1px solid #1a1a1a" }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={15} style={{ color: "#ffffff", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
              Comparte tu enlace y obtén créditos de producto
            </span>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button
                style={{ background: "none", border: "none", cursor: "default", color: "#666666", padding: 0, display: "flex" }}
                title="Comparte tu enlace y cuando alguien pague recibirás saldo que puedes canjear por caracteres."
              >
                <Info size={13} />
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Ver historial de recompensas <ChevronRight size={13} />
          </button>
        </div>

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "40px 48px", alignItems: "start" }}>

          {/* Left: link + stats */}
          <div>
            <p style={{ fontSize: 12, color: "#888888", marginBottom: 8 }}>Tu enlace único:</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <div style={{ flex: 1, padding: "9px 14px", borderRadius: 10, background: "transparent", border: "1px solid #222222", fontSize: 13, fontFamily: "monospace", color: "#aaaaaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {loading ? "—" : (referralLink || "—")}
              </div>
              <button
                onClick={handleCopy}
                disabled={!referralLink}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
                  borderRadius: 10, fontSize: 12, fontWeight: 600, border: "1px solid #222222",
                  background: "transparent", cursor: referralLink ? "pointer" : "not-allowed",
                  color: copied ? "#4ade80" : "#9ca3af", flexShrink: 0, transition: "color 0.15s",
                  opacity: referralLink ? 1 : 0.4,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            {/* Balance stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#888888" }}>Disponible para canjear</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", lineHeight: 1 }}>
                  {loading ? <span style={{ color: "#444444" }}>—</span> : centsToUSD(referralBalance)}
                </p>
              </div>
              <div style={{ width: 1, height: 40, background: "#222222", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: "#888888", marginBottom: 4 }}>Créditos Totales Ganados</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {loading ? <span style={{ color: "#444444" }}>—</span> : centsToUSD(referralEarned)}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Canjear column */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#666666", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Canjear
            </p>

            {/* Plan button */}
            <button
              onClick={() => setOpenRedeem(o => o === "plan" ? null : "plan")}
              style={redeemRowBtn(openRedeem === "plan")}
            >
              Plan de 1 mes
            </button>

            {openRedeem === "plan" && (
              <div style={{ marginTop: 8, padding: "14px", background: "#111111", borderRadius: 10, border: "1px solid #222222", marginBottom: 8 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {REDEEM_PLANS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setSelectedPlan(p.key)}
                      style={{
                        padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                        cursor: "pointer", transition: "all 0.15s",
                        ...(selectedPlan === p.key
                          ? { background: "rgba(255,255,255,0.1)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
                          : { background: "transparent", color: "#6b7280", border: "1px solid #222222" }),
                      }}
                    >
                      {p.label} <span style={{ opacity: 0.7 }}>${p.price}</span>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
                  {currentPlan.chars.toLocaleString("es-ES")} chars
                  {!canRedeemPlan && <span style={{ color: "#f87171" }}> · saldo insuficiente</span>}
                </p>
                <button
                  onClick={handleRedeemPlan}
                  disabled={!canRedeemPlan || redeemingPlan}
                  style={{ width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: canRedeemPlan && !redeemingPlan ? "pointer" : "not-allowed", background: "#ffffff", color: "#000000", opacity: canRedeemPlan && !redeemingPlan ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {redeemingPlan ? spin : null} Canjear plan
                </button>
              </div>
            )}

            {/* Chars button */}
            <button
              onClick={() => setOpenRedeem(o => o === "chars" ? null : "chars")}
              style={{ ...redeemRowBtn(openRedeem === "chars"), marginTop: openRedeem === "plan" ? 0 : 8 }}
            >
              Caracteres extra
            </button>

            {openRedeem === "chars" && (
              <div style={{ marginTop: 8, padding: "14px", background: "#111111", borderRadius: 10, border: "1px solid #222222" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {REDEEM_PACKS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setSelectedPack(p.key)}
                      style={{
                        padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                        cursor: "pointer", transition: "all 0.15s",
                        ...(selectedPack === p.key
                          ? { background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)" }
                          : { background: "transparent", color: "#6b7280", border: "1px solid #222222" }),
                      }}
                    >
                      {p.label} <span style={{ opacity: 0.7 }}>${p.price}</span>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
                  {currentPack.chars.toLocaleString("es-ES")} chars
                  {!canRedeemChars && <span style={{ color: "#f87171" }}> · saldo insuficiente</span>}
                </p>
                <button
                  onClick={handleRedeemChars}
                  disabled={!canRedeemChars || redeemingChars}
                  style={{ width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: canRedeemChars && !redeemingChars ? "pointer" : "not-allowed", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", opacity: canRedeemChars && !redeemingChars ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {redeemingChars ? spin : null} Canjear
                </button>
              </div>
            )}

            {redeemMsg && (
              <p style={{ fontSize: 12, marginTop: 10, fontWeight: 600, color: redeemMsg.ok ? "#4ade80" : "#f87171" }}>
                {redeemMsg.ok ? "✓ " : ""}{redeemMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* History (inline, below the two columns) */}
        {showHistory && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 14 }}>Historial de recompensas</p>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2].map(i => <div key={i} style={{ height: 48, borderRadius: 10, background: "#1a1a1a" }} />)}
              </div>
            ) : referrals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Gift size={24} style={{ color: "#222222", marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: "#6b7280" }}>Aún no tienes referidos</p>
                <p style={{ fontSize: 12, color: "#444444", marginTop: 4 }}>Comparte tu enlace y empieza a ganar</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {referrals.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "#111111", border: "1px solid #1a1a1a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#000000", flexShrink: 0 }}>{i + 1}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb" }}>Referido #{i + 1}</p>
                        <p style={{ fontSize: 11, color: "#6b7280" }}>{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: "999px",
                      ...(r.status === "claimed"
                        ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" }
                        : r.status === "rewarded"
                        ? { background: "rgba(255,255,255,0.06)", color: "#aaaaaa" }
                        : { background: "rgba(255,255,255,0.06)", color: "#888888" })
                    }}>
                      {r.status === "claimed" ? "Canjeado" : r.status === "rewarded" ? "Completado" : "Pendiente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECCIÓN 2 ───────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <DollarSign size={15} style={{ color: canWithdraw ? "#4ade80" : "#eab308", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            Comparte tu enlace y recibe comisiones en efectivo
          </span>
          {canWithdraw && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: "999px", background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", flexShrink: 0 }}>
              Afiliado aprobado
            </span>
          )}
          <div style={{ display: "inline-flex" }}>
            <button style={{ background: "none", border: "none", cursor: "default", color: "#666666", padding: 0, display: "flex" }} title="Gana un 5% en efectivo por cada pago de tus referidos. Requiere aprobación previa del equipo.">
              <Info size={13} />
            </button>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
          Gana un <strong style={{ color: "#e5e7eb" }}>5% de comisión en efectivo</strong> por cada referido que pague
        </p>

        {withdrawMsg && (
          <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 14 }}>✓ {withdrawMsg}</p>
        )}

        {canWithdraw ? (
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, color: "#888888", marginBottom: 3 }}>Disponible para retirar</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>{centsToUSD(referralBalance)}</p>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Retirar en efectivo <ChevronRight size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <a
              href="/dashboard/afiliados"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "transparent", color: "#e5e7eb", border: "1px solid #444444", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Más información y solicitar
            </a>
            <span style={{ fontSize: 13, color: "#666666" }}>
              ¿Ya estás aprobado?{" "}
              <a href="/dashboard/afiliados" style={{ color: "#6b7280", textDecoration: "underline" }}>
                Ver tu panel →
              </a>
            </span>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
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

function TeamTab() {
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

  const cardStyle = { background: "#111111", borderColor: "#222222" };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-10 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-lg mx-auto py-10 space-y-6">
        <div className="rounded-2xl border p-8 text-center space-y-3" style={cardStyle}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Users size={26} style={{ color: "#ffffff" }} />
          </div>
          <h2 className="text-lg font-bold text-white">Crear tu equipo</h2>
          <p className="text-sm" style={{ color: "#888888" }}>
            Crea un equipo para distribuir caracteres mensuales entre tus miembros automáticamente cada mes.
          </p>
        </div>
        <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
            Nombre del equipo
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ej. Equipo de Marketing"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-200 focus:outline-none"
            style={{ background: "#111111", border: "1px solid #222222" }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !teamName.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#ffffff" }}
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Users size={18} style={{ color: "#ffffff" }} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">{team.name}</h2>
          <p className="text-xs" style={{ color: "#666666" }}>{team.members.length} miembro{team.members.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Credits summary */}
      <div className="rounded-2xl border p-5 space-y-3" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
          Resumen de créditos este mes
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
            <p className="text-xs mb-1" style={{ color: "#666666" }}>Total equipo</p>
            <p className="text-sm font-bold text-white">{ENTERPRISE_CREDITS.toLocaleString("es-ES")}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
            <p className="text-xs mb-1" style={{ color: "#666666" }}>Tu parte ({ownerPercent}%)</p>
            <p className="text-sm font-bold" style={{ color: "#aaaaaa" }}>{ownerCredits.toLocaleString("es-ES")}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
            <p className="text-xs mb-1" style={{ color: "#666666" }}>Distribuidos</p>
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
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
          Miembros y distribución
        </p>

        {team.members.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "#666666" }}>
            Aún no hay miembros. Invita a alguien abajo.
          </p>
        ) : (
          <div className="space-y-3">
            {team.members.map((member) => {
              const pct = percentages[member.id] ?? 0;
              const chars = Math.floor(ENTERPRISE_CREDITS * pct / 100);
              return (
                <div key={member.id} className="rounded-xl p-4 space-y-3" style={{ background: "#111111", border: "1px solid #1a1a1a" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "#ffffff" }}>
                        {(member.name ?? member.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{member.name ?? member.email}</p>
                        <p className="text-xs truncate" style={{ color: "#666666" }}>{member.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ml-2"
                      style={{ color: "#666666", background: "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
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
                        style={{ background: "#0a0a0a", border: "1px solid #222222" }}
                      />
                      <span className="text-xs" style={{ color: "#666666" }}>%</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "#666666" }}>
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
              style={{ background: "#ffffff" }}
            >
              {saving ? "Guardando..." : "Guardar distribución"}
            </button>
            <p className="text-xs text-center leading-relaxed" style={{ color: "#666666" }}>
              Los cambios se aplican inmediatamente. En cada renovación mensual los créditos se redistribuyen automáticamente.
            </p>
          </>
        )}
      </div>

      {/* Invite */}
      <div className="rounded-2xl border p-5 space-y-3" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
          Invitar miembro
        </p>
        <p className="text-xs" style={{ color: "#666666" }}>
          El usuario debe tener cuenta activa en Elite Labs.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm text-gray-200 focus:outline-none"
            style={{ background: "#111111", border: "1px solid #222222" }}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex-shrink-0"
            style={{ background: "#ffffff" }}
          >
            {inviting ? "..." : "Invitar"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border p-5" style={{ background: "#111111", borderColor: "#3a1a1a" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#7a3a3a" }}>
          Zona de peligro
        </p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "#666666" }}>
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
          <div className="rounded-2xl border p-6 w-full max-w-sm space-y-4" style={{ background: "#111111", borderColor: "#222222" }}>
            <h3 className="text-base font-bold text-white">¿Eliminar el equipo &ldquo;{team.name}&rdquo;?</h3>
            <p className="text-sm" style={{ color: "#888888" }}>
              Los créditos asignados a los miembros se devolverán automáticamente a tu cuenta antes de eliminar el equipo. Los miembros perderán acceso inmediatamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingTeam}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "#1a1a1a", border: "1px solid #222222", color: "#888888" }}
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

/* ─── Avatar with progress ring ──────────────────────────── */
/* ─── Main Dashboard ──────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as Tab | null) ?? "home";
  function setActiveTab(tab: Tab) { router.push(`/dashboard?tab=${tab}`); }
  const [credits, setCredits] = useState<number | null>(null);
  const [extraCredits, setExtraCredits] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [effectivePlan, setEffectivePlan] = useState<string>("free");
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
    fetch("/api/auth-session", { method: "POST" }).catch(() => {});
  }, [fetchCredits, fetchVoices, fetchMemberInfo]);

  // Restore selected voice from localStorage once userId is available
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(`vf_selected_voice_${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as SelectedVoice;
        setSelectedVoice(parsed);
      }
    } catch {
      // ignore malformed data
    }
  }, [user?.id]);

  // Persist selected voice to localStorage whenever it changes
  useEffect(() => {
    if (!user?.id || selectedVoice === null) return;
    try {
      localStorage.setItem(`vf_selected_voice_${user.id}`, JSON.stringify(selectedVoice));
    } catch {
      // ignore quota errors
    }
  }, [selectedVoice, user?.id]);

  const successPlan     = searchParams.get("plan");
  const creditsBought   = searchParams.get("creditsBought");
  const planChanged     = searchParams.get("planChanged");

  function handleUseVoice(voice: SelectedVoice) {
    setSelectedVoice(voice);
    setActiveTab("generate");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#000000" }}>
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
        style={{ width: "260px", background: "#111111", borderRight: "1px solid #1a1a1a" }}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} plan={plan} memberInfo={memberInfo} />
      </div>

      <main className="flex-1 overflow-auto relative min-w-0" style={{ padding: "0" }}>
        {/* Topbar */}
        {(() => {
          const TAB_META: Record<Tab, { title: string; Icon: React.ElementType }> = {
            home:       { title: tt.tabs.home,        Icon: Home },
            generate:   { title: tt.tabs.generate,    Icon: Type },
            dialogue:   { title: "Texto a Diálogo",   Icon: MessageSquare },
            transcribe: { title: tt.tabs.transcribe,  Icon: FileAudio },
            translate:  { title: tt.tabs.translate,   Icon: Globe },
            history:    { title: tt.tabs.history,     Icon: Clock },
            billing:    { title: tt.tabs.billing,     Icon: CreditCard },
            voices:     { title: tt.tabs.voices,      Icon: Mic2 },
            referral:   { title: tt.tabs.referral,    Icon: Gift },
            team:       { title: "Equipo",             Icon: Users },
            imagevideo: { title: "Imagen y Video",     Icon: ImageIcon },
          };
          const { title, Icon } = TAB_META[activeTab] ?? { title: "", Icon: Home };
          return (
            <div style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #1a1a1a", background: "#000000", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Hamburger — opens mobile drawer / collapses desktop sidebar */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #222222", background: "transparent", cursor: "pointer", color: "#888888", flexShrink: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/><rect y="12.5" width="16" height="1.5" rx="0.75" fill="currentColor"/></svg>
                </button>
                <Icon size={16} style={{ color: "#444444" }} />
                <span className="hidden sm:inline" style={{ fontSize: "14px", fontWeight: 600, color: "#e5e7eb" }}>{title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLang}
                  title="Español / English"
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Languages size={16} />
                </button>
                <button
                  onClick={() => setSupportOpen(true)}
                  title="Soporte"
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <HelpCircle size={16} />
                </button>
                <UserMenu
                  used={credits !== null ? Math.max(0, (BILLING_PLANS.find(p => p.key === plan)?.characters ?? 5_000) + extraCredits - credits) : undefined}
                  total={credits !== null ? (BILLING_PLANS.find(p => p.key === plan)?.characters ?? 5_000) + extraCredits : undefined}
                  plan={plan}
                />
              </div>
            </div>
          );
        })()}
        {/* Page content */}
        <div className="p-4">
        {successPlan && !planChanged && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium text-sm">
              ¡Suscripción activada! Tu plan <strong className="capitalize">{successPlan}</strong> ya está activo.
            </p>
          </div>
        )}
        {planChanged && successPlan && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 font-medium text-sm">
              ¡Plan actualizado correctamente! Ahora estás en el plan <strong className="capitalize">{successPlan}</strong>.
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
        {activeTab === "team" && <TeamTab />}
        {activeTab === "dialogue" && (
          <div style={{ padding: "24px", maxWidth: "1100px" }}>
            <DialogueEditor
              userVoices={voices}
              plan={effectivePlan}
              credits={credits ?? 0}
              onCreditsUpdate={(newCredits) => setCredits(newCredits)}
            />
          </div>
        )}
        {activeTab === "imagevideo" && (
          <div style={{ height: "calc(100vh - 56px)" }}>
            <ImageVideoEditor
              credits={credits ?? 0}
              onCreditsUpdate={(newCredits) => setCredits(newCredits)}
            />
          </div>
        )}
        </div>{/* end page content */}
      </main>
    </div>
  );
}
