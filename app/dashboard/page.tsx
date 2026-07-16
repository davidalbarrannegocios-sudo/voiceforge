// v2
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { Home, Mic, Mic2, Users, Clock, Check, Play, Pause, CreditCard, Gift, Copy, Globe, FileAudio, Type, User, HelpCircle, Languages, Trash2, MoreVertical, AudioWaveform, Zap, Search, MoreHorizontal, RefreshCw, Share2, Download, Upload, X, Square, DollarSign, ChevronRight, ChevronsUpDown, Info, Settings, MessageSquare, Loader, FileText, TrendingUp, ExternalLink, Filter, Shield, Music, Sparkles, ChevronLeft, Volume2, Wand2, Edit3, ScanSearch } from "lucide-react";
import { DialogueEditor } from "@/components/DialogueEditor";
import { EliteLoader } from "@/components/ui/EliteLoader";
import { ImageVideoEditor, type ImageHistoryItem } from "@/components/ImageVideoEditor";
import { Image as ImageIcon } from "lucide-react";
import { calculateCharCost, formatDate } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";
import { VoiceBrowser, SelectedVoice, VoiceAvatar, getGender, formatCount } from "./VoiceBrowser";
import { AudioPlayer } from "./AudioPlayer";
import { SupportModal } from "./SupportModal";
import { ManageBillingPanel } from "./BillingModal";
import { useLang, type Translations } from "./LanguageContext";
import { useSidebar } from "./SidebarContext";
import AudioHistoryList from "@/components/AudioHistoryList";
import { CustomSelect } from "@/components/CustomSelect";
import { VoiceAvatarGenerative } from "@/components/VoiceAvatarGenerative";
import { generateVoiceGradient } from "@/lib/voice-gradient";
import { TaggedTextEditor, cleanPastedText } from "@/components/TaggedTextEditor";
import { NoCreditsModal } from "@/components/NoCreditsModal";
import { downloadAudio, getProxiedUrl, getAudioBlobUrl, generateAudioFilename } from "@/lib/downloadAudio";
import { SupportChat } from "@/components/SupportChat";
import { EliteTextPanel } from "@/components/EliteTextPanel";
import { WhatsNewPopup } from "@/components/WhatsNewPopup";
import { TTS_PREVIEW_COST } from "@/lib/preview-config";

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

type Tab = "home" | "generate" | "voices" | "history" | "billing" | "referral" | "translate" | "transcribe" | "team" | "dialogue" | "imagevideo" | "nichefinder" | "create-voice";

/* ─── Sidebar ─────────────────────────────────────────────── */
type NavSection = {
  label?: string;
  items: { key: Tab; label: string; Icon: React.ElementType; href?: string; isNew?: boolean }[];
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
    platformItems.unshift({ key: "team", label: t.nav.team, Icon: Users });
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
        { key: "generate",      label: t.nav.generate,        Icon: Type },
        { key: "dialogue",      label: t.nav.textToDialogue,  Icon: MessageSquare },
        { key: "transcribe",    label: t.nav.transcribe,      Icon: FileAudio },
        { key: "translate",     label: t.nav.translate,       Icon: Globe },
        { key: "create-voice",  label: "Crear Voz",           Icon: Wand2, isNew: true },
        { key: "history",       label: t.nav.history,         Icon: Clock },
        { key: "nichefinder",   label: "Niche Finder",        Icon: TrendingUp, href: "/descubrir" },
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
          borderRight: "1px solid rgba(255,255,255,0.06)",
          transition: collapsed
            ? "width 0.3s cubic-bezier(0.4,0,0.2,1) 0.12s"
            : "width 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowX: "hidden",
        } : {}),
        background: "#111111",
      }}
    >
      {/* Logo */}
      <div style={{ height: "56px", display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px", justifyContent: "flex-start", flexShrink: 0 }}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/elitelabs.png"
            alt="Elite Labs"
            width={28}
            height={28}
            style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast", flexShrink: 0 }}
            className="rounded-lg"
          />
          <span
            className="font-bold text-white tracking-tight text-sm"
            style={{
              overflow: "hidden",
              whiteSpace: "nowrap",
              maxWidth: collapsed && desktop ? 0 : "120px",
              opacity: collapsed && desktop ? 0 : 1,
              transition: collapsed && desktop
                ? "opacity 0.12s ease, max-width 0s ease 0.12s"
                : "max-width 0s ease, opacity 0.2s ease 0.28s",
            }}
          >
            Elite Labs
          </span>
        </Link>
      </div>

      {/* Product selector */}
      <div
        className="px-3 pb-2 relative flex-shrink-0"
        style={{
          overflow: "hidden",
          maxHeight: collapsed && desktop ? 0 : "60px",
          opacity: collapsed && desktop ? 0 : 1,
          pointerEvents: collapsed && desktop ? "none" : "auto",
          transition: collapsed && desktop
            ? "opacity 0.12s ease, max-height 0s ease 0.12s"
            : "max-height 0s ease, opacity 0.2s ease 0.28s",
        }}
      >
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

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: "8px", paddingBottom: "8px", paddingLeft: "12px", paddingRight: "12px", overflowY: "auto" }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: si < sections.length - 1 ? "20px" : 0 }}>
            {section.label && (
              <p style={{
                paddingLeft: "12px", marginBottom: "4px", fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em", color: "#444444",
                overflow: "hidden", whiteSpace: "nowrap",
                maxHeight: collapsed && desktop ? 0 : "20px",
                opacity: collapsed && desktop ? 0 : 1,
                transition: collapsed && desktop
                  ? "opacity 0.12s ease, max-height 0s ease 0.12s"
                  : "max-height 0s ease, opacity 0.2s ease 0.28s",
              }}>
                {section.label}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map(({ key, label, Icon, href, isNew }) => {
                const isActive = activeTab === key;
                const textTransition = collapsed && desktop
                  ? "opacity 0.12s ease, max-width 0s ease 0.12s"
                  : "max-width 0s ease, opacity 0.2s ease 0.28s";
                const itemStyle: React.CSSProperties = {
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  color: isActive ? "#aaaaaa" : "#555555",
                  textDecoration: "none",
                };
                const inner = (
                  <>
                    <Icon size={15} style={{ color: isActive ? "#aaaaaa" : "#444444", flexShrink: 0 }} />
                    <span style={{
                      flex: 1,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      maxWidth: collapsed && desktop ? 0 : "180px",
                      opacity: collapsed && desktop ? 0 : 1,
                      transition: textTransition,
                    }}>{label}</span>
                    {isNew && !isActive && !(collapsed && desktop) && (
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
                    )}
                    <span style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: "#ffffff", flexShrink: 0,
                      opacity: isActive && !(collapsed && desktop) ? 1 : 0,
                      transition: textTransition,
                    }} />
                  </>
                );
                return href ? (
                  <Link
                    key={key}
                    href={href}
                    title={collapsed && desktop ? label : undefined}
                    style={itemStyle}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={key}
                    onClick={() => handleNav(key)}
                    title={collapsed && desktop ? label : undefined}
                    style={itemStyle}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Mi cuenta */}
        <Link
          href="/dashboard/account"
          title={collapsed && desktop ? "Mi cuenta" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "10px",
            padding: "8px 12px",
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
          <span style={{
            flex: 1,
            overflow: "hidden",
            whiteSpace: "nowrap",
            maxWidth: collapsed && desktop ? 0 : "180px",
            opacity: collapsed && desktop ? 0 : 1,
            transition: collapsed && desktop
              ? "opacity 0.12s ease, max-width 0s ease 0.12s"
              : "max-width 0s ease, opacity 0.2s ease 0.28s",
          }}>Mi cuenta</span>
        </Link>
      </nav>

      {/* Team membership section — only for non-owner members */}
      {memberInfo && !(collapsed && desktop) && (
        <div style={{ padding: "12px 20px 16px" }}>
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
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#555555", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
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
              <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
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

      {/* Upgrade button — hidden for enterprise and lifetime */}
      {plan !== "enterprise" && plan !== "lifetime" && (
        <div style={{ padding: "0 12px 0", flexShrink: 0 }}>
          <button
            onClick={() => { setActiveTab("billing"); onClose?.(); }}
            title={collapsed && desktop ? "Mejorar plan" : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
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
            <span style={{
              position: "relative", zIndex: 1,
              fontSize: "13px", fontWeight: 600, color: "#cccccc", flex: 1, textAlign: "left",
              overflow: "hidden", whiteSpace: "nowrap",
              maxWidth: collapsed && desktop ? 0 : "120px",
              opacity: collapsed && desktop ? 0 : 1,
              transition: collapsed && desktop
                ? "opacity 0.12s ease, max-width 0s ease 0.12s"
                : "max-width 0s ease, opacity 0.2s ease 0.28s",
            }}>Mejorar plan</span>
            <svg
              style={{
                position: "relative", zIndex: 1, flexShrink: 0,
                opacity: collapsed && desktop ? 0 : 1,
                transition: collapsed && desktop ? "opacity 0.12s ease" : "opacity 0.2s ease 0.28s",
              }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
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
  const { t } = useLang();
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([])
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function handleDownload(gen: RecentGeneration) {
    if (!gen.audioUrl || downloadingId) return;
    setDownloadingId(gen.id);
    try {
      await downloadAudio(gen.audioUrl, generateAudioFilename(gen.text ?? ''));
    } finally {
      setDownloadingId(null);
    }
  }

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

  const LARGE_CARDS = [
    { id: 'generate',   title: t.home.cardGenerate,    description: t.home.cardGenerateDesc },
    { id: 'imagevideo', title: t.home.cardImageVideo,   description: t.home.cardImageVideoDesc },
    { id: 'voices',     title: t.home.cardCloneVoice,   description: t.home.cardCloneVoiceDesc },
  ]

  const SMALL_CARDS: { id: Tab; title: string; Icon: React.ElementType }[] = [
    { id: 'translate',  title: t.nav.translate,         Icon: Globe },
    { id: 'dialogue',   title: t.nav.textToDialogue,    Icon: MessageSquare },
    { id: 'history',    title: t.nav.history,           Icon: Clock },
    { id: 'transcribe', title: t.nav.transcribe,        Icon: FileAudio },
    { id: 'billing',    title: t.nav.billing,           Icon: CreditCard },
    { id: 'billing',    title: t.nav.account,           Icon: User },
  ]

  return (
    <div className="space-y-8">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {t.home.greeting} {user?.firstName ?? t.home.defaultName}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#555555" }}>
          <span style={{ color: "#aaaaaa", fontWeight: 600 }}>
            {credits !== null ? credits.toLocaleString('es-ES') : '—'}
          </span>{' '}
          {t.home.available}
        </p>
      </div>

      {/* Fila superior — 3 cards grandes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LARGE_CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveTab(card.id as Tab)}
            className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] text-left"
          >
            {/* Zona visual */}
            <div className="h-36 relative overflow-hidden flex items-center justify-center p-5 bg-white/[0.02]">

              {/* Texto a Voz — editor + barra de audio */}
              {card.id === 'generate' && (
                <div className="w-full flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-[5px] bg-white/20 rounded-full w-full" />
                    <div className="h-[5px] bg-white/[0.12] rounded-full w-4/5" />
                    <div className="h-[5px] bg-white/20 rounded-full w-full" />
                    <div className="h-[5px] bg-white/[0.12] rounded-full w-3/5" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-[3px] bg-white/10 rounded-full w-full relative">
                      <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-violet-400/50 to-blue-400/50" />
                      <div className="absolute top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-white border border-white/20 shadow" style={{ left: 'calc(40% - 5.5px)' }} />
                    </div>
                    <div className="flex items-end gap-[2px] justify-center">
                      {[4,7,5,9,6,11,8,5,10,7,4,8,6,9,5,7,4,6,9,5].map((h, j) => (
                        <div key={j} className={`w-[2px] rounded-full origin-bottom card-eq-v-${(j % 8) + 1}`}
                             style={{ height: `${h}px`, background: 'linear-gradient(to top, rgba(139,92,246,0.3), rgba(99,102,241,0.65))' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Imagen y Video — prompt + grid de thumbnails */}
              {card.id === 'imagevideo' && (
                <div className="w-full flex flex-col gap-2">
                  <div className="border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                    <div className="h-[5px] bg-white/15 rounded-full flex-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5" style={{ height: '68px' }}>
                    {[
                      { base: 'from-violet-500/25 to-blue-600/20',   over: 'from-violet-400/40 to-indigo-500/30', cls: 'card-grad-p-1' },
                      { base: 'from-sky-500/25 to-cyan-500/20',      over: 'from-blue-400/40 to-sky-500/30',      cls: 'card-grad-p-2' },
                      { base: 'from-amber-500/25 to-rose-500/20',    over: 'from-orange-400/40 to-pink-500/30',   cls: 'card-grad-p-3' },
                      { base: 'from-emerald-500/25 to-teal-500/20',  over: 'from-green-400/40 to-emerald-600/30', cls: 'card-grad-p-4' },
                    ].map((g, j) => (
                      <div key={j} className="rounded-lg relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${g.base}`} />
                        <div className={`absolute inset-0 bg-gradient-to-br ${g.over} ${g.cls}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clonar Voz — avatar circular + forma de onda */}
              {card.id === 'voices' && (
                <div className="w-full flex flex-col items-center justify-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-[68px] h-[68px] rounded-full border border-white/[0.07]" />
                    <div className="absolute w-[52px] h-[52px] rounded-full border border-white/[0.10]" />
                    <div className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15"
                         style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.25), rgba(236,72,153,0.15))' }}>
                      <Mic size={16} className="text-white/60" />
                    </div>
                  </div>
                  <div className="flex items-end gap-[3px]" style={{ height: '22px' }}>
                    {[5,9,13,10,7,12,8,6,11,9,6,13,8,5,10].map((h, j) => (
                      <div key={j} className={`w-[2px] rounded-full bg-white/35 origin-bottom card-eq-v-${(j % 8) + 1}`}
                           style={{ height: `${h}px` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zona info */}
            <div className="px-4 py-3.5 border-t border-white/5">
              <p className="text-base font-semibold text-white">{card.title}</p>
              <p className="text-sm text-white/40 mt-0.5">{card.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Fila inferior — 6 cards pequeñas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SMALL_CARDS.map((card, j) => (
          <button
            key={j}
            onClick={() => setActiveTab(card.id)}
            className="group flex items-center gap-3 px-4 py-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/10 hover:border-white/20 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-white/15 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
              <card.Icon size={16} className="text-white/60" />
            </div>
            <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors duration-200 leading-tight">
              {card.title}
            </span>
          </button>
        ))}
      </div>

      {/* Últimas generaciones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">{t.home.recentGen}</h2>
          <button onClick={() => setActiveTab('history')}
                  className="text-xs transition-colors"
                  style={{ color: "#555555" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#555555")}>
            {t.home.viewAll}
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
               style={{ color: "#444444", border: "1px dashed rgba(255,255,255,0.08)" }}>
            {t.home.noGenerationsYet}{' '}
            <button onClick={() => setActiveTab('generate')}
                    className="underline transition-colors"
                    style={{ color: "#666666" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#666666")}>
              {t.home.createFirst}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentGenerations.map(gen => (
              <div key={gen.id}
                   className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                   style={{ background: "transparent" }}
                   onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                   onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}>
                <div className="w-9 h-9 rounded-lg flex-shrink-0"
                     style={{ background: generateVoiceGradient(gen.voiceId ?? gen.id) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#cccccc" }}>
                    {gen.voiceName ?? t.generate.voiceLabel}
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
                    <button
                       onClick={() => handleDownload(gen)}
                       disabled={downloadingId === gen.id}
                       className="text-xs transition-colors"
                       style={{ color: "#555555", background: "none", border: "none", cursor: downloadingId === gen.id ? "default" : "pointer", padding: 0 }}
                       onMouseEnter={e => { if (downloadingId !== gen.id) e.currentTarget.style.color = "#ffffff"; }}
                       onMouseLeave={e => (e.currentTarget.style.color = "#555555")}>
                      {downloadingId === gen.id ? t.history.downloading : '↓ MP3'}
                    </button>
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
          <h2 className="text-sm font-semibold text-white">{t.home.myClonedVoices}</h2>
          <button onClick={() => setActiveTab('voices')}
                  className="text-xs transition-colors"
                  style={{ color: "#555555" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#555555")}>
            {t.home.viewAll}
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
               style={{ color: "#444444", border: "1px dashed rgba(255,255,255,0.08)" }}>
            {t.home.noClonedVoicesYet}{' '}
            <button onClick={() => setActiveTab('voices')}
                    className="underline transition-colors"
                    style={{ color: "#666666" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#666666")}>
              {t.home.cloneVoiceLink}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {clonedVoices.map(voice => (
              <button
                key={voice.id}
                onClick={() => setActiveTab('voices')}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
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


      {/* Tutoriales */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Tutoriales</h2>
        <div className="grid grid-cols-1 gap-3">
          <a href="https://youtu.be/_IlvCGcT8xc" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.06] rounded-2xl px-4 py-3.5 transition-all duration-200">
            <div className="relative shrink-0 w-24 h-14 rounded-lg overflow-hidden bg-white/5">
              <img src="https://img.youtube.com/vi/_IlvCGcT8xc/mqdefault.jpg" alt="Tour completo Elite Labs" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium leading-tight">Tour completo de Elite Labs</p>
              <p className="text-white/35 text-xs mt-1 leading-snug">Aprende a usar todas las funciones de la plataforma paso a paso</p>
            </div>
            <div className="shrink-0 text-[11px] text-white/30 bg-white/[0.04] border border-white/[0.07] rounded-full px-2.5 py-1">Tour completo</div>
          </a>
        </div>
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
      style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}
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
    <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", padding: "8px 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
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
  selectedProVoice,
  onProVoiceChange,
  selectedTurboVoice,
  onTurboVoiceChange,
  plan,
  externalText,
  credits,
  extraCredits,
}: {
  voices: Voice[];
  onGenerated: () => void;
  selectedProVoice: SelectedVoice | null;
  onProVoiceChange: (v: SelectedVoice | null) => void;
  selectedTurboVoice: SelectedVoice | null;
  onTurboVoiceChange: (v: SelectedVoice | null) => void;
  plan: string;
  externalText?: string | null;
  credits: number | null;
  extraCredits: number;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (externalText) setText(externalText);
  }, [externalText]);
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
  const selectedVoice = selectedModel === "turbo" ? selectedTurboVoice : selectedProVoice;
  const onVoiceChange = (v: SelectedVoice | null) => selectedModel === "turbo" ? onTurboVoiceChange(v) : onProVoiceChange(v);
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
  const [m1ModelId, setM1ModelId] = useState<string>(() => { try { const stored = localStorage.getItem("elitelabs_turbo_model"); return (stored === "eleven_multilingual_v2_5" || !stored) ? "eleven_multilingual_v2" : stored; } catch { return "eleven_multilingual_v2"; } });
  const [m1OutDropOpen, setM1OutDropOpen] = useState(false);
  const [m1ModelDropOpen, setM1ModelDropOpen] = useState(false);
  const m1OutDropRef = useRef<HTMLDivElement>(null);
  const m1ModelDropRef = useRef<HTMLDivElement>(null);
  const [turboProvider, setTurboProvider] = useState<"elevenlabs" | "stealth" | "minimax">(() => {
    try { return (localStorage.getItem("elitelabs_turbo_provider") as "elevenlabs" | "stealth" | "minimax") || "elevenlabs"; }
    catch { return "elevenlabs"; }
  });
  const [stealthTemperature, setStealthTemperature] = useState(1.1);
  const [stealthSpeakingRate, setStealthSpeakingRate] = useState(1.0);
  const [stealthModel, setStealthModel] = useState("1.5");
  const [minimaxPitch, setMinimaxPitch] = useState(0);
  const [minimaxVolume, setMinimaxVolume] = useState(1.0);
  const [previewing, setPreviewing] = useState<"idle" | "loading" | "playing">("idle");
  const [showPreviewTooltip, setShowPreviewTooltip] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const tagsAreaRef = useRef<HTMLDivElement>(null);
  const [rightTab, setRightTab] = useState<"ajustes" | "historial">("ajustes");
  const { t } = useLang();

  const [elapsed, setElapsed] = useState(0);

  const charCost = calculateCharCost(text.length);
  const isStealthPro = selectedModel === "turbo" && turboProvider === "stealth" && stealthModel === "2.0";
  const displayCost = selectedModel === "turbo" ? Math.ceil(charCost / 2) * (isStealthPro ? 2 : 1) : charCost;
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
    try { localStorage.setItem("elitelabs_turbo_model", m1ModelId); } catch { /* ignore */ }
  }, [m1ModelId]);

  useEffect(() => {
    try { localStorage.setItem("elitelabs_turbo_provider", turboProvider); } catch { /* ignore */ }
    onTurboVoiceChange(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turboProvider]);

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
        // Turbo (Algrow: ElevenLabs / Stealth / MiniMax) — async job, same pattern as PRO
        const turboBody = {
          text,
          voice_id: selectedVoice?.referenceId ?? undefined,
          voiceName: selectedVoice?.name ?? "Voz por defecto",
          provider: turboProvider,
          ...(turboProvider === "elevenlabs" && {
            model_id: m1ModelId,
            stability: m1Stability,
            similarity_boost: m1Similarity,
            style: m1StyleExag,
            speed: m1Speed,
          }),
          ...(turboProvider === "stealth" && {
            temperature: stealthTemperature,
            speaking_rate: stealthSpeakingRate,
            stealth_model: stealthModel,
          }),
          ...(turboProvider === "minimax" && {
            speed: m1Speed,
            pitch: minimaxPitch,
            volume: minimaxVolume,
          }),
        };
        const res = await fetch("/api/generate-ai33", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(turboBody),
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

  const canPreview = credits === null || (credits + extraCredits) >= TTS_PREVIEW_COST;

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
      audio.onended = () => { setPreviewing("idle"); URL.revokeObjectURL(url); previewAudioRef.current = null; onGenerated(); };
      audio.onerror = () => { setPreviewing("idle"); URL.revokeObjectURL(url); previewAudioRef.current = null; };
      audio.play();
      onGenerated();
    } catch {
      setFormError("Error al generar la pre-escucha");
      setPreviewing("idle");
    }
  }

  const voiceGender = selectedVoice?.tags ? getGender(selectedVoice.tags) : null;

  return (
    <div className="flex flex-col" style={{ minHeight: "min(calc(100vh - 88px), 100%)", overflow: "auto" }}>

      {/* ── Unified two-column container ── */}
      <div className="flex flex-col lg:flex-row generate-tab-container" style={{ flex: 1, minHeight: 0, background: "#000000", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", overflow: "hidden" }}>

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[280px] lg:min-h-0 border-b lg:border-b-0" style={{ borderColor: "rgba(255,255,255,0.12)" }}>

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
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => setTagsOpen(o => !o)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, background: tagsOpen ? "rgba(255,255,255,0.08)" : "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", cursor: "pointer" }}
                >
                  {t.generate.tags}
                  <span style={{ display: "inline-block", transition: "transform 0.15s", transform: tagsOpen ? "rotate(90deg)" : "none", fontSize: "10px" }}>›</span>
                </button>
                <button
                  onClick={handleAutoTag}
                  disabled={isAutoTagging || !text.trim()}
                  title="Añade etiquetas de emoción automáticamente con IA"
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: isAutoTagging || !text.trim() ? "#444444" : "#9ca3af", cursor: isAutoTagging || !text.trim() ? "not-allowed" : "pointer", transition: "color 0.15s, border-color 0.15s" }}
                >
                  {isAutoTagging ? (
                    <><svg style={{ width: "11px", height: "11px", animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t.generate.tagging}</>
                  ) : <>✦ {t.generate.autoTag}</>}
                </button>

                {/* Import file */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/[0.08] border border-white/10 text-xs text-white/50 cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  {t.generate.importBtn}
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setIsImporting(true)
                      try {
                        if (file.name.endsWith('.txt')) {
                          await new Promise<void>(resolve => {
                            const reader = new FileReader()
                            reader.onload = ev => { setText(ev.target?.result as string ?? ''); resolve() }
                            reader.readAsText(file)
                          })
                          return
                        }

                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/extract-text', { method: 'POST', body: formData })
                        const data = await res.json()
                        if (data.text) setText(data.text)
                        if (data.error) console.error('Import error:', data.error)
                      } catch (err) {
                        console.error('Import failed:', err)
                      } finally {
                        setIsImporting(false)
                        e.target.value = ''
                      }
                    }}
                  />
                </label>

                {/* Clear text */}
                <button
                  onClick={() => setText('')}
                  disabled={!text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-xs text-white/30 hover:text-red-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:hover:text-white/30"
                  title="Borrar todo el texto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {tagsOpen && (
                <div className="tags-panel glass-menu" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, padding: "14px 16px", minWidth: "280px", maxWidth: "520px", maxHeight: "55vh", overflowY: "auto" }}>
                  {TAG_GROUPS.map((group, gi) => (
                    <div key={group.label} style={{ marginBottom: gi < TAG_GROUPS.length - 1 ? "12px" : "10px" }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555555", marginBottom: "8px" }}>{group.label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {group.tags.map(tag => (
                          <button
                            key={tag}
                            onMouseDown={e => { e.preventDefault(); insertTagAtCursor(tag); }}
                            style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.12)", color: "#d1d5db", cursor: "pointer", transition: "background 0.1s, color 0.1s" }}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <span style={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>
                  {text.length.toLocaleString("es-ES")} {t.generate.characters}
                  {text.length > 0 && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#444444" }}>· {displayCost.toLocaleString("es-ES")} {t.generate.credits}</span>}
                </span>
                {text.length > 0 && (
                  <button
                    onClick={() => setText(cleanPastedText(text))}
                    style={{ fontSize: "11px", color: "#444444", background: "none", border: "none", cursor: "pointer", padding: "0", whiteSpace: "nowrap", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#aaaaaa"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#444444"; }}
                    title="Elimina saltos de línea incorrectos dentro de frases"
                  >
                    Limpiar formato
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {plan !== "free" && (
                  <div
                    style={{ display: "flex", alignItems: "center", borderRadius: "8px", border: `1px solid ${previewing === "playing" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`, background: previewing === "playing" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", opacity: (previewing === "loading" || !canPreview) ? 0.6 : 1 }}
                  >
                    <button
                      onClick={handlePreview}
                      disabled={previewing === "loading" || !canPreview}
                      title={!canPreview ? "Sin créditos suficientes" : undefined}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", fontSize: "12px", fontWeight: 500, color: previewing === "playing" ? "#f87171" : (previewing === "loading" || !canPreview) ? "#6b7280" : "#aaaaaa", cursor: (previewing === "loading" || !canPreview) ? "not-allowed" : "pointer", background: "transparent", border: "none", borderRadius: "8px 0 0 8px" }}
                    >
                      {previewing === "loading" && <svg className="animate-spin" style={{ width: "12px", height: "12px" }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                      {previewing === "idle" && `▶ ${t.generate.preview}`}
                      {previewing === "loading" && t.generate.generating}
                      {previewing === "playing" && t.generate.previewStop}
                    </button>
                    <div style={{ width: "1px", alignSelf: "stretch", background: "rgba(255,255,255,0.12)", margin: "6px 0", flexShrink: 0 }} />
                    <div
                      style={{ position: "relative", padding: "8px 8px", cursor: "help", display: "flex", alignItems: "center" }}
                      onMouseEnter={() => setShowPreviewTooltip(true)}
                      onMouseLeave={() => setShowPreviewTooltip(false)}
                    >
                      <Info style={{ width: "11px", height: "11px", color: "rgba(255,255,255,0.35)" }} />
                      {showPreviewTooltip && (
                        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 9999, background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", width: "220px", fontSize: "12px", color: "rgba(255,255,255,0.7)", whiteSpace: "normal", pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.6)", lineHeight: 1.4 }}>
                          El preview usa un texto de muestra. Se descontarán {TTS_PREVIEW_COST} créditos de tu saldo.
                        </div>
                      )}
                    </div>
                  </div>
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
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l" style={{ borderColor: "rgba(255,255,255,0.12)" }}>

          {/* Sliding pill tab toggle */}
          <div style={{ padding: "12px", flexShrink: 0 }}>
            <div style={{ position: "relative", display: "flex", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "8px", padding: "4px" }}>
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
                  style={{ width: "100%", textAlign: "left", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "12px", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
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
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", fontSize: "13px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#e2e2f0", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Elite Labs
                      </span>
                      {selectedModel === "speech-1.6" && <span className="badge-shimmer-purple" style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", flexShrink: 0 }}>Pro</span>}
                      {selectedModel === "speech-1.5" && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.20)", background: "transparent", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>Legacy</span>}
                      {selectedModel === "turbo" && !turboDisabled && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "white", flexShrink: 0 }}>Turbo</span>}
                      {selectedModel === "turbo" && turboDisabled  && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", flexShrink: 0 }}>Mantenimiento</span>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6b7280", flexShrink: 0, transform: modelDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {modelDropdownOpen && (
                    <div className="glass-menu" style={{ position: "absolute", left: 0, right: 0, zIndex: 20, marginTop: "4px", padding: "4px" }}>
                      {([
                        { value: "speech-1.6", sub: "Nuestro modelo insignia",                    disabled: false },
                        { value: "turbo",      sub: "ElevenLabs: 10 chars = 5 chars, gasta solo el 50% de tus caracteres", disabled: turboDisabled },
                      ]).map(({ value, sub, disabled }) => (
                        <button
                          key={value}
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            setSelectedModel(value);
                            setModelDropdownOpen(false);
                          }}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", fontSize: "13px", textAlign: "left", background: "transparent", border: "none", borderRadius: "8px", color: disabled ? "#4b5563" : selectedModel === value ? "#e2e2f0" : "#6b7280", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}
                          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 500 }}>Elite Labs</span>
                              {value === "speech-1.6" && <span className="badge-shimmer-purple" style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", flexShrink: 0 }}>Pro</span>}
                              {value === "speech-1.5" && <span style={{ fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.20)", background: "transparent", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>Legacy</span>}
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>{selectedModel === "speech-1.5" ? "Norm. texto" : "Norm. de volumen"}</span>
                    <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                      <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: normalize ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                      <button onClick={() => setNormalize(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !normalize ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>No</button>
                      <button onClick={() => setNormalize(true)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: normalize ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Sí</button>
                    </div>
                  </div>
                  {/* Pro-only controls */}
                  {selectedModel === "speech-1.6" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Norm. de texto</span>
                      <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                        <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: proNormText ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                        <button onClick={() => setProNormText(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !proNormText ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>No</button>
                        <button onClick={() => setProNormText(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  proNormText ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Sí</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}>
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

              {/* CONTROLES DE AUDIO — Turbo (ElevenLabs / Stealth / MiniMax) */}
              {selectedModel === "turbo" && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "8px" }}>Controles de Audio</p>

                {/* Provider selector */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  {([
                    { id: "elevenlabs" as const, label: "ElevenLabs", Icon: Zap },
                    { id: "stealth"    as const, label: "Stealth",    Icon: Shield },
                    { id: "minimax"   as const, label: "MiniMax",    Icon: Music },
                  ]).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTurboProvider(id)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        padding: "6px 0", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
                        cursor: "pointer",
                        background: turboProvider === id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                        border: turboProvider === id ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
                        color: turboProvider === id ? "#ffffff" : "#6b7280",
                        transition: "all 150ms",
                      }}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>

                  {/* ── ElevenLabs controls ── */}
                  {turboProvider === "elevenlabs" && (<>
                    <M1Slider label="Speed"              leftLabel="Slower"        rightLabel="Faster"       value={m1Speed}     onChange={setM1Speed}     min={0.7}  max={1.2}  step={0.01} defaultValue={1.0} />
                    <M1Slider label="Stability"          leftLabel="More variable" rightLabel="More stable"  value={m1Stability} onChange={setM1Stability} min={0}    max={1}    step={0.01} defaultValue={0.5} />
                    <M1Slider label="Similarity"         leftLabel="Low"           rightLabel="High"         value={m1Similarity} onChange={setM1Similarity} min={0} max={1}    step={0.01} defaultValue={0.75} />
                    <M1Slider label="Style Exaggeration" leftLabel="None"          rightLabel="Exaggerated"  value={m1StyleExag} onChange={setM1StyleExag} min={0}    max={1}    step={0.01} defaultValue={0} />

                    {/* Language Override toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Language Override</span>
                      <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                        <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: m1LangOverride ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                        <button onClick={() => setM1LangOverride(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !m1LangOverride ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Off</button>
                        <button onClick={() => setM1LangOverride(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  m1LangOverride ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>On</button>
                      </div>
                    </div>

                    {/* ElevenLabs Model selector */}
                    <div style={{ position: "relative" }} ref={m1ModelDropRef}>
                      <button
                        onClick={() => setM1ModelDropOpen((o) => !o)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: "40px", fontSize: "12px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "none", borderRadius: "10px", color: "#e2e2f0", cursor: "pointer" }}
                      >
                        <span style={{ fontWeight: 500, color: "#888888" }}>Modelo</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: m1ModelId !== "eleven_multilingual_v2_5" ? "#aaaaaa" : "#6b7280" }}>
                            {m1ModelId === "eleven_multilingual_v2_5" ? "Multilingual v2.5" : m1ModelId === "eleven_multilingual_v2" ? "Multilingual v2" : m1ModelId === "eleven_turbo_v2_5" ? "Turbo v2.5" : "Flash v2.5"}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6b7280", transform: m1ModelDropOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </button>
                      {m1ModelDropOpen && (
                        <div className="glass-menu" style={{ position: "absolute", left: 0, right: 0, zIndex: 20, marginTop: "2px", padding: "4px" }}>
                          {([
                            { value: "eleven_multilingual_v2_5", label: "Multilingual v2.5", sub: "Recomendado" },
                            { value: "eleven_multilingual_v2",   label: "Multilingual v2",   sub: "" },
                            { value: "eleven_turbo_v2_5",        label: "Turbo v2.5",         sub: "Más rápido" },
                            { value: "eleven_flash_v2_5",        label: "Flash v2.5",         sub: "Más económico" },
                          ] as const).map(({ value, label, sub }) => (
                            <button key={value} onClick={() => { setM1ModelId(value); setM1ModelDropOpen(false); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", fontSize: "12px", textAlign: "left", background: "transparent", border: "none", borderRadius: "8px", color: m1ModelId === value ? "#e2e2f0" : "#6b7280", cursor: "pointer" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <span>{label}{sub ? <span style={{ color: "#444", marginLeft: "6px", fontSize: "11px" }}>{sub}</span> : null}</span>
                              {m1ModelId === value && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Output Format dropdown */}
                    <div style={{ position: "relative" }} ref={m1OutDropRef}>
                      <button
                        onClick={() => setM1OutDropOpen((o) => !o)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: "40px", fontSize: "12px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "none", borderRadius: "10px", color: "#e2e2f0", cursor: "pointer" }}
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
                        <div className="glass-menu" style={{ position: "absolute", left: 0, right: 0, zIndex: 20, marginTop: "2px", padding: "4px" }}>
                          {([
                            { value: "mp3_44100_128", label: "MP3 44.1 kHz (128kbps)" },
                            { value: "mp3_44100_192", label: "MP3 44.1 kHz (192kbps)" },
                            { value: "pcm_16000",     label: "PCM 16kHz" },
                            { value: "pcm_22050",     label: "PCM 22kHz" },
                            { value: "pcm_44100",     label: "PCM 44.1kHz" },
                          ] as const).map(({ value, label }) => (
                            <button key={value} onClick={() => { setM1OutputFormat(value); setM1OutDropOpen(false); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", fontSize: "12px", textAlign: "left", background: "transparent", border: "none", borderRadius: "8px", color: m1OutputFormat === value ? "#e2e2f0" : "#6b7280", cursor: "pointer" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Speaker Boost</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ position: "relative", display: "flex", background: "#000000", borderRadius: "6px", padding: "2px" }}>
                          <div style={{ position: "absolute", top: "2px", bottom: "2px", left: "2px", width: "calc(50% - 2px)", background: "#222222", borderRadius: "4px", transform: m1SpeakerBoost ? "translateX(100%)" : "translateX(0)", transition: "transform 200ms ease-out" }} />
                          <button onClick={() => setM1SpeakerBoost(false)} style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color: !m1SpeakerBoost ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>Off</button>
                          <button onClick={() => setM1SpeakerBoost(true)}  style={{ position: "relative", zIndex: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 500, color:  m1SpeakerBoost ? "#fff" : "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "color 200ms ease-out" }}>On</button>
                        </div>
                        <button
                          onClick={() => { setM1Speed(1.0); setM1Stability(0.5); setM1Similarity(0.75); setM1StyleExag(0); setM1LangOverride(false); setM1OutputFormat("mp3_44100_128"); setM1SpeakerBoost(true); setM1ModelId("eleven_multilingual_v2_5"); }}
                          style={{ fontSize: "11px", color: "#6b7280", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                        >Reset values</button>
                      </div>
                    </div>
                  </>)}

                  {/* ── Stealth controls ── */}
                  {turboProvider === "stealth" && (<>
                    <M1Slider label="Temperature"   leftLabel="Neutral"  rightLabel="Expressive" value={stealthTemperature}  onChange={setStealthTemperature}  min={0.5} max={2.0} step={0.1} defaultValue={1.1} />
                    <M1Slider label="Speaking Rate"  leftLabel="Slower"   rightLabel="Faster"     value={stealthSpeakingRate} onChange={setStealthSpeakingRate} min={0.5} max={2.0} step={0.1} defaultValue={1.0} />

                    {/* Stealth Model selector */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", height: "40px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#888888" }}>Stealth Model</span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {([
                          { id: "1.5", label: "1.5 Standard" },
                          { id: "2.0", label: "2.0 Pro (2x chars)" },
                        ] as const).map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => setStealthModel(id)}
                            style={{
                              padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 500,
                              cursor: "pointer",
                              background: stealthModel === id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)",
                              border: stealthModel === id ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                              color: stealthModel === id ? "#ffffff" : "#6b7280",
                            }}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    {stealthModel === "2.0" && (
                      <p style={{ fontSize: "11px", color: "#f59e0b", padding: "4px 14px 0" }}>
                        Stealth 2.0 consume el doble de caracteres
                      </p>
                    )}
                    <button
                      onClick={() => { setStealthTemperature(1.1); setStealthSpeakingRate(1.0); setStealthModel("1.5"); }}
                      style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start" }}
                    >Reset values</button>
                  </>)}

                  {/* ── MiniMax controls ── */}
                  {turboProvider === "minimax" && (<>
                    <M1Slider label="Speed"  leftLabel="Slower"  rightLabel="Faster"    value={m1Speed}     onChange={setM1Speed}     min={0.5} max={2.0} step={0.1} defaultValue={1.0} />
                    <M1Slider label="Pitch"  leftLabel="Lower"   rightLabel="Higher"    value={minimaxPitch} onChange={setMinimaxPitch} min={-12} max={12}  step={1}   defaultValue={0} />
                    <M1Slider label="Volume" leftLabel="Quieter" rightLabel="Louder"    value={minimaxVolume} onChange={setMinimaxVolume} min={0.1} max={10.0} step={0.1} defaultValue={1.0} />
                    <button
                      onClick={() => { setM1Speed(1.0); setMinimaxPitch(0); setMinimaxVolume(1.0); }}
                      style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start" }}
                    >Reset values</button>
                  </>)}

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
          voiceListEndpoint={
            selectedModel === "turbo"
              ? turboProvider === "elevenlabs" ? "/api/ai33-voices-eleven"
              : turboProvider === "stealth"    ? "/api/voices/stealth"
              : undefined
              : undefined
          }
          showExternalFilters={selectedModel === "turbo" && turboProvider === "elevenlabs"}
          defaultLanguage={selectedModel === "turbo" ? "en" : "es"}
        />
      )}

      <NoCreditsModal
        isOpen={showNoCredits}
        onClose={() => setShowNoCredits(false)}
        currentPlan={plan.toLowerCase()}
      />

      {isImporting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#111] border border-white/10 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <EliteLoader />
            <p className="text-sm text-white/70 font-medium">Importando archivo...</p>
            <p className="text-xs text-white/30">Extrayendo texto</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Create Voice Tab ───────────────────────────────────── */
function CreateVoiceTab({ plan, onCloned }: { plan: string; onCloned: () => void }) {
  const [method, setMethod] = useState<null | "clone" | "design">(null);
  const [instruction, setInstruction] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [language, setLanguage] = useState("es");
  const [numCandidates, setNumCandidates] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [candidates, setCandidates] = useState<DesignCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [numStep, setNumStep] = useState(32);
  const [guidanceScale, setGuidanceScale] = useState(2.0);
  const [seed, setSeed] = useState<number | null>(null);

  void plan;

  async function handleDesignVoice() {
    setError(null);
    setIsGenerating(true);
    setCandidates([]);
    try {
      const res = await fetch("/api/voice-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: instruction.trim(),
          reference_text: referenceText.trim() || undefined,
          language,
          n: numCandidates,
          speed,
          num_step: numStep,
          guidance_scale: guidanceScale,
          instruct_guidance_scale: 0,
          seed: seed ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar voces");
      setCandidates(data.candidates ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsGenerating(false);
    }
  }

  function playCandidate(idx: number, b64: string) {
    audioRefs.current.forEach((a, i) => {
      if (a && i !== idx) { a.pause(); a.currentTime = 0; }
    });
    if (playingIdx === idx && audioRefs.current[idx]) {
      audioRefs.current[idx]!.pause();
      audioRefs.current[idx]!.currentTime = 0;
      setPlayingIdx(null);
      return;
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRefs.current[idx] = audio;
    audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
    audio.play();
    setPlayingIdx(idx);
  }

  async function handleSave(candidate: DesignCandidate) {
    if (!voiceName.trim()) return;
    setSavingIdx(candidate.index);
    setError(null);
    try {
      const res = await fetch("/api/voice-design/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: candidate.audio_base64, voice_name: voiceName.trim(), language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setSavedIdx(candidate.index);
      setTimeout(() => onCloned(), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar la voz");
    } finally {
      setSavingIdx(null);
    }
  }

  /* ── Method picker ── */
  if (method === null) {
    return (
      <div className="flex flex-col items-center gap-8 py-16 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Elige un método</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>¿Cómo quieres crear tu nueva voz?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {/* Card — Clonación */}
          <button
            onClick={() => setMethod("clone")}
            className="text-left p-8 rounded-2xl border transition-all hover:bg-white/10 hover:border-white/20 group"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Mic size={22} style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Clonación de voz instantánea</h3>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Sube o graba 10s de audio y clónala al instante.</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>~1 min</span>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>Ideal para grabaciones existentes</span>
            </div>
          </button>

          {/* Card — Diseño */}
          <button
            onClick={() => setMethod("design")}
            className="text-left p-8 rounded-2xl border transition-all hover:bg-white/10 hover:border-white/20 group"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Wand2 size={22} style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Diseño de Voz</h3>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Describe la voz en texto simple y la IA la crea en segundos.</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>~15s</span>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>Ideal para personajes originales</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  /* ── Clone: open CloneModal overlay ── */
  if (method === "clone") {
    return (
      <CloneModal
        onClose={() => setMethod(null)}
        onCloned={onCloned}
      />
    );
  }

  /* ── Design form ── */
  if (candidates.length > 0) {
    return (
      <div className="flex flex-col gap-5 max-w-xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">{candidates.length} variante{candidates.length !== 1 ? "s" : ""} generada{candidates.length !== 1 ? "s" : ""}</p>
          <button onClick={() => setCandidates([])} className="text-xs flex items-center gap-1 transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ChevronLeft size={13} /> Volver
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Nombre para guardar la voz</label>
          <input
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Ej: Locutor profesional"
            maxLength={60}
            className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>

        <div className="flex flex-col gap-3">
          {candidates.map((c) => (
            <div key={c.id} className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => playCandidate(c.index, c.audio_base64)}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: playingIdx === c.index ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)" }}
              >
                {playingIdx === c.index ? <Square size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Variante {c.index + 1}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {c.duration_ms ? `${(c.duration_ms / 1000).toFixed(1)}s` : ""}
                  {c.sample_rate ? ` · ${c.sample_rate / 1000}kHz` : ""}
                </p>
              </div>
              <button
                onClick={() => handleSave(c)}
                disabled={savingIdx !== null || savedIdx !== null || !voiceName.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{
                  background: savedIdx === c.index ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.1)",
                  color: savedIdx === c.index ? "#4ade80" : "#ffffff",
                  border: savedIdx === c.index ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {savingIdx === c.index ? <SpinnerIcon className="w-3 h-3 animate-spin" />
                  : savedIdx === c.index ? <><Check size={12} /> Guardada</>
                  : <><Volume2 size={12} /> Usar esta voz</>}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setCandidates([]); setSavedIdx(null); }}
          className="text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Regenerar con los mismos parámetros →
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto py-8 px-4">
      <button onClick={() => setMethod(null)} className="text-sm flex items-center gap-1 w-fit transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
        <ChevronLeft size={14} /> Volver
      </button>

      <div>
        <h3 className="text-xl font-semibold text-white mb-1">Diseña tu voz</h3>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Describe cómo quieres que suene tu voz y la IA la creará en segundos.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Descripción de la voz *</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Ej: Voz masculina madura, tono grave, acento neutro latinoamericano, estilo periodístico profesional y serio"
          maxLength={2000}
          rows={5}
          className="w-full rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none transition-colors placeholder:text-white/20"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <span className="text-xs text-right" style={{ color: "rgba(255,255,255,0.2)" }}>{instruction.length}/2000</span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Texto de prueba <span style={{ color: "rgba(255,255,255,0.3)" }}>(opcional)</span></label>
        <input
          value={referenceText}
          onChange={(e) => setReferenceText(e.target.value)}
          placeholder="Ej: Bienvenido a Elite Labs, la plataforma de síntesis de voz con IA."
          maxLength={300}
          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors placeholder:text-white/20"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Idioma</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇺🇸 Inglés</option>
            <option value="pt">🇧🇷 Portugués</option>
            <option value="fr">🇫🇷 Francés</option>
            <option value="de">🇩🇪 Alemán</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Variantes a generar</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => setNumCandidates(n)}
                className="flex-1 rounded-xl text-sm font-medium transition-all"
                style={{
                  height: "46px",
                  background: numCandidates === n ? "#ffffff" : "rgba(255,255,255,0.05)",
                  color: numCandidates === n ? "#000000" : "rgba(255,255,255,0.5)",
                  border: numCandidates === n ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ajustes avanzados */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm flex items-center gap-1 transition-colors w-fit"
          style={{ color: showAdvanced ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)" }}
        >
          <Settings size={14} />
          Ajustes avanzados {showAdvanced ? "↑" : "↓"}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Velocidad</label>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{speed}x</span>
              </div>
              <input type="range" min="0.1" max="3" step="0.1" value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-white" />
              <div className="flex justify-between" style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                <span>Lento</span><span>Normal</span><span>Rápido</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Calidad (pasos)</label>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{numStep}</span>
              </div>
              <input type="range" min="8" max="128" step="8" value={numStep}
                onChange={(e) => setNumStep(parseInt(e.target.value))}
                className="w-full accent-white" />
              <div className="flex justify-between" style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                <span>Rápido</span><span>Equilibrado</span><span>Máx calidad</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Fidelidad al prompt</label>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{guidanceScale}</span>
              </div>
              <input type="range" min="0" max="10" step="0.5" value={guidanceScale}
                onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                className="w-full accent-white" />
              <div className="flex justify-between" style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                <span>Libre</span><span>Equilibrado</span><span>Estricto</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                Semilla <span style={{ color: "rgba(255,255,255,0.2)" }}>(opcional — para reproducir el mismo resultado)</span>
              </label>
              <input
                type="number"
                value={seed ?? ""}
                onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Ej: 42"
                className="w-full rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            <button
              onClick={() => { setSpeed(1); setNumStep(32); setGuidanceScale(2); setSeed(null); }}
              className="text-xs text-right transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Restablecer valores por defecto
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-sm">💳</span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Se descontarán 500 créditos por generación</span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleDesignVoice}
        disabled={!instruction.trim() || isGenerating}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ background: "#ffffff", color: "#000000" }}
      >
        {isGenerating ? (
          <><SpinnerIcon className="w-4 h-4 animate-spin" /> Generando voces…</>
        ) : "Generar voces →"}
      </button>
    </div>
  );
}

/* ─── Method Picker Modal ────────────────────────────────── */
function MethodPickerModal({
  onClose,
  onPickClone,
  onPickDesign,
}: {
  onClose: () => void;
  onPickClone: () => void;
  onPickDesign: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Crear voz personalizada</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onPickClone}
            className="text-left p-5 rounded-xl border transition-all hover:border-white/25 hover:bg-white/10 group"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Mic size={18} className="text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Clonación de voz</h3>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>Sube o graba audio y clona tu voz al instante.</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>~1 min</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>Voces reales</span>
            </div>
          </button>

          <button
            onClick={onPickDesign}
            className="text-left p-5 rounded-xl border transition-all hover:border-white/25 hover:bg-white/10 group"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Sparkles size={18} className="text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Diseño de voz</h3>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>Describe la voz que quieres con texto simple.</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>~15s</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>Personajes originales</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Voice Design Modal ─────────────────────────────────── */
interface DesignCandidate {
  id: string;
  index: number;
  audio_base64: string;
  sample_rate: number;
  duration_ms: number;
}

function VoiceDesignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [instruction, setInstruction] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [language, setLanguage] = useState("es");
  const [numCandidates, setNumCandidates] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [candidates, setCandidates] = useState<DesignCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [namingIdx, setNamingIdx] = useState<number | null>(null);

  async function handleDesignVoice() {
    setError(null);
    setIsGenerating(true);
    setCandidates([]);
    try {
      const res = await fetch("/api/voice-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: instruction.trim(),
          reference_text: referenceText.trim() || undefined,
          language,
          n: numCandidates,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar voces");
      setCandidates(data.candidates ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsGenerating(false);
    }
  }

  function playCandidate(idx: number, b64: string) {
    // Stop any playing audio
    audioRefs.current.forEach((a, i) => {
      if (a && i !== idx) { a.pause(); a.currentTime = 0; }
    });
    if (playingIdx === idx && audioRefs.current[idx]) {
      audioRefs.current[idx]!.pause();
      audioRefs.current[idx]!.currentTime = 0;
      setPlayingIdx(null);
      return;
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRefs.current[idx] = audio;
    audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
    audio.play();
    setPlayingIdx(idx);
  }

  async function handleSave(candidate: DesignCandidate) {
    if (!voiceName.trim()) { setNamingIdx(candidate.index); return; }
    setSavingIdx(candidate.index);
    setError(null);
    try {
      const res = await fetch("/api/voice-design/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_base64: candidate.audio_base64,
          voice_name: voiceName.trim(),
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setSavedIdx(candidate.index);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar la voz");
    } finally {
      setSavingIdx(null);
    }
  }

  const modalStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.12)",
    maxHeight: "90vh",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto" style={modalStyle}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Diseña tu voz</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1"><X size={18} /></button>
        </div>

        {candidates.length === 0 ? (
          /* ── Form ── */
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Describe la voz</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ej: Voz masculina madura, tono grave, acento neutro latinoamericano, estilo periodístico profesional"
                maxLength={2000}
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-white/30 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <span className="text-xs text-right" style={{ color: "rgba(255,255,255,0.25)" }}>{instruction.length}/2000</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Texto de prueba <span style={{ color: "rgba(255,255,255,0.25)" }}>(opcional)</span></label>
              <input
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="Ej: Bienvenido a Elite Labs, la plataforma de síntesis de voz."
                maxLength={300}
                className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Idioma</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="pt">Portugués</option>
                  <option value="fr">Francés</option>
                  <option value="de">Alemán</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Variantes</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumCandidates(n)}
                      className="flex-1 h-10 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: numCandidates === n ? "#ffffff" : "rgba(255,255,255,0.08)",
                        color: numCandidates === n ? "#000000" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Costo: 500 créditos por generación (independiente del número de variantes)
            </p>

            <button
              onClick={handleDesignVoice}
              disabled={!instruction.trim() || isGenerating}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Generando variantes…
                </span>
              ) : "Generar voces →"}
            </button>
          </div>
        ) : (
          /* ── Candidates ── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-medium">{candidates.length} variante{candidates.length !== 1 ? "s" : ""} generada{candidates.length !== 1 ? "s" : ""}</p>
              <button
                onClick={() => setCandidates([])}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <ChevronLeft size={13} /> Volver
              </button>
            </div>

            {/* Name input — shared for all candidates */}
            {(namingIdx !== null || savedIdx === null) && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Nombre para guardar la voz</label>
                <input
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="Ej: Locutor profesional"
                  maxLength={60}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            )}

            {candidates.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={() => playCandidate(c.index, c.audio_base64)}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: playingIdx === c.index ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)" }}
                >
                  {playingIdx === c.index
                    ? <Square size={14} className="text-white" />
                    : <Play size={14} className="text-white ml-0.5" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">Variante {c.index + 1}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {c.duration_ms ? `${(c.duration_ms / 1000).toFixed(1)}s` : ""}
                    {c.sample_rate ? ` · ${c.sample_rate / 1000}kHz` : ""}
                  </p>
                </div>

                <button
                  onClick={() => handleSave(c)}
                  disabled={savingIdx !== null || savedIdx !== null || !voiceName.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
                  style={{
                    background: savedIdx === c.index ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.1)",
                    color: savedIdx === c.index ? "#4ade80" : "#ffffff",
                    border: savedIdx === c.index ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {savingIdx === c.index ? (
                    <SpinnerIcon className="w-3 h-3 animate-spin" />
                  ) : savedIdx === c.index ? (
                    <><Check size={12} /> Guardada</>
                  ) : (
                    <><Volume2 size={12} /> Usar esta voz</>
                  )}
                </button>
              </div>
            ))}

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}
      </div>
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

const DURATION_MARKERS = [
  { seconds: 10, label: "Min" },
  { seconds: 30, label: "Good" },
  { seconds: 90, label: "Max" },
];
const DURATION_MAX = 90;

const VOICE_TAGS = ["Femenina","Masculina","Joven","Adulta","Mayor","Conversacional","Narración","Profesional","Educativo","Entretenimiento"];

type CloneAudioFile = {
  id: string;
  file: File;
  duration: number;
  analyzed: boolean;
  approved?: boolean;
  detectedLang?: string;
};

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CloneModal({ onClose, onCloned }: { onClose: () => void; onCloned: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [audioFiles, setAudioFiles] = useState<CloneAudioFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* step-2 fields */
  const [voiceName, setVoiceName]         = useState("");
  const [description, setDescription]     = useState("");
  const [language, setLanguage]           = useState("es");
  const [gender, setGender]               = useState<"masculine" | "feminine" | "neutral">("masculine");
  const [age, setAge]                     = useState<"young" | "adult" | "senior">("adult");
  const [selectedTags, setSelectedTags]   = useState<string[]>([]);
  const [isPublic, setIsPublic]           = useState(false);
  const [publicConfirmed, setPublicConfirmed] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [cloneModel, setCloneModel]       = useState<"s2-pro" | "s1">("s2-pro");
  const [enhanceAudio, setEnhanceAudio]   = useState(true);
  const [generateSample, setGenerateSample] = useState(true);
  const [sampleUrl, setSampleUrl]         = useState<string | null>(null);

  const totalDuration = audioFiles.reduce((sum, f) => sum + f.duration, 0);
  const allAnalyzed   = audioFiles.length > 0 && audioFiles.every((f) => f.analyzed);
  const durationValid = totalDuration >= 10 && totalDuration <= 90;
  const durationError = audioFiles.length > 0
    ? totalDuration < 10
      ? "El audio debe tener al menos 10 segundos de duración."
      : totalDuration > 90
        ? "El audio debe tener entre 10 y 90 segundos de duración."
        : null
    : null;
  const canContinue   = allAnalyzed && durationValid;
  const fillPct       = Math.min(totalDuration, DURATION_MAX) / DURATION_MAX * 100;
  const canCreate     = !!voiceName.trim() && audioFiles.length > 0 && (!isPublic || publicConfirmed);

  async function getFileDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => { URL.revokeObjectURL(url); resolve(audio.duration); }, { once: true });
      audio.addEventListener("error",          () => { URL.revokeObjectURL(url); resolve(0);             }, { once: true });
    });
  }

  async function handleFiles(incoming: File[]) {
    const valid = incoming.filter((f) => {
      const n = f.name.toLowerCase();
      return [".mp3",".wav",".m4a",".flac",".mp4",".mov",".webm"].some((ext) => n.endsWith(ext))
        || f.type.startsWith("audio/") || f.type.startsWith("video/");
    });
    const processed = await Promise.all(
      valid.map(async (f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        duration: await getFileDuration(f),
        analyzed: false,
      } as CloneAudioFile))
    );
    setAudioFiles((prev) => [...prev, ...processed]);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setAudioFiles((prev) =>
      prev.map((f) => ({ ...f, analyzed: true, approved: true, detectedLang: "es" }))
    );
    setAnalyzing(false);
  }

  function removeFile(id: string) {
    setAudioFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function handleClone() {
    if (!audioFiles.length || !voiceName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("audio",           audioFiles[0].file);
      fd.append("voice_name",      voiceName.trim());
      fd.append("language",        language);
      fd.append("gender",          gender);
      fd.append("model",           cloneModel);
      fd.append("enhance_audio",   String(enhanceAudio));
      fd.append("generate_sample", String(generateSample));
      const res  = await fetch("/api/clone", { method: "POST", body: fd });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("La página está desactualizada. Por favor recarga la página (Ctrl+Shift+R) e inténtalo de nuevo.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al clonar");
      if (data.sampleUrl) setSampleUrl(data.sampleUrl);
      else { onCloned(); onClose(); }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Clone Voice</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-7">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: "#ffffff", color: "#000" }}>1</span>
            <span className="text-sm font-medium text-white whitespace-nowrap">Audio Source</span>
          </div>
          <div className="flex-1 h-px" style={{ background: step >= 2 ? "#444" : "#222" }} />
          <div className="flex items-center gap-2" style={{ opacity: step >= 2 ? 1 : 0.35 }}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: step >= 2 ? "#ffffff" : "rgba(255,255,255,0.08)", color: step >= 2 ? "#000" : "rgba(255,255,255,0.4)" }}>2</span>
            <span className="text-sm font-medium text-white whitespace-nowrap">Voice Details</span>
          </div>
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const fs = Array.from(e.dataTransfer.files); if (fs.length) handleFiles(fs); }}
              className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all mb-4"
              style={{ borderColor: dragging ? "#6366f1" : "#2a2a2a", background: dragging ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.01)" }}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".mp3,.wav,.m4a,.flac,.mp4,.mov,.webm,audio/*,video/*"
                multiple
                onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) handleFiles(fs); e.target.value = ""; }}
              />
              <div className="flex justify-center mb-3">
                <Mic size={28} style={{ color: "#555" }} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Instant Voice Clone</p>
              <p className="text-xs mb-4" style={{ color: "#666" }}>Only 10 seconds of audio needed!</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.10)", color: "#aaa" }}>
                <Upload size={12} /> Upload files
              </span>
              <p className="text-xs mt-3" style={{ color: "#3a3a3a" }}>MP3 · WAV · M4A · FLAC · MP4 · MOV · WEBM · Max 50MB</p>
            </div>

            {/* Duration bar */}
            {audioFiles.length > 0 && (
              <div className="mb-4 px-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "#666" }}>
                    Total: <span className="text-white font-medium">{Math.floor(totalDuration)}s</span>
                  </span>
                  {totalDuration < 10 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Mínimo 10s</span>
                  ) : totalDuration > 90 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Máximo 90s</span>
                  ) : totalDuration < 30 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Ready to analyze</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Good quality</span>
                  )}
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "#1e1e1e" }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${fillPct}%`, background: durationValid ? "linear-gradient(90deg, #22c55e, #16a34a)" : "linear-gradient(90deg, #ef4444, #dc2626)" }}
                  />
                  {/* marker ticks */}
                  {DURATION_MARKERS.map((m) => (
                    <div
                      key={m.seconds}
                      className="absolute top-0 h-full w-px"
                      style={{ left: `${(m.seconds / DURATION_MAX) * 100}%`, background: "rgba(255,255,255,0.20)" }}
                    />
                  ))}
                </div>
                <div className="relative h-4">
                  {DURATION_MARKERS.filter((m) => m.label).map((m) => (
                    <span
                      key={m.seconds}
                      className="absolute text-xs transform -translate-x-1/2"
                      style={{ left: `${(m.seconds / DURATION_MAX) * 100}%`, color: totalDuration >= m.seconds ? "#8b5cf6" : "#333", fontSize: "10px" }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Duration error */}
            {durationError && (
              <div className="mb-4 px-3 py-2.5 rounded-xl flex items-center gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <span style={{ color: "#ef4444", flexShrink: 0, fontSize: "14px" }}>⚠</span>
                <p className="text-xs font-medium" style={{ color: "#f87171" }}>{durationError}</p>
              </div>
            )}

            {/* File list */}
            {audioFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                {audioFiles.map((af) => (
                  <div key={af.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
                        <FileAudio size={14} style={{ color: "#666" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{af.file.name}</p>
                        <p className="text-xs" style={{ color: "#555" }}>
                          {(af.file.size / 1024).toFixed(0)} KB · {Math.floor(af.duration)}s
                          {af.detectedLang && ` · ${af.detectedLang}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {af.analyzed && af.approved && (
                        <span className="hidden sm:flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
                          <Check size={11} /> Approved
                        </span>
                      )}
                      <button onClick={() => removeFile(af.id)} className="p-1 rounded transition-colors hover:text-white" style={{ color: "#444" }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", color: "#555" }}>
                Cancel
              </button>
              {!allAnalyzed ? (
                <button
                  onClick={handleAnalyze}
                  disabled={audioFiles.length === 0 || analyzing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.10)", color: "#ccc" }}
                >
                  {analyzing ? <><SpinnerIcon className="animate-spin h-4 w-4" /> Analyzing…</> : "Analyze audio"}
                </button>
              ) : (
                <button
                  onClick={() => canContinue && setStep(2)}
                  disabled={!canContinue}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canContinue ? "#ffffff" : "#333", color: canContinue ? "#000" : "#666" }}
                >
                  Continue to details →
                </button>
              )}
            </div>

            {allAnalyzed && (
              <button
                onClick={() => setAudioFiles((prev) => prev.map((f) => ({ ...f, analyzed: false, approved: undefined, detectedLang: undefined })))}
                className="w-full mt-2 py-1.5 text-xs text-center transition-colors hover:text-white/50"
                style={{ color: "#333" }}
              >
                Re-analyze audio
              </button>
            )}
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs mb-5 transition-colors hover:text-white/60" style={{ color: "#444" }}>
              ← Back to audio
            </button>

            {/* Name */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Voice name <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g. My Voice"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/10"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Description <span className="text-white/25 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this voice…"
                rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/10 resize-none"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Tags <span className="text-white/25 font-normal text-xs">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {VOICE_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: active ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${active ? "#8b5cf6" : "#2a2a2a"}`,
                        color: active ? "#c4b5fd" : "#555",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gender + Age */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Gender</label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {(["masculine","feminine","neutral"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className="py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: gender === g ? "#1e1e1e" : "transparent", color: gender === g ? "#e5e7eb" : "#444", border: gender === g ? "1px solid #333" : "1px solid transparent" }}
                    >
                      {g === "masculine" ? "Male" : g === "feminine" ? "Female" : "Neutral"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Age</label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {(["young","adult","senior"] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setAge(a)}
                      className="py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: age === a ? "#1e1e1e" : "transparent", color: age === a ? "#e5e7eb" : "#444", border: age === a ? "1px solid #333" : "1px solid transparent" }}
                    >
                      {a === "young" ? "Young" : a === "adult" ? "Adult" : "Senior"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Language</label>
              <CustomSelect options={CLONE_LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
            </div>

            {/* Model selector */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#555", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.06em" }}>MODELO</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {([["s2-pro", "Elite PRO", "Mejor calidad"], ["s1", "Elite Legacy", "Más rápido"]] as const).map(([val, label, desc]) => (
                  <button
                    key={val}
                    onClick={() => setCloneModel(val)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${cloneModel === val ? "rgba(255,255,255,0.4)" : "#222"}`,
                      background: cloneModel === val ? "rgba(255,255,255,0.06)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, color: cloneModel === val ? "#fff" : "#666", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhance audio toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p style={{ fontSize: "13px", color: "#fff", fontWeight: 500, margin: 0 }}>Mejorar calidad de audio</p>
                <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>Procesa el audio de referencia para optimizar el clon</p>
              </div>
              <button
                onClick={() => setEnhanceAudio(p => !p)}
                style={{
                  width: "40px", height: "22px", borderRadius: "999px", border: "none", cursor: "pointer",
                  background: enhanceAudio ? "#ffffff" : "#333",
                  position: "relative", flexShrink: 0, transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: "3px",
                  left: enhanceAudio ? "20px" : "3px",
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: enhanceAudio ? "#000" : "#888",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            {/* Generate sample toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p style={{ fontSize: "13px", color: "#fff", fontWeight: 500, margin: 0 }}>Generar muestra automática</p>
                <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>Escucha tu voz clonada antes de guardarla</p>
              </div>
              <button
                onClick={() => setGenerateSample(p => !p)}
                style={{
                  width: "40px", height: "22px", borderRadius: "999px", border: "none", cursor: "pointer",
                  background: generateSample ? "#ffffff" : "#333",
                  position: "relative", flexShrink: 0, transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: "3px",
                  left: generateSample ? "20px" : "3px",
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: generateSample ? "#000" : "#888",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            {/* Visibility */}
            <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Visibility</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button type="button" onClick={() => { setIsPublic(false); setPublicConfirmed(false); }}
                  className="py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: !isPublic ? "#1e1e1e" : "transparent", border: `1px solid ${!isPublic ? "#444" : "#222"}`, color: !isPublic ? "#e5e7eb" : "#444" }}
                >
                  🔒 Private
                </button>
                <button type="button" onClick={() => setIsPublic(true)}
                  className="py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: isPublic ? "rgba(139,92,246,0.12)" : "transparent", border: `1px solid ${isPublic ? "#8b5cf6" : "#222"}`, color: isPublic ? "#c4b5fd" : "#444" }}
                >
                  🌐 Public
                </button>
              </div>
              {isPublic && (
                <div className="space-y-2.5">
                  <p className="text-xs" style={{ color: "#777" }}>Esta voz será visible en la página de voces públicas</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publicConfirmed}
                      onChange={(e) => setPublicConfirmed(e.target.checked)}
                      className="mt-0.5 rounded accent-violet-500"
                    />
                    <span className="text-xs leading-relaxed" style={{ color: "#666" }}>
                      Confirmo que tengo derechos sobre esta grabación y acepto que sea usada públicamente
                    </span>
                  </label>
                </div>
              )}
            </div>

            {error && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{error}</p>}

            {sampleUrl && (
              <div style={{ marginTop: "16px", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "10px", fontWeight: 600 }}>Vista previa del clon generada automáticamente:</p>
                <audio controls src={sampleUrl} style={{ width: "100%", marginBottom: "12px" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { onCloned(); onClose(); }}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#ffffff", color: "#000", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer" }}
                  >
                    Guardar voz
                  </button>
                  <button
                    onClick={() => { setSampleUrl(null); }}
                    style={{ padding: "10px 14px", borderRadius: "8px", background: "transparent", color: "#888", fontWeight: 600, fontSize: "13px", border: "1px solid rgba(255,255,255,0.10)", cursor: "pointer" }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", color: "#555" }}>
                ←
              </button>
              <button
                onClick={handleClone}
                disabled={!canCreate || loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: canCreate && !loading ? "#ffffff" : "#1e1e1e", color: canCreate && !loading ? "#000" : "#444" }}
              >
                {loading && <SpinnerIcon className="animate-spin h-4 w-4" />}
                {loading ? "Creating voice…" : "Create voice"}
              </button>
            </div>
          </>
        )}
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
      style={{ background: hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderColor: hovered ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.06)" }}
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
                style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
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
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />
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
                <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />
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
  const { t } = useLang();
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
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
      const blobUrl = await getAudioBlobUrl(url);
      const audio = new Audio(blobUrl);
      previewAudiosRef.current[voice.id] = audio;
      audio.onended = () => { setPreviewState((s) => ({ ...s, [voice.id]: "idle" })); URL.revokeObjectURL(blobUrl); };
      audio.onerror = () => { setPreviewState((s) => ({ ...s, [voice.id]: "idle" })); URL.revokeObjectURL(blobUrl); };
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
      {showMethodPicker && (
        <MethodPickerModal
          onClose={() => setShowMethodPicker(false)}
          onPickClone={() => { setShowMethodPicker(false); setShowCloneModal(true); }}
          onPickDesign={() => { setShowMethodPicker(false); setShowDesignModal(true); }}
        />
      )}
      {showCloneModal && (
        <CloneModal
          onClose={() => setShowCloneModal(false)}
          onCloned={() => { setShowCloneModal(false); onRefresh(); }}
        />
      )}
      {showDesignModal && (
        <VoiceDesignModal
          onClose={() => setShowDesignModal(false)}
          onSaved={() => { setShowDesignModal(false); onRefresh(); }}
        />
      )}

      {/* Toolbar: slots · search · create button */}
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
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: "#d1d5db" }}
          />
        </div>
        <button
          onClick={() => !atLimit && setShowMethodPicker(true)}
          disabled={atLimit}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-black flex-shrink-0 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#ffffff", borderRadius: "10px" }}
        >
          <span className="text-base leading-none">+</span>
          {t.voices.cloneNew}
        </button>
      </div>

      {/* Grid */}
      {cloned.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#888888" }}>
          <Mic size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">{t.voices.noClonedVoices}</p>
          <p className="text-sm opacity-60">{t.voices.cloneHint}</p>
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
  const { t } = useLang();
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  void plan;

  async function handleDownload(gen: HistoryGen) {
    if (!gen.audioUrl || downloadingId) return;
    setDownloadingId(gen.id);
    try {
      await downloadAudio(gen.audioUrl, generateAudioFilename(gen.text ?? ''));
    } finally {
      setDownloadingId(null);
    }
  }

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

  async function togglePlay(gen: HistoryGen) {
    if (!gen.audioUrl) return;
    if (playingId === gen.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      setPlayTime({ current: 0, duration: 0 });
      return;
    }
    audioRef.current?.pause();
    setPlayTime({ current: 0, duration: 0 });
    const blobUrl = await getAudioBlobUrl(gen.audioUrl);
    const audio = new Audio(blobUrl);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setPlayTime({ current: 0, duration: audio.duration });
    audio.ontimeupdate = () => setPlayTime({ current: audio.currentTime, duration: audio.duration });
    audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(blobUrl); };
    audio.onerror = (e) => { console.error('Audio error:', e, audio.error); setPlayingId(null); URL.revokeObjectURL(blobUrl); };
    setPlayingId(gen.id);
    try {
      await audio.play();
    } catch (err) {
      console.error('Play failed:', err);
      setPlayingId(null);
      URL.revokeObjectURL(blobUrl);
    }
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
            placeholder={t.history.searchPlaceholder}
            style={{
              width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
              color: "#d1d5db", fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => fetchHistory(page)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: "#9ca3af", cursor: "pointer",
          }}
          title="Actualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><EliteLoader /></div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <Clock size={40} style={{ margin: "0 auto 12px", color: "rgba(255,255,255,0.08)" }} />
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
                          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                          border: isError ? "1px solid rgba(239,68,68,0.2)" : isProcessing ? "1px solid rgba(255,255,255,0.12)" : "1px solid #1a1a1a",
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
                              background: isPlaying ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
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
                            <button
                              onClick={() => handleDownload(gen)}
                              disabled={downloadingId === gen.id}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 26, height: 26, borderRadius: "50%",
                                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#9ca3af", border: "none",
                                cursor: downloadingId === gen.id ? "default" : "pointer",
                              }}
                              title={t.history.download}
                            >
                              {downloadingId === gen.id
                                ? <Loader size={11} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                                : <Download size={11} />}
                            </button>
                          )}

                          <button
                            onClick={() => gen.audioUrl && navigator.clipboard.writeText(gen.audioUrl)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, borderRadius: "50%",
                              background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#9ca3af", border: "none", cursor: "pointer",
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
                                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#9ca3af", border: "none", cursor: "pointer",
                              }}
                            >
                              <MoreHorizontal size={13} />
                            </button>
                            {openMenuId === gen.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="glass-menu"
                                style={{
                                  position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
                                  padding: 4, minWidth: 120,
                                }}
                              >
                                <button
                                  onClick={() => handleDelete(gen.id)}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
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
          paddingTop: 16, marginTop: 16, flexShrink: 0,
        }}>
          <button
            onClick={() => fetchHistory(page - 1)}
            disabled={page <= 1}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: page <= 1 ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: page <= 1 ? "#444444" : "#9ca3af",
            }}
          >Anterior</button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{page} / {totalPages}</span>
          <button
            onClick={() => fetchHistory(page + 1)}
            disabled={page >= totalPages}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: page >= totalPages ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: page >= totalPages ? "#444444" : "#9ca3af",
            }}
          >{t.history.nextPage.replace(' →', '')} →</button>
        </div>
      )}

      {total > 0 && (
        <p style={{ fontSize: 11, color: "#444444", textAlign: "center", paddingTop: 8, flexShrink: 0 }}>
          {total === 1 ? t.history.totalGeneration : t.history.totalGenerations.replace('{n}', String(total))}
        </p>
      )}
    </div>
  );
}
/* ─── Plan limits (mirrored from lib/stripe.ts for client use) ── */
const VOICE_SLOT_LIMITS: Record<string, number> = { free: 1, creator: 3, plus: 10, pro: 15, elite: 20, starter: 3, enterprise: Infinity, lifetime: Infinity };

/* ─── Billing Tab ────────────────────────────────────────── */

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  free:       { label: "Gratis",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  creator:    { label: "Creator",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  plus:       { label: "Plus",       color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  pro:        { label: "Pro",        color: "#aaaaaa", bg: "rgba(255,255,255,0.08)"  },
  elite:      { label: "Elite",      color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  // legacy
  starter:    { label: "Starter",    color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  enterprise: { label: "Enterprise", color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  lifetime:   { label: "LIFETIME ♾",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
};

function costPer10k(price: number, characters: number): string {
  return `$${((price / characters) * 10_000).toFixed(2)}/10k`;
}

function getBillingPlans(t: Translations) {
  return [
    {
      key: "free", name: "Free", description: t.billing.planDescFree,
      price: 0, annualTotal: 0, characters: 10_000, popular: false,
      features: [t.billing.feat10k, t.billing.featRandomVoice, t.billing.feat2Transcriptions, t.billing.featNoClone, t.billing.featAudio72h],
    },
    {
      key: "creator", name: "Creator", description: t.billing.planDescCreator,
      price: 8, annualTotal: 81.60, characters: 250_000, popular: false,
      features: [t.billing.featCharsX2.replace('{n}', '250.000'), t.billing.featFullVoice, t.billing.featUnlimitedTrans, t.billing.feat3Clones, t.billing.featAudio14d],
    },
    {
      key: "plus", name: "Plus", description: t.billing.planDescPlus,
      price: 26, annualTotal: 265.20, characters: 1_000_000, popular: true,
      features: [t.billing.featCharsX2.replace('{n}', '1.000.000'), t.billing.featFullVoice, t.billing.featUnlimitedTrans, t.billing.feat10Clones, t.billing.featPriorityGen, t.billing.featAudio30d],
    },
    {
      key: "pro", name: "Pro", description: t.billing.planDescPro,
      price: 49, annualTotal: 499.80, characters: 2_000_000, popular: false,
      features: [t.billing.featCharsX2.replace('{n}', '2.000.000'), t.billing.featFullVoice, t.billing.featUnlimitedTrans, t.billing.feat15Clones, t.billing.featPriorityGen, t.billing.featAudio30d],
    },
    {
      key: "elite", name: "Elite", description: t.billing.planDescElite,
      price: 315, annualTotal: 3213, characters: 15_000_000, popular: false,
      features: [t.billing.featCharsX2.replace('{n}', '15.000.000'), t.billing.featFullVoice, t.billing.featUnlimitedTrans, t.billing.feat20Clones, t.billing.featTopPriority, t.billing.featSupport, t.billing.featAudio90d],
    },
  ];
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
  const { t } = useLang();
  const BILLING_PLANS = getBillingPlans(t);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showManage, setShowManage] = useState(false);
  const router = useRouter();
  const [discount, setDiscount] = useState<{ percentage: number; label: string } | null>(null);
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)affiliate_discount=([^;]*)/);
    if (!m) return;
    try { const d = JSON.parse(decodeURIComponent(m[1])); if (d?.percentage > 0) setDiscount(d); } catch {}
  }, []);

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
      <div style={{ borderRadius: "12px", border: plan === "lifetime" ? "1px solid rgba(245,158,11,0.25)" : "1px solid #1a1a1a", background: plan === "lifetime" ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.08)", padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#444444", marginBottom: "3px" }}>Caracteres disponibles</p>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {credits !== null ? credits.toLocaleString("es-ES") : "—"}
              {extraCredits > 0 && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#34d399" }}>+{extraCredits.toLocaleString("es-ES")} extra</span>
              )}
            </p>
          </div>
          {plan === "lifetime" ? (
            <>
              <div style={{ width: "1px", height: "32px", background: "rgba(245,158,11,0.2)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "11px", color: "#444444", marginBottom: "3px" }}>Tipo de plan</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                  ♾ Vitalicio · Pago único · Sin caducidad
                </p>
              </div>
            </>
          ) : renewalDateLabel ? (
            <>
              <div style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", flexShrink: 0 }} />
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
          ) : null}
        </div>
        {plan === "lifetime" ? (
          <Link
            href="/checkout/lifetime"
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", color: "#f59e0b", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none" }}
          >
            Renovar créditos ($340) →
          </Link>
        ) : plan !== "free" ? (
          <button
            onClick={() => setShowManage(true)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Gestionar suscripción →
          </button>
        ) : null}
      </div>

      {/* ── Monthly / Annual toggle ── */}
      {plan === "lifetime" ? null : <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
        <div style={{ position: "relative", display: "inline-grid", gridTemplateColumns: "1fr 1fr", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "3px" }}>
          {/* Sliding pill */}
          <div style={{ position: "absolute", top: "3px", left: "3px", width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "7px", pointerEvents: "none", transition: "transform 0.2s ease", transform: `translateX(${billing === "annual" ? "100%" : "0%"})` }} />
          <button
            onClick={() => setBilling("monthly")}
            style={{ position: "relative", zIndex: 1, padding: "7px 22px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: "transparent", color: billing === "monthly" ? "#e5e7eb" : "#444444", transition: "color 0.2s ease" }}
          >
            {t.billing.monthly}
          </button>
          <button
            onClick={() => setBilling("annual")}
            style={{ position: "relative", zIndex: 1, padding: "7px 22px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: "transparent", color: billing === "annual" ? "#e5e7eb" : "#444444", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "color 0.2s ease" }}
          >
            {t.billing.annual}
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e", letterSpacing: "0.03em" }}>
              −15%
            </span>
          </button>
        </div>
      </div>}

      {/* ── Lifetime: feature summary instead of plan grid ── */}
      {plan === "lifetime" && (
        <div style={{ borderRadius: 12, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)", padding: "20px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 14, letterSpacing: "0.05em" }}>
            ♾ PLAN ELITE VITALICIO · ACCESO COMPLETO
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "10px 24px" }}>
            {[
              "20.000.000 créditos por pago",
              "Voces clonadas ilimitadas",
              "Texto a Voz · Diálogo · Traducción",
              "Transcripción · Imagen · Vídeo",
              "Los créditos no caducan",
              "Soporte prioritario de por vida",
            ].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#d1d5db" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy plan notice — starter/enterprise users */}
      {(plan === "starter" || plan === "enterprise") && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.06)", fontSize: "13px", color: "#a78bfa" }}>
          Tu plan legacy <strong>{plan}</strong> se mantiene activo · No se factura ningún cambio automático
        </div>
      )}

      {/* ── Plan cards (4 in a row) — hidden for lifetime ── */}
      {plan !== "lifetime" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {BILLING_PLANS.map((p) => {
          const isLegacyUser = plan === "starter" || plan === "enterprise";
          const isCurrent = plan === p.key;
          const planBadge = PLAN_BADGE[p.key];
          const annualMonthlyPrice = p.annualTotal > 0 ? Math.round((p.annualTotal / 12) * 100) / 100 : 0;
          const monthlyPrice = billing === "annual" && p.price > 0 ? annualMonthlyPrice : p.price;
          const effectiveMonthly = (discount && p.price > 0)
            ? Math.round(monthlyPrice * (1 - discount.percentage / 100) * 100) / 100
            : monthlyPrice;
          const borderColor = isCurrent ? (planBadge?.color ?? "#888888") : p.popular ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)";
          const isDowngrade = plan !== "free" && p.key === "free";
          const annualSavings = p.price > 0 ? Math.round((p.price * 12 - p.annualTotal) * 100) / 100 : 0;

          return (
            <div
              key={p.key}
              style={{
                borderRadius: "16px",
                border: `1px solid ${borderColor}`,
                background: isCurrent ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
                padding: "22px 16px 18px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Name + badges */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{p.name}</span>
                  {billing === "annual" && p.price > 0 && (
                    <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px", background: "rgba(34,197,94,0.12)", color: "#4ade80", whiteSpace: "nowrap" }}>
                      Ahorras ${annualSavings.toFixed(2)}/año
                    </span>
                  )}
                </div>
                {isCurrent && !isLegacyUser ? (
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px", color: planBadge?.color, background: planBadge?.bg, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>
                    ACTUAL
                  </span>
                ) : p.popular ? (
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", color: "#ffffff", background: "rgba(255,255,255,0.10)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Popular
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "16px", lineHeight: 1.4 }}>
                {p.description}
              </p>

              {/* Discount badge */}
              {discount && p.price > 0 && (
                <div style={{ display: "inline-block", marginBottom: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                  {discount.label}
                </div>
              )}

              {/* Price */}
              <div style={{ marginBottom: "16px", minHeight: "58px" }}>
                {p.price === 0 ? (
                  <>
                    <span style={{ fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1, display: "block" }}>Gratis</span>
                    <p style={{ fontSize: "11px", color: "transparent", marginTop: "4px", userSelect: "none" }}>·</p>
                  </>
                ) : (
                  <>
                    {(billing === "annual" || !!discount) && (
                      <p style={{ fontSize: "13px", color: "#444444", textDecoration: "line-through", marginBottom: "0px", lineHeight: 1 }}>
                        ${p.price}/mes
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                      <span style={{ fontSize: "32px", fontWeight: 800, color: discount ? "#4ade80" : "#fff", lineHeight: 1 }}>
                        ${effectiveMonthly}
                      </span>
                      <span style={{ fontSize: "12px", color: "#444444", marginLeft: "2px" }}>/mes</span>
                    </div>
                    {billing === "annual" ? (
                      <p style={{ fontSize: "11px", color: "#555555", marginTop: "2px" }}>
                        ${Math.round(effectiveMonthly * 12 * 100) / 100} facturado anualmente
                      </p>
                    ) : discount ? (
                      <p style={{ fontSize: "11px", color: "#4ade80", marginTop: "3px" }}>
                        {discount.percentage}% de descuento aplicado
                      </p>
                    ) : (
                      <p style={{ fontSize: "11px", color: "transparent", marginTop: "3px", userSelect: "none" }}>·</p>
                    )}
                    <p style={{ fontSize: "10px", color: "#444444", marginTop: "2px" }}>
                      {costPer10k(effectiveMonthly, p.characters)}
                    </p>
                  </>
                )}
              </div>

              {/* CTA button */}
              {isLegacyUser ? (
                <div style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "#444444", fontSize: "12px", fontWeight: 500, marginBottom: "16px", textAlign: "center" }}>
                  Disponible para nuevas suscripciones
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (isCurrent) return;
                    if (isDowngrade || p.key === "free") { openPortal(); return; }
                    router.push(`/checkout/${p.key}?billing=${billing}`);
                  }}
                  disabled={isCurrent}
                  style={
                    isCurrent
                      ? { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#444444", fontSize: "13px", fontWeight: 600, marginBottom: "16px", cursor: "not-allowed" }
                      : p.popular
                      ? { width: "100%", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", background: "#ffffff", color: "#000000", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
                      : { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.10)", cursor: "pointer", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#e5e7eb", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
                  }
                >
                  {isCurrent
                    ? t.billing.currentPlanBtn
                    : isDowngrade
                    ? t.billing.changeToFree
                    : plan !== "free"
                    ? `${t.billing.changeTo} ${p.name}`
                    : p.key === "free"
                    ? t.billing.currentPlanBtn
                    : t.billing.subscribe}
                </button>
              )}

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", marginBottom: "14px" }} />

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {p.features.map((f, i) => (
                  <li
                    key={f}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.80)",
                      paddingTop: "10px", paddingBottom: "10px",
                      borderBottom: i < p.features.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none",
                    }}
                  >
                    <FeatureTick />
                    {f}
                  </li>
                ))}
              </ul>


              {/* Card footer — character count */}
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.60)", textAlign: "center" }}>
                  {p.characters.toLocaleString("es-ES")} {t.billing.charsMonth}
                </p>
              </div>
            </div>
          );
        })}
      </div>}

      {/* ── Extra credits section ── */}
      <div id="creditos-extra" style={{ marginTop: "44px", marginBottom: "20px" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#e5e7eb", marginBottom: "4px" }}>{t.billing.extraCredits}</p>
        <p style={{ fontSize: "13px", color: "#444444" }}>{t.billing.extraCreditsDesc}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
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
              background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.12)",
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
            <p style={{ fontSize: "11px", color: "#444444", flex: 1, marginBottom: "16px" }}>{t.billing.validMonths}</p>

            {/* CTA */}
            <button
              onClick={() => router.push(`/checkout/credits-${pack.key}?type=credits`)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.10)", cursor: "pointer", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#e5e7eb", fontSize: "13px", fontWeight: 600 }}
            >
              {t.billing.buyBtn}
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
  originalName?: string;
  targetLanguage: string;
  targetLanguageName: string;
  status: string;
  creditsUsed: number;
  durationSeconds: number | null;
  audioUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string | null;
  speakerMode?: string;
  speakerCount?: number | null;
}

interface AssemblyAIUtterance {
  speaker: string;   // "A", "B", "C"...
  text: string;
  start: number;     // milliseconds
  end: number;
  confidence?: number;
  translatedText?: string; // populated after translate-segments step
}

const SPEAKER_COLORS: { bg: string; border: string; label: string }[] = [
  { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.25)", label: "#a78bfa" },  // purple
  { bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.25)",  label: "#60a5fa" },  // blue
  { bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.25)",  label: "#4ade80" },  // green
  { bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.25)",  label: "#fb923c" },  // orange
  { bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.25)", label: "#fb7185" },  // rose
];

const TRANSLATE_RETENTION: Record<string, number> = {
  free: 3, starter: 14, pro: 30, elite: 30, enterprise: 90,
};

const TRANSLATE_STEPS = [
  { after: 0,    label: "Transcribiendo audio..." },
  { after: 9000, label: "Traduciendo texto..." },
  { after: 18000, label: "Generando audio traducido..." },
];

function getLanguageFlag(lang: string): string {
  const flags: Record<string, string> = {
    es: '🇪🇸', en: '🇺🇸', fr: '🇫🇷', de: '🇩🇪',
    pt: '🇧🇷', it: '🇮🇹', ja: '🇯🇵', zh: '🇨🇳',
    ko: '🇰🇷', ru: '🇷🇺', ar: '🇸🇦', hi: '🇮🇳',
    nl: '🇳🇱', pl: '🇵🇱', tr: '🇹🇷', sv: '🇸🇪',
  };
  return flags[lang?.toLowerCase?.().slice(0, 2)] ?? '🌐';
}

function getTranslateDisplayName(task: TTranslateTask): string {
  const raw = task.originalName || task.fileName || '';
  const name = raw.replace(/\.[^/.]+$/, '');
  // Technical names look like: 1781120518163-mbxih7-audio-...
  if (name && !/^\d{10,}-[a-z0-9]+-/.test(name)) return name;
  const date = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return `Audio traducido${date ? ' · ' + date : ''}`;
}

function getLanguageName(lang: string): string {
  const names: Record<string, string> = {
    es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán',
    pt: 'Portugués', it: 'Italiano', ja: 'Japonés', zh: 'Chino',
    ko: 'Coreano', ru: 'Ruso', ar: 'Árabe', hi: 'Hindi',
    nl: 'Neerlandés', pl: 'Polaco', tr: 'Turco', sv: 'Sueco',
  };
  return names[lang?.toLowerCase?.().slice(0, 2)] ?? lang ?? '—';
}

function groupTranslationsByDate(items: TTranslateTask[]): { label: string; items: TTranslateTask[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const map = new Map<string, TTranslateTask[]>();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
    let label: string;
    if (diffDays === 0) label = 'HOY';
    else if (diffDays === 1) label = 'AYER';
    else if (diffDays <= 6) label = day.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
    else label = day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase();
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function TranslateTab({ onGenerated, voices, plan, transcriptionUsed, onBilling, selectedVoice, onVoiceChange }: {
  onGenerated: () => void;
  voices: Voice[];
  plan: string;
  transcriptionUsed: number;
  onBilling: () => void;
  selectedVoice: SelectedVoice | null;
  onVoiceChange: (v: SelectedVoice | null) => void;
}) {
  const { t } = useLang();
  const TRANSLATE_LANG_LABELS: Record<string, string> = {
    en: t.translate.langEn, zh: t.translate.langZh, de: t.translate.langDe,
    ja: t.translate.langJa, fr: t.translate.langFr, es: t.translate.langEs,
    ko: t.translate.langKo, ar: t.translate.langAr, ru: t.translate.langRu,
    pt: t.translate.langPt,
  };

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

  // Result audio player
  const translationAudioRef = useRef<HTMLAudioElement>(null);
  const [isTranslationPlaying, setIsTranslationPlaying] = useState(false);
  const [translationCurrentTime, setTranslationCurrentTime] = useState(0);
  const [translationDuration, setTranslationDuration] = useState(0);

  // History audio player
  const historyAudioRef = useRef<HTMLAudioElement>(null);
  const [activeTranslationId, setActiveTranslationId] = useState<string | null>(null);
  const [isHistoryPlaying, setIsHistoryPlaying] = useState(false);

  // Multi-speaker mode — forced to "single" while multi is disabled
  const [speakerMode, setSpeakerMode] = useState<"single" | "multi">("single");
  useEffect(() => { if (speakerMode === "multi") setSpeakerMode("single"); }, []);
  const [speakersExpected, setSpeakersExpected] = useState<string>("auto");
  const [utterances, setUtterances] = useState<AssemblyAIUtterance[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [speakerCount, setSpeakerCount] = useState<number | null>(null);
  const [previewFileKey, setPreviewFileKey] = useState<string | null>(null);
  const [analyzeStep, setAnalyzeStep] = useState(0); // 1=uploading 2=detecting 3=translating

  // Voice assignments for multi-speaker mode
  const [voiceAssignments, setVoiceAssignments] = useState<Record<string, {id: string, name: string}>>({});
  const [selectingVoiceForSpeaker, setSelectingVoiceForSpeaker] = useState<string | null>(null);
  const [speakerPreviews, setSpeakerPreviews] = useState<Record<string, string>>({});

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
    setUtterances(null);
    setVoiceAssignments({});
    setSpeakerPreviews({});
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
      const firstItem = (data.tasks ?? [])[0];
      if (firstItem) {
        console.log('[translate item ALL fields]:', JSON.stringify(firstItem, null, 2));
      }
      setHistoryTasks(data.tasks ?? []);
    } catch { /* ignore */ } finally { setLoadingHistory(false); }
  }

  useEffect(() => { fetchHistory(); }, []);

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

  async function handleAnalyze() {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) { setError("El archivo es demasiado grande. Máximo 200 MB."); return; }
    setPreviewLoading(true);
    setAnalyzeStep(1);
    setError(null);
    setUtterances(null);
    setSpeakerCount(null);
    setPreviewFileKey(null);
    setVoiceAssignments({});
    setSpeakerPreviews({});
    try {
      const fk = await uploadInChunks(file, "Subiendo audio...");
      setPreviewFileKey(fk);
      setAnalyzeStep(2);
      setStepLabel("Analizando hablantes...");

      // Fire-and-forget: POST returns immediately with jobId
      const res = await fetch("/api/translate/diarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: fk,
          speakersExpected: speakersExpected === "auto" ? null : parseInt(speakersExpected, 10),
        }),
      });
      const startData = await res.json();
      if (!res.ok) throw new Error(startData.error || "Error al iniciar diarización");
      const { jobId } = startData as { jobId: string };

      // Poll every 3 seconds until done, error, or 10-minute timeout
      const deadline = Date.now() + 10 * 60 * 1000;
      let rawUtterances: AssemblyAIUtterance[] = [];
      await new Promise<void>((resolve, reject) => {
        const poll = async () => {
          if (Date.now() > deadline) {
            reject(new Error("La detección de hablantes tardó demasiado. Intenta con un audio más corto."));
            return;
          }
          try {
            const statusRes = await fetch(`/api/translate/diarize/status/${jobId}`);
            const statusData = await statusRes.json();
            if (statusData.status === "done") {
              rawUtterances = statusData.utterances ?? [];
              setUtterances(rawUtterances);
              setSpeakerCount(statusData.speakerCount ?? statusData.speakersDetected ?? 1);
              setSpeakerPreviews(statusData.speakerPreviews ?? {});
              resolve();
            } else if (statusData.status === "error") {
              reject(new Error(statusData.error || "Error al detectar hablantes"));
            } else {
              setTimeout(poll, 3000);
            }
          } catch (e) {
            reject(e);
          }
        };
        setTimeout(poll, 3000);
      });

      // Step 3: Translate segments so user can review and edit before generating audio
      if (rawUtterances.length > 0 && targetLang) {
        setAnalyzeStep(3);
        setStepLabel("Traduciendo segmentos...");
        try {
          const transRes = await fetch("/api/translate/translate-segments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ utterances: rawUtterances, targetLang }),
          });
          if (transRes.ok) {
            const transData = await transRes.json();
            setUtterances(transData.utterances ?? rawUtterances);
          }
        } catch {
          // If translation preview fails, still show original utterances
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setPreviewLoading(false);
      setAnalyzeStep(0);
      setStepLabel(null);
    }
  }

  async function handleTranslate() {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      setError("El archivo es demasiado grande. Máximo 200 MB.");
      return;
    }

    // Multi-speaker: go to analyze step first if no utterances yet
    if (speakerMode === "multi" && !utterances) {
      await handleAnalyze();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    stepTimers.current.forEach(clearTimeout);

    try {
      let fileKey: string;
      let referenceFileKey: string | undefined;

      if (speakerMode === "multi" && previewFileKey) {
        // Reuse the file already uploaded during the analyze step
        fileKey = previewFileKey;
      } else {
        // ── Paso 1: subir audio principal en chunks ──
        fileKey = await uploadInChunks(file, "Subiendo audio...");

        // ── Paso 1b: subir audio de referencia si hay ──
        if (voiceSubTab === "reference" && referenceFile) {
          referenceFileKey = await uploadInChunks(referenceFile, "Subiendo referencia...");
        }
      }

      // ── Paso 2: crear tarea async y obtener taskId ──
      setStepLabel(speakerMode === "multi" ? "Traduciendo segmentos en paralelo..." : t.translate.stepTranscribing);

      const translateBody: Record<string, unknown> = {
        fileKey,
        targetLang,
        speakerMode,
      };
      if (speakerMode === "multi") {
        translateBody.utterances = utterances;
        translateBody.voiceAssignments = voiceAssignments;
      } else {
        translateBody.referenceId = voiceSubTab === "model" ? (selectedVoice?.referenceId || undefined) : undefined;
        translateBody.referenceFileKey = referenceFileKey;
      }

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translateBody),
      });
      const initData = await res.json();
      if (!res.ok) throw new Error(initData.error || "Error desconocido");

      const { taskId } = initData;

      // Immediately show as processing in history
      const pendingItem: TTranslateTask = {
        id: taskId,
        fileName: file.name,
        targetLanguage: targetLang,
        targetLanguageName: TRANSLATE_LANGS.find(l => l.code === targetLang)?.label ?? targetLang,
        status: "processing",
        createdAt: new Date().toISOString(),
        audioUrl: null,
        creditsUsed: 0,
        durationSeconds: null,
        errorMessage: null,
        expiresAt: null,
        speakerMode,
        speakerCount: speakerCount ?? undefined,
      };
      setHistoryTasks(prev => [pendingItem, ...prev]);

      // ── Paso 3: polling hasta completar ──
      const STEP_LABELS = speakerMode === "multi"
        ? [
            { after: 15000, label: "Generando audio multi-hablante..." },
          ]
        : [
            { after: 9000,  label: t.translate.stepTranslating },
            { after: 18000, label: t.translate.stepGenerating },
          ];
      stepTimers.current = STEP_LABELS.map(({ after, label }) =>
        setTimeout(() => setStepLabel(label), after)
      );

      const POLL_INTERVAL = 2000;
      const MAX_POLLS = 300; // 10 minutes max
      let polls = 0;

      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          polls++;
          if (polls > MAX_POLLS) {
            clearInterval(interval);
            reject(new Error("La traducción tardó demasiado. Intenta de nuevo."));
            return;
          }
          try {
            const statusRes = await fetch(`/api/translate/status?taskId=${taskId}`);
            const statusData = await statusRes.json();
            if (!statusRes.ok) {
              clearInterval(interval);
              reject(new Error(statusData.error || "Error al consultar estado"));
              return;
            }
            if (statusData.status === "completed") {
              clearInterval(interval);
              setHistoryTasks(prev => prev.map(h =>
                h.id === taskId
                  ? { ...h, status: "completed", audioUrl: statusData.audioUrl, creditsUsed: statusData.creditsUsed, durationSeconds: statusData.durationSeconds, errorMessage: null, speakerMode: statusData.speakerMode, speakerCount: statusData.speakerCount }
                  : h
              ));
              setResult({
                audioUrl: statusData.audioUrl,
                durationSeconds: statusData.durationSeconds,
                transcribedText: statusData.transcribedText,
                translatedText: statusData.translatedText,
                targetLanguageName: statusData.targetLanguageName,
                charCost: statusData.creditsUsed,
              });
              // Reset multi-speaker preview state after successful translation
              if (speakerMode === "multi") {
                setUtterances(null);
                setSpeakerCount(null);
                setPreviewFileKey(null);
                setVoiceAssignments({});
                setSpeakerPreviews({});
              }
              onGenerated();
              resolve();
            } else if (statusData.status === "error") {
              clearInterval(interval);
              setHistoryTasks(prev => prev.map(h =>
                h.id === taskId
                  ? { ...h, status: "error", errorMessage: statusData.errorMessage }
                  : h
              ));
              reject(new Error(statusData.errorMessage || "Error en traducción"));
            }
          } catch (e) {
            clearInterval(interval);
            reject(e);
          }
        }, POLL_INTERVAL);
      });

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
    <div style={{ width: "100%" }}>
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-white">{t.translate.title}</h1>
          {new Date() < new Date('2026-09-10') && (
            <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", padding: "2px 8px", borderRadius: "6px", background: "#2a2a2a", color: "#9ca3af" }}>
              NUEVO
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: "#888888" }}>
          {t.translate.subtitle}
        </p>

        {plan === "free" && (
          isFreeExhausted ? (
            <div className="mt-4 p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-sm" style={{ color: "#f87171" }}>{t.translate.freeLimitExhausted}</p>
              <button onClick={onBilling} style={{ padding: "6px 14px", borderRadius: "8px", background: "#ffffff", color: "#000000", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}>{t.translate.seePlans}</button>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="text-xs" style={{ color: "#4a6fa8" }}>{t.translate.freeRemaining.replace('{used}', String(FREE_LIMIT - freeRemaining)).replace('{total}', String(FREE_LIMIT))}</p>
            </div>
          )
        )}

      </div>

      <div className="space-y-4">

          {/* Speaker mode toggle */}
          <div className="flex p-0.5 rounded-lg gap-0.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            {/* Single speaker — fully clickeable */}
            <button
              onClick={() => {
                setSpeakerMode("single");
                setSpeakersExpected("auto");
                setUtterances(null);
                setSpeakerCount(null);
                setPreviewFileKey(null);
                setAnalyzeStep(0);
                setVoiceAssignments({});
                setSpeakerPreviews({});
                setError(null);
              }}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all"
              style={{ background: speakerMode === "single" ? "#1e1e1e" : "transparent", color: speakerMode === "single" ? "#e5e7eb" : "#666", border: "none", cursor: "pointer" }}
            >
              Un hablante
            </button>
            {/* Multi-speaker — BETA */}
            <button
              onClick={() => setSpeakerMode('multi')}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: "transparent", color: "#666", border: "none" }}
            >
              Múltiples hablantes
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                BETA
              </span>
            </button>
          </div>

          {/* Upload bar */}
          <div
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "10px", padding: "12px 16px", border: `1px solid ${dragging ? "rgba(255,255,255,0.2)" : "#222"}`, transition: "border-color 0.15s" }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            {file ? (
              <div className="flex items-center gap-3">
                <FileAudio size={15} style={{ color: "#a78bfa", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  {fileDuration != null && (
                    <p className="text-xs" style={{ color: "#666" }}>{fmtSec(Math.round(fileDuration))}</p>
                  )}
                </div>
                <button
                  onClick={() => { setFile(null); setFileDuration(null); setResult(null); }}
                  style={{ color: "#555", background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="flex-1 text-sm truncate" style={{ color: dragging ? "#aaa" : "#555" }}>
                  {dragging ? t.translate.dropHere : "Arrastra un archivo o haz clic para subir"}
                </p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "#bbb" }}
                >
                  <Upload size={11} /> {t.translate.chooseFile}
                </button>
                <button
                  onClick={toggleRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                  style={{
                    background: recording ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${recording ? "rgba(239,68,68,0.4)" : "#333"}`,
                    color: recording ? "#f87171" : "#bbb",
                  }}
                >
                  {recording
                    ? <><Square size={10} style={{ fill: "#f87171" }} /> {fmtSec(recordingTime)}</>
                    : <><Mic size={11} /> {t.translate.record}</>
                  }
                </button>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          {/* Language selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555", letterSpacing: "0.06em" }}>{t.translate.targetLang}</p>
            <div className="relative">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  padding: "10px 36px 10px 14px",
                  color: "#e5e7eb",
                  fontSize: "14px",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  outline: "none",
                }}
              >
                {TRANSLATE_LANGS.map((lang) => (
                  <option key={lang.code} value={lang.code} style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
                    {TRANSLATE_LANG_LABELS[lang.code] ?? lang.label}
                  </option>
                ))}
              </select>
              <svg style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#555" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>

          {/* Voice section — hidden in multi-speaker mode */}
          {speakerMode === "multi" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", color: "#9ca3af" }}>
              <span style={{ color: "#a78bfa", flexShrink: 0 }}>★</span>
              <span>En modo multi-hablante la voz se extrae directamente del audio original — no es necesario seleccionar un modelo de voz.</span>
            </div>
          )}

          {/* Speaker count selector — only shown in multi-speaker mode */}
          {speakerMode === "multi" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#555", letterSpacing: "0.06em" }}>Número de hablantes</label>
              <div style={{ position: "relative" }}>
                <select
                  value={speakersExpected}
                  onChange={(e) => setSpeakersExpected(e.target.value)}
                  style={{
                    width: "100%",
                    appearance: "none",
                    WebkitAppearance: "none",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: "10px",
                    padding: "8px 36px 8px 12px",
                    color: "#e5e7eb",
                    fontSize: "13px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="auto">Detectar automáticamente</option>
                  <option value="2">2 hablantes</option>
                  <option value="3">3 hablantes</option>
                  <option value="4">4 hablantes</option>
                  <option value="5">5 hablantes</option>
                  <option value="6">6 hablantes</option>
                </select>
                <svg style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#555" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 }}>Si conoces el número exacto, especificarlo mejora la precisión</p>
            </div>
          )}
          {speakerMode === "single" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555", letterSpacing: "0.06em" }}>{t.translate.voiceForAudio}</p>
            <div className="flex p-0.5 rounded-lg gap-0.5 mb-2.5" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {(["model", "reference"] as const).map((subTab) => (
                <button
                  key={subTab}
                  onClick={() => setVoiceSubTab(subTab)}
                  className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all"
                  style={{ background: voiceSubTab === subTab ? "#1e1e1e" : "transparent", color: voiceSubTab === subTab ? "#e5e7eb" : "#555", border: "none", cursor: "pointer" }}
                >
                  {subTab === "model" ? t.translate.selectModel : t.translate.uploadReference}
                </button>
              ))}
            </div>

            {voiceSubTab === "model" ? (
              <button
                onClick={() => setShowBrowser(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all hover:border-white/20"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Mic size={12} style={{ color: "#888" }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedVoice?.name ?? t.translate.defaultVoice}</p>
                  <p className="text-xs" style={{ color: "#555" }}>{selectedVoice?.isCloned ? t.generate.clonedVoice : t.generate.systemVoice}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "#444" }}>→</span>
              </button>
            ) : (
              <div>
                {referenceFile ? (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <Mic2 size={14} style={{ color: "#a78bfa", flexShrink: 0 }} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{referenceFile.name}</p>
                      <p className="text-xs" style={{ color: "#555" }}>{(referenceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={() => setReferenceFile(null)} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => refInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 px-4 py-5 rounded-xl cursor-pointer transition-all hover:border-white/15"
                    style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px dashed rgba(255,255,255,0.08)" }}
                  >
                    <Mic2 size={18} style={{ color: "#444" }} />
                    <p className="text-sm" style={{ color: "#666" }}>{t.translate.uploadVoiceRef}</p>
                    <p className="text-xs" style={{ color: "#444" }}>{t.translate.refFormats}</p>
                  </div>
                )}
                <input ref={refInputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setReferenceFile(f); e.target.value = ""; }} />
              </div>
            )}
          </div>
          )}

          {/* Multi-speaker preview — AssemblyAI utterances with speaker colors */}
          {speakerMode === "multi" && utterances && utterances.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#a78bfa" }} />
                <p className="text-sm font-semibold text-white">
                  Se detectaron {speakerCount ?? [...new Set(utterances.map(u => u.speaker))].length} hablante{(speakerCount ?? 0) !== 1 ? "s" : ""}
                </p>
                <span className="text-[10px] ml-1" style={{ color: "#555" }}>{utterances.length} segmentos</span>
              </div>
              {utterances[0]?.translatedText !== undefined && (
                <p className="text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.30)" }}>
                  <Edit3 className="w-3 h-3" />
                  Puedes editar la traducción antes de generar el audio
                </p>
              )}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                {(() => {
                  const speakerOrder = [...new Set(utterances.map(u => u.speaker))].sort();
                  return utterances.map((u, i) => {
                    const colorIdx = speakerOrder.indexOf(u.speaker);
                    const color = SPEAKER_COLORS[colorIdx % SPEAKER_COLORS.length];
                    const startSec = Math.floor(u.start / 1000);
                    const mm = Math.floor(startSec / 60);
                    const ss = String(startSec % 60).padStart(2, "0");
                    const endSec = Math.floor(u.end / 1000);
                    if (u.translatedText !== undefined) {
                      return (
                        <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1" style={{ background: color.bg, color: color.label }}>
                            {u.speaker}
                          </div>
                          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                              {mm}:{ss} — {Math.floor(endSec / 60)}:{String(endSec % 60).padStart(2, "0")}
                            </span>
                            <textarea
                              value={u.translatedText}
                              onChange={(e) => {
                                const updated = [...utterances];
                                updated[i] = { ...updated[i], translatedText: e.target.value };
                                setUtterances(updated);
                              }}
                              rows={Math.max(2, Math.ceil(u.translatedText.length / 60))}
                              className="w-full bg-transparent text-white text-sm resize-none focus:outline-none rounded-lg px-2 py-1 transition-colors border border-transparent focus:border-white/10 focus:bg-white/5"
                              style={{ color: "#e5e7eb" }}
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="rounded-lg px-2.5 py-1.5 flex gap-2 items-start" style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                        <span className="text-[10px] font-bold flex-shrink-0 mt-0.5 w-4 text-center" style={{ color: color.label }}>{u.speaker}</span>
                        <span className="text-xs leading-relaxed flex-1" style={{ color: "#d1d5db" }}>{u.text.length > 150 ? u.text.slice(0, 150) + "…" : u.text}</span>
                        {u.start > 0 && <span className="text-[10px] flex-shrink-0 mt-0.5 font-mono" style={{ color: "#555" }}>{mm}:{ss}</span>}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Voice assignments for multi-speaker */}
          {speakerMode === "multi" && utterances && utterances.length > 0 && (() => {
            const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))].sort();
            const avatarColors = ["#a78bfa", "#60a5fa", "#4ade80", "#fb923c"];
            return (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-white/40 flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  Selecciona una voz para cada hablante
                </p>
                {uniqueSpeakers.map((speaker, idx) => {
                  const color = avatarColors[idx % avatarColors.length];
                  const segmentCount = utterances.filter(u => u.speaker === speaker).length;
                  const hasPreview = speakerPreviews[speaker];
                  const assignedVoice = voiceAssignments[speaker];
                  return (
                    <div
                      key={speaker}
                      className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] flex items-center gap-4 px-4 py-3.5 transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: `${color}20`,
                          border: `1px solid ${color}40`,
                          color: color,
                        }}
                      >
                        {speaker}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 font-medium text-[13.5px]">Hablante {speaker}</p>
                        <p className="text-white/35 text-[11.5px]">{segmentCount} segmentos</p>
                      </div>

                      {/* Audio preview or placeholder */}
                      {hasPreview ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
                            onClick={(e) => {
                              const audio = e.currentTarget.nextElementSibling?.querySelector("audio") as HTMLAudioElement | null;
                              if (audio) {
                                if (audio.paused) audio.play();
                                else audio.pause();
                              }
                            }}
                          >
                            <Play className="w-3 h-3 text-white/60 ml-0.5" />
                          </button>
                          <div className="hidden">
                            <audio src={speakerPreviews[speaker]} preload="metadata" />
                          </div>
                          <span className="text-[11px] text-white/30 font-mono tabular-nums">0:03</span>
                        </div>
                      ) : (
                        <span className="text-white/20 italic text-[11.5px] flex-shrink-0">Sin muestra de audio</span>
                      )}

                      {/* Voice assignment button */}
                      <button
                        onClick={() => {
                          setSelectingVoiceForSpeaker(speaker);
                          setShowBrowser(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                          assignedVoice
                            ? "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                            : "bg-white/[0.04] border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                        }`}
                      >
                        <Mic2 className="w-3 h-3" />
                        <span className="max-w-[120px] truncate">
                          {assignedVoice ? assignedVoice.name : "Seleccionar voz"}
                        </span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Cost note */}
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#555" }}>
            <span className="flex-shrink-0 mt-0.5" style={{ color: "#888" }}>ℹ</span>
            <span>{(speakerMode === "multi" ? t.translate.costNoteMulti : t.translate.costNote).replace('{pct}', plan === "enterprise" ? "10%" : speakerMode === "multi" ? "60%" : "20%")}</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Multi-speaker 4-step progress stepper */}
            {speakerMode === "multi" && (loading || previewLoading) && (
              <div className="w-full rounded-3xl border border-white/[0.06] bg-white/[0.015] p-6 mb-3">
                <div className="flex items-center justify-between mb-4">
                  {(["Subiendo", "Detectando", "Traduciendo", "Generando"] as const).map((step, i) => {
                    const isAnalyze = previewLoading;
                    const isTranslate = loading;
                    // analyzeStep: 1=uploading(i=0), 2=detecting(i=1), 3=translating(i=2)
                    const done = isAnalyze
                      ? (analyzeStep > i + 1)
                      : isTranslate ? i < 3 : false;
                    const active = isAnalyze
                      ? (analyzeStep === i + 1)
                      : isTranslate
                        ? (i === 3)
                        : false;
                    const pending = !done && !active;
                    const icons = [Upload, ScanSearch, Languages, Sparkles];
                    const Icon = icons[i];
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="relative">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                done
                                  ? "bg-blue-500"
                                  : active
                                  ? "bg-blue-500/10 border border-blue-500"
                                  : "bg-white/[0.02] border border-white/10"
                              }`}
                            >
                              {done ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : (
                                <Icon className={`w-4 h-4 ${active ? "text-blue-400" : "text-white/20"}`} />
                              )}
                            </div>
                            {active && (
                              <span className="absolute inset-0 rounded-full border border-blue-500/40 animate-ping" />
                            )}
                          </div>
                          <span
                            className={`text-[11px] transition-colors duration-300 ${
                              done ? "text-white/70" : active ? "text-blue-400 font-medium" : "text-white/25"
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                        {i < 3 && (
                          <div className="flex-1 h-px bg-white/[0.06] mx-2 relative top-[-16px]">
                            <div
                              className="h-full bg-blue-500 transition-all duration-700"
                              style={{ width: done ? "100%" : "0%" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {stepLabel && (
                  <div className="flex items-center justify-center gap-2 text-[12px] text-white/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {stepLabel}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleTranslate}
              disabled={(() => {
                if (!file || loading || previewLoading || isFreeExhausted) return true;
                // For multi-speaker with utterances, require all voices assigned
                if (speakerMode === "multi" && utterances && utterances.length > 0) {
                  const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];
                  const allVoicesAssigned = uniqueSpeakers.every(s => voiceAssignments[s]);
                  return !allVoicesAssigned;
                }
                return false;
              })()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-black text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: "#ffffff", boxShadow: (loading || previewLoading || !file) ? "none" : "0 4px 20px rgba(255,255,255,0.12)" }}
            >
              {(loading || previewLoading) ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {stepLabel ?? t.translate.starting}
                </>
              ) : speakerMode === "multi" && !utterances ? (
                <>Analizar hablantes →</>
              ) : speakerMode === "multi" && utterances ? (
                (() => {
                  const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))];
                  const assignedCount = uniqueSpeakers.filter(s => voiceAssignments[s]).length;
                  const missingCount = uniqueSpeakers.length - assignedCount;
                  if (missingCount > 0) {
                    return <>Selecciona voz para {missingCount} hablante{missingCount > 1 ? "s" : ""} más</>;
                  }
                  return <>Traducir y generar audio →</>;
                })()
              ) : (
                <>Traducir →</>
              )}
            </button>
            {file && !loading && !previewLoading && (
              <p className="text-xs" style={{ color: "#444" }}>
                {fileDuration != null ? `~${fmtSec(Math.round(fileDuration))} · ` : ""}créditos calculados al traducir
              </p>
            )}
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
              {t.translate.autoDelete.replace('{n}', String(TRANSLATE_RETENTION[plan] ?? 3))}
            </p>
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-2xl border p-6 space-y-5" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.12)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80" }} />
                <p className="text-sm font-semibold text-white">Audio traducido al {result.targetLanguageName}</p>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ color: "#888888", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {result.charCost.toLocaleString("es-ES")} créditos · {result.durationSeconds.toFixed(1)}s
                </span>
              </div>
              <audio
                ref={translationAudioRef}
                src={result.audioUrl}
                onPlay={() => setIsTranslationPlaying(true)}
                onPause={() => setIsTranslationPlaying(false)}
                onEnded={() => { setIsTranslationPlaying(false); setTranslationCurrentTime(0); }}
                onTimeUpdate={() => setTranslationCurrentTime(translationAudioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setTranslationDuration(translationAudioRef.current?.duration ?? 0)}
                className="hidden"
              />
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => {
                    if (translationAudioRef.current?.paused) {
                      translationAudioRef.current.play()
                    } else {
                      translationAudioRef.current?.pause()
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors flex-shrink-0"
                >
                  {isTranslationPlaying ? (
                    <Pause className="w-3.5 h-3.5 text-black" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-black ml-0.5" />
                  )}
                </button>
                <div
                  className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative"
                  onClick={e => {
                    if (!translationAudioRef.current) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const pct = (e.clientX - rect.left) / rect.width
                    translationAudioRef.current.currentTime = pct * (translationAudioRef.current.duration || 0)
                  }}
                >
                  <div
                    className="h-full bg-white/70 rounded-full transition-all group-hover:bg-white"
                    style={{ width: `${translationDuration ? (translationCurrentTime / translationDuration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[11px] text-white/30 font-mono flex-shrink-0 tabular-nums">
                  {fmtSec(Math.floor(translationCurrentTime))} / {fmtSec(Math.floor(translationDuration))}
                </span>
                <button
                  onClick={() => downloadAudio(result.audioUrl, `traduccion-${result.targetLanguageName.toLowerCase()}.mp3`)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] text-white/30 hover:text-white transition-colors flex-shrink-0"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  title="Descargar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555" }}>Transcripción (español)</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{result.transcribedText}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#555" }}>Traducción ({result.targetLanguageName})</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{result.translatedText}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Hidden audio for history playback */}
      <audio
        ref={historyAudioRef}
        onPlay={() => setIsHistoryPlaying(true)}
        onPause={() => setIsHistoryPlaying(false)}
        onEnded={() => { setIsHistoryPlaying(false); setActiveTranslationId(null); }}
        className="hidden"
      />

      {/* ── Traducciones recientes ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "#888" }}>Traducciones recientes</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#444444", pointerEvents: "none" }} />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={t.translate.searchPlaceholder}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", color: "#e5e7eb", width: "180px" }}
              />
            </div>
            <button onClick={fetchHistory} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#888888", background: "transparent", cursor: "pointer" }}>
              <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: "64px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Globe size={32} style={{ color: "rgba(255,255,255,0.08)", marginBottom: "12px" }} />
            <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
              {historySearch ? "No se encontraron traducciones" : "Sin traducciones aún"}
            </p>
            {!historySearch && <p className="text-xs mt-1" style={{ color: "#444444" }}>Las traducciones que realices aparecerán aquí</p>}
          </div>
        ) : (
          <div>
            {groupTranslationsByDate(filteredHistory).map((group, gi) => (
              <div key={group.label}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", marginTop: gi === 0 ? "0" : "20px" }}>
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((task: TTranslateTask) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 rounded-xl border transition-all cursor-default ${
                        activeTranslationId === task.id
                          ? 'border-white/20 bg-white/[0.06]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                      }`}
                      style={{ padding: "12px 16px" }}
                    >
                      {/* Language flag */}
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>
                        {getLanguageFlag(task.targetLanguage)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
                            {getTranslateDisplayName(task)}
                          </span>
                          {task.speakerMode === "multi" && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                              {task.speakerCount ? `${task.speakerCount} hablantes` : "Multi"}
                            </span>
                          )}
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400'
                            : task.status === 'error' ? 'bg-red-500/10 text-red-400'
                            : task.status === 'expired' ? 'bg-white/5 text-white/20'
                            : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${
                              task.status === 'completed' ? 'bg-emerald-400'
                              : task.status === 'error' ? 'bg-red-400'
                              : task.status === 'expired' ? 'bg-white/20'
                              : 'bg-amber-400 animate-pulse'
                            }`} />
                            {task.status === 'completed' ? 'Completado'
                             : task.status === 'error' ? 'Error'
                             : task.status === 'expired' ? 'Expirado'
                             : 'Procesando'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          <span>{task.targetLanguageName || getLanguageName(task.targetLanguage)}</span>
                          <span>·</span>
                          <span>{task.createdAt ? new Date(task.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                          {task.durationSeconds && (
                            <>
                              <span>·</span>
                              <span>{Math.floor(task.durationSeconds / 60)}:{String(Math.floor(task.durationSeconds % 60)).padStart(2, '0')}</span>
                            </>
                          )}
                          {task.expiresAt && new Date(task.expiresAt) > new Date() && (
                            <>
                              <span>·</span>
                              <span style={{ color: "rgba(255,255,255,0.20)" }}>
                                Expira en {Math.ceil((new Date(task.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
                              </span>
                            </>
                          )}
                        </div>
                        {task.status === 'error' && task.errorMessage && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(239,68,68,0.7)" }}>{task.errorMessage}</p>
                        )}
                      </div>

                      {/* Progress bar when playing */}
                      {activeTranslationId === task.id && task.audioUrl && (
                        <div
                          className="flex-shrink-0 h-1 rounded-full cursor-pointer"
                          style={{ width: "80px", background: "rgba(255,255,255,0.1)" }}
                          onClick={e => {
                            if (!historyAudioRef.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            historyAudioRef.current.currentTime = pct * (historyAudioRef.current.duration || 0);
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: "rgba(255,255,255,0.5)",
                              width: historyAudioRef.current?.duration
                                ? `${(historyAudioRef.current.currentTime / historyAudioRef.current.duration) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.status === 'processing' && (
                          <div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg className="animate-spin" style={{ width: "14px", height: "14px", color: "#f59e0b" }} fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        )}
                        {task.audioUrl && task.status === 'completed' && (
                          <>
                            <button
                              onClick={() => {
                                if (!historyAudioRef.current) return;
                                if (activeTranslationId === task.id && isHistoryPlaying) {
                                  historyAudioRef.current.pause();
                                  setIsHistoryPlaying(false);
                                  setActiveTranslationId(null);
                                } else {
                                  historyAudioRef.current.src = task.audioUrl!;
                                  historyAudioRef.current.play();
                                  setActiveTranslationId(task.id);
                                }
                              }}
                              style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", transition: "all 0.15s" }}
                              className="hover:bg-white/[0.08] hover:text-white"
                            >
                              {activeTranslationId === task.id && isHistoryPlaying
                                ? <Pause style={{ width: "14px", height: "14px" }} />
                                : <Play style={{ width: "14px", height: "14px", marginLeft: "1px" }} />}
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); downloadAudio(task.audioUrl!, `${getTranslateDisplayName(task).replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s·-]/g, '').trim()}-${task.targetLanguage}.mp3`); }}
                              style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", transition: "all 0.15s" }}
                              className="hover:bg-white/[0.08] hover:text-white"
                            >
                              <Download style={{ width: "14px", height: "14px" }} />
                            </button>
                          </>
                        )}
                        {task.status === 'expired' && (
                          <span className="text-xs px-2" style={{ color: "rgba(255,255,255,0.20)" }}>Expirado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBrowser && (
        <VoiceBrowser
          clonedVoices={clonedVoices}
          onSelect={(voice) => {
            // If selecting voice for a speaker, assign it to that speaker
            if (selectingVoiceForSpeaker) {
              setVoiceAssignments(prev => ({
                ...prev,
                [selectingVoiceForSpeaker]: {
                  id: voice?.referenceId ?? "",
                  name: voice?.name ?? "Unknown"
                }
              }));
              setSelectingVoiceForSpeaker(null);
              setShowBrowser(false);
              return;
            }
            // Otherwise, normal voice selection
            onVoiceChange(voice);
          }}
          onClose={() => {
            setShowBrowser(false);
            setSelectingVoiceForSpeaker(null);
          }}
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
  const { t } = useLang();
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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>{t.transcribe.title}</h2>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#bbbbbb", border: "1px solid rgba(255,255,255,0.20)" }}>
            BETA
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          {t.transcribe.subtitle}
        </p>
      </div>

      {/* Free plan banner */}
      {plan === "free" && (isFreeExhausted ? (
        <div style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{t.transcribe.freeLimitExhausted}</p>
          <button onClick={onBilling} style={{ padding: "5px 12px", borderRadius: 7, background: "#ffffff", color: "#000000", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}>{t.transcribe.seePlans}</button>
        </div>
      ) : (
        <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ fontSize: 12, color: "#4a6fa8", margin: 0 }}>
            {t.transcribe.freeRemaining.replace('{remaining}', String(Math.max(0, FREE_LIMIT - transcriptionUsed))).replace('{total}', String(FREE_LIMIT))}
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
            placeholder={t.transcribe.searchPlaceholder}
            style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#d1d5db", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={() => { if (!isFreeExhausted) setShowCreate(true); else onBilling(); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, background: "#ffffff", color: "#000000", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 10px rgba(255,255,255,0.08)" }}
        >
          {t.transcribe.createTask}
        </button>
        <button onClick={fetchTasks} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: "#9ca3af", cursor: "pointer", flexShrink: 0 }} title="Actualizar">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={thStyle}>{t.transcribe.colFile}</th>
              <th style={thStyle}>{t.transcribe.colUpdated}</th>
              <th style={thStyle}>{t.transcribe.colStatus}</th>
              <th style={thStyle}>{t.transcribe.colCredits}</th>
              <th style={thStyle}>{t.transcribe.colSpeakers}</th>
              <th style={thStyle}>{t.transcribe.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {loadingTasks ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <td key={j} style={tdStyle}>
                      <div style={{ height: 14, borderRadius: 4, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", animation: "pulse 2s infinite", width: j === 1 ? "70%" : "40%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: "48px 16px", color: "#444444" }}>
                  <FileAudio size={32} style={{ margin: "0 auto 10px", color: "rgba(255,255,255,0.08)" }} />
                  <p style={{ margin: 0, fontWeight: 500, color: "#666666" }}>{search ? t.transcribe.noResults : t.transcribe.noTasks}</p>
                  {!search && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{t.transcribe.noTasksHint}</p>}
                </td>
              </tr>
            ) : (
              filtered.map((task, idx) => {
                const isRemoving = removingId === task.id;
                const rowBg = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                const statusBadge = task.status === "completed"
                  ? { label: t.transcribe.statusCompleted, bg: "rgba(74,222,128,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.25)" }
                  : task.status === "processing"
                  ? { label: t.transcribe.statusProcessing, bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" }
                  : { label: t.transcribe.statusError, bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)" };

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
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                            <Type size={11} /> {t.transcribe.openViewer}
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
                          title={t.transcribe.deleteTitle}
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
          <div style={{ width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{t.transcribe.createTaskTitle}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{t.transcribe.modalSubtitle}</p>
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
                style={{ border: `2px dashed ${dragging ? "#ffffff" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(255,255,255,0.03)" : "#000000", transition: "all 0.15s" }}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.flac,.mp4,.mov,.webm,audio/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {file ? (
                  <div>
                    <FileAudio size={24} style={{ color: "#ffffff", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#e5e7eb" }}>{file.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {fileDuration !== null && ` · ${fmtDur(fileDuration)}`}
                      {" · "}<button onClick={(ev) => { ev.stopPropagation(); setFile(null); setFileDuration(null); }} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: 12, padding: 0 }}>{t.transcribe.changeFile}</button>
                    </p>
                  </div>
                ) : (
                  <>
                    <FileAudio size={28} style={{ color: "#444444", margin: "0 auto 10px" }} />
                    <p style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>{t.transcribe.dropZoneHint}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#444444" }}>{t.transcribe.dropZoneFormats}</p>
                  </>
                )}
              </div>

              {/* Speakers */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>{t.transcribe.speakersLabel}</label>
                <CustomSelect
                  options={[
                    { value: "auto", label: t.transcribe.speakerAuto },
                    { value: "1", label: t.transcribe.speaker1 },
                    { value: "2", label: t.transcribe.speaker2 },
                    { value: "3", label: t.transcribe.speaker3 },
                    { value: "4+", label: t.transcribe.speaker4 },
                  ]}
                  value={speakers}
                  onChange={setSpeakers}
                />
              </div>

              {/* Info */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span style={{ color: "#ffffff", fontSize: 13, flexShrink: 0, marginTop: 1 }}>ℹ</span>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                  {t.transcribe.infoNote}
                  {fileDuration !== null && t.transcribe.infoNoteDuration.replace('{dur}', fmtDur(fileDuration))}
                </p>
              </div>

              {createError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13 }}>
                  {createError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowCreate(false); setFile(null); setCreateError(null); }} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  {t.transcribe.cancelBtn}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!file || creating}
                  style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, background: "#ffffff", color: "#000000", fontSize: 13, fontWeight: 600, border: "none", cursor: !file || creating ? "not-allowed" : "pointer", opacity: !file || creating ? 0.6 : 1, boxShadow: !file || creating ? "none" : "0 2px 10px rgba(255,255,255,0.08)" }}
                >
                  {creating ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> {t.transcribe.transcribing}</>
                  ) : (
                    <><FileAudio size={14} /> {t.transcribe.createTaskBtn}</>
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
          <div style={{ width: "100%", maxWidth: 620, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
            <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <button
                onClick={() => { if (!viewerTask.transcriptionText) return; navigator.clipboard.writeText(viewerTask.transcriptionText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)", color: copied ? "#4ade80" : "#aaaaaa", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.20)"}`, cursor: "pointer" }}
              >
                <Copy size={12} />{copied ? t.transcribe.copied : t.transcribe.copyText}
              </button>
              <button
                onClick={() => handleDownload(viewerTask)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
              >
                <Download size={12} /> {t.transcribe.downloadTxt}
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

  const inputSt = { background: "#000000", border: "1px solid rgba(255,255,255,0.12)", color: "#e5e7eb", borderRadius: "10px", padding: "10px 14px", width: "100%", fontSize: "14px", outline: "none" };
  const labelSt = { display: "block", fontSize: "12px", fontWeight: 600 as const, color: "#888888", marginBottom: "6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", width: "100%", maxWidth: "420px", padding: "28px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "18px", lineHeight: 1 }}>✕</button>

        <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>Retirar en efectivo</h2>
        <p style={{ color: "#888888", fontSize: "13px", margin: "0 0 20px" }}>
          Saldo disponible: <strong style={{ color: "#4ade80" }}>${maxAmount.toFixed(2)}</strong> · Mín. $20
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Method toggle */}
          <div>
            <label style={labelSt}>Método de pago</label>
            <div style={{ position: "relative", background: "#000000", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "3px", display: "flex" }}>
              <div style={{ position: "absolute", top: "3px", left: "3px", width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: "5px", transition: "transform 0.2s ease", transform: `translateX(${method === "transfer" ? "100%" : "0%"})`, border: "1px solid rgba(255,255,255,0.12)" }} />
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
  const { t } = useLang();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralBalance, setReferralBalance] = useState(0);
  const [referralEarned, setReferralEarned] = useState(0);
  const [referralPending, setReferralPending] = useState(0);
  const [referralSignups, setReferralSignups] = useState(0);
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
      setReferralPending(data.referralPending ?? 0);
      setReferralSignups(data.referralCount ?? 0);
      setCanWithdraw(data.canWithdraw ?? false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const referralLink = referralCode ? `https://www.elitelabs.es/?ref=${referralCode}` : "";

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
        setRedeemMsg({ ok: true, text: `¡${plan?.chars.toLocaleString()} caracteres añadidos!` });
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
    background: active ? "rgba(255,255,255,0.06)" : "transparent",
    border: `1px solid ${active ? "#3a3a5e" : "rgba(255,255,255,0.08)"}`,
    color: active ? "#e5e7eb" : "#9ca3af",
    transition: "all 0.15s",
  });

  return (
    <div style={{ maxWidth: "100%", width: "100%" }}>
      {showWithdrawModal && (
        <WithdrawModal
          balance={referralBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setWithdrawMsg(t.referral.withdrawalSuccess);
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
      <div style={{ paddingBottom: 36, marginBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

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
              <div style={{ flex: 1, padding: "9px 14px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", fontSize: 13, fontFamily: "monospace", color: "#aaaaaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {loading ? "—" : (referralLink || "—")}
              </div>
              <button
                onClick={handleCopy}
                disabled={!referralLink}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
                  borderRadius: 10, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.12)",
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
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#888888" }}>Disponible para canjear</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", lineHeight: 1 }}>
                  {loading ? <span style={{ color: "#444444" }}>—</span> : centsToUSD(referralBalance)}
                </p>
              </div>
              <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#888888" }}>Pendiente</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>
                  {loading ? <span style={{ color: "#444444" }}>—</span> : centsToUSD(referralPending)}
                </p>
                <p style={{ fontSize: 10, color: "#555555", marginTop: 3 }}>Disponible en 7 días si no hay reembolso</p>
              </div>
              <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: "#888888", marginBottom: 4 }}>Créditos Totales Ganados</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {loading ? <span style={{ color: "#444444" }}>—</span> : centsToUSD(referralEarned)}
                </p>
              </div>
              <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: "#888888", marginBottom: 4 }}>Registrados con tu enlace</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {loading ? <span style={{ color: "#444444" }}>—</span> : referralSignups}
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
              <div style={{ marginTop: 8, padding: "14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", marginBottom: 8 }}>
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
                          : { background: "transparent", color: "#6b7280", border: "1px solid rgba(255,255,255,0.12)" }),
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
              <div style={{ marginTop: 8, padding: "14px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
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
                          : { background: "transparent", color: "#6b7280", border: "1px solid rgba(255,255,255,0.12)" }),
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
                {[1, 2].map(i => <div key={i} style={{ height: 48, borderRadius: 10, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />)}
              </div>
            ) : referrals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Gift size={24} style={{ color: "rgba(255,255,255,0.08)", marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: "#6b7280" }}>Aún no tienes referidos</p>
                <p style={{ fontSize: 12, color: "#444444", marginTop: 4 }}>Comparte tu enlace y empieza a ganar</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {referrals.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
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

type TeamSubTab = "Miembros" | "Uso" | "Planes" | "Facturación";

function TeamTab({
  plan = "free",
  credits = 0,
  extraCredits = 0,
  nextRenewalDate,
  onNavigateToBilling,
}: {
  plan?: string;
  credits?: number | null;
  extraCredits?: number;
  nextRenewalDate?: string | null;
  onNavigateToBilling?: () => void;
}) {
  const { t } = useLang();
  const BILLING_PLANS = getBillingPlans(t);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<TeamSubTab>("Miembros");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [invoices, setInvoices] = useState<{ id: string; date: number; amount: number; currency: string; status: string | null; pdfUrl: string | null }[]>([]);
  const [invoicePm, setInvoicePm] = useState<{ brand: string; last4: string } | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const router = useRouter();
  const [teamDiscount, setTeamDiscount] = useState<{ percentage: number; label: string } | null>(null);
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)affiliate_discount=([^;]*)/);
    if (!m) return;
    try { const d = JSON.parse(decodeURIComponent(m[1])); if (d?.percentage > 0) setTeamDiscount(d); } catch {}
  }, []);

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

  useEffect(() => {
    if (activeSubTab !== "Facturación") return;
    setInvoicesLoading(true);
    Promise.all([
      fetch("/api/billing/invoices").then((r) => r.json()),
      fetch("/api/billing/payment-methods").then((r) => r.json()),
    ]).then(([invData, pmData]) => {
      setInvoices(invData.invoices ?? []);
      const methods: { brand: string; last4: string; isDefault: boolean }[] = pmData.paymentMethods ?? [];
      setInvoicePm(methods.find((m) => m.isDefault) ?? methods[0] ?? null);
    }).catch(() => {}).finally(() => setInvoicesLoading(false));
  }, [activeSubTab]);

  async function openPortal() {
    const res = await fetch("/api/create-portal-session", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

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

  async function handleInvite(email: string): Promise<boolean> {
    if (!email.trim()) return false;
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash("error", data.error); return false; }
      setTeam((t) => t ? { ...t, members: [...t.members, data.member] } : t);
      setPercentages((p) => ({ ...p, [data.member.id]: 0 }));
      flash("success", "Miembro añadido al equipo");
      return true;
    } finally {
      setInviting(false);
    }
  }

  async function handleInviteFromInput() {
    const email = searchQuery.trim();
    if (!email) { setInviteError("Introduce un email para invitar a un miembro"); return; }
    setInviteError(null);
    const ok = await handleInvite(email);
    if (ok) setSearchQuery("");
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

  const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
  const PLAN_MEMBER_LIMITS: Record<string, number> = { free: 2, starter: 5, pro: 10, enterprise: 50 };
  const PLAN_CREDIT_LIMITS: Record<string, number> = { free: 10_000, starter: 100_000, pro: 500_000, enterprise: ENTERPRISE_CREDITS, lifetime: 20_000_000 };

  const memberLimit = PLAN_MEMBER_LIMITS[plan] ?? 5;
  const creditLimit = PLAN_CREDIT_LIMITS[plan] ?? 10_000;
  const totalCredits = (credits ?? 0) + extraCredits;
  const creditPct = Math.min(100, Math.round((totalCredits / creditLimit) * 100));
  const renewalLabel = nextRenewalDate
    ? `Próxima recarga: ${new Date(nextRenewalDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const filteredMembers = team
    ? team.members.filter((m) => {
        const q = searchQuery.toLowerCase();
        return !q || (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      })
    : [];

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <EliteLoader />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-4">
        <div className="rounded-2xl p-8 text-center space-y-3" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Users size={26} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Crear tu equipo</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Crea un equipo para distribuir créditos mensuales entre tus miembros automáticamente.
          </p>
        </div>
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <label className="block text-xs uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            Nombre del equipo
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ej. Equipo de Marketing"
            className="w-full px-4 py-2.5 rounded-lg text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !teamName.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-white text-black disabled:opacity-50"
          >
            {creating ? "Creando..." : "Crear equipo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>

      {/* ── Stats header ── */}
      <div className="px-6 py-5 grid grid-cols-3 gap-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Block 1 — Plan */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Plan actual</p>
          <p className="text-2xl font-bold text-white">{PLAN_LABELS[plan] ?? plan}</p>
          {renewalLabel && <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{renewalLabel}</p>}
        </div>
        {/* Block 2 — Members */}
        <div className="space-y-1 pl-6" style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Miembros</p>
          <p className="text-2xl font-bold text-white">
            {team.members.length}{" "}
            <span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>/ {memberLimit} incluidos</span>
          </p>
          <button
            onClick={onNavigateToBilling}
            className="text-sm underline underline-offset-2 transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Actualizar plan
          </button>
        </div>
        {/* Block 3 — Credits */}
        <div className="space-y-1.5 pl-6" style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Créditos restantes</p>
          <p className="text-2xl font-bold text-white">
            {totalCredits.toLocaleString("es-ES")}{" "}
            <span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>/ {creditLimit.toLocaleString("es-ES")}</span>
          </p>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${creditPct}%` }} />
          </div>
          {renewalLabel && <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{renewalLabel}</p>}
        </div>
      </div>

      {/* ── Sub-tab nav ── */}
      <div className="flex px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {(["Miembros", "Uso", "Planes", "Facturación"] as TeamSubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className="px-1 py-3 text-sm mr-6 transition-colors"
            style={activeSubTab === tab
              ? { color: "#ffffff", borderBottom: "2px solid #ffffff", marginBottom: "-1px" }
              : { color: "rgba(255,255,255,0.4)" }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="p-6 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        {/* ── Miembros tab ── */}
        {activeSubTab === "Miembros" && (
          <>
            {/* Search / invite row */}
            <div className="space-y-1.5">
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" stroke="rgba(255,255,255,0.3)">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); if (inviteError) setInviteError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInviteFromInput(); }}
                    placeholder="Buscar miembro o escribir email para invitar..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${inviteError ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}` }}
                  />
                </div>
                <button
                  disabled={inviting}
                  onClick={handleInviteFromInput}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {inviting ? "Invitando..." : "Invitar miembro"}
                </button>
              </div>
              {inviteError && <p className="text-xs text-red-400 pl-1">{inviteError}</p>}
            </div>

            {/* Members table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["USUARIO", "EMAIL", "ROL", "ESTADO", "ACCIONES"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {searchQuery ? "Sin resultados para esa búsqueda." : "No hay miembros aún. Invita a alguien arriba."}
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-white/10 text-white">
                              {(member.name ?? member.email)[0].toUpperCase()}
                            </div>
                            <span className="text-white font-medium truncate">{member.name ?? member.email.split("@")[0]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.5)" }}>{member.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">Miembro</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Activo</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-500/10"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Danger zone */}
            <div className="rounded-xl p-4 mt-2" style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}>
              <p className="text-sm uppercase tracking-wider mb-3 text-red-400">Zona de peligro</p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Al eliminar el equipo los créditos asignados a los miembros se devolverán a tu cuenta.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Eliminar equipo
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Uso tab ── */}
        {activeSubTab === "Uso" && (
          <>
            {/* Owner row */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 text-white">P</div>
                  <div>
                    <p className="text-sm font-medium text-white">Propietario (tú)</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{ownerPercent}% — {Math.floor(ENTERPRISE_CREDITS * ownerPercent / 100).toLocaleString("es-ES")} créditos</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">Propietario</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full bg-white" style={{ width: `${ownerPercent}%` }} />
              </div>
            </div>

            {team.members.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                Aún no hay miembros. Ve a <button className="text-white underline" onClick={() => setActiveSubTab("Miembros")}>Miembros</button> para invitar.
              </p>
            ) : (
              <>
                {team.members.map((member) => {
                  const pct = percentages[member.id] ?? 0;
                  const chars = Math.floor(ENTERPRISE_CREDITS * pct / 100);
                  return (
                    <div key={member.id} className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 text-white">
                            {(member.name ?? member.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{member.name ?? member.email.split("@")[0]}</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{chars.toLocaleString("es-ES")} créditos / mes</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-white">{pct}%</span>
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
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={pct}
                          onChange={(e) => setPercentages((p) => ({ ...p, [member.id]: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                          className="w-14 px-2 py-1 rounded-lg text-sm text-center text-white focus:outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                {totalAssigned > 100 && (
                  <p className="text-xs font-medium text-center text-red-400">
                    Los porcentajes superan el 100%. Ajústalos antes de guardar.
                  </p>
                )}

                <button
                  onClick={handleSaveDistribution}
                  disabled={saving || totalAssigned > 100}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-white text-black disabled:opacity-50 transition-opacity"
                >
                  {saving ? "Guardando..." : "Guardar distribución"}
                </button>
                <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Los créditos se redistribuyen automáticamente en cada renovación mensual.
                </p>
              </>
            )}
          </>
        )}

        {/* ── Planes tab ── */}
        {activeSubTab === "Planes" && (
          <div className="space-y-5">
            {/* Billing toggle */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-medium">Planes disponibles</p>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {(["monthly", "annual"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                    style={billing === b ? { background: "#ffffff", color: "#000000" } : { color: "rgba(255,255,255,0.5)" }}
                  >
                    {b === "monthly" ? "Mensual" : "Anual −17%"}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan cards — skip free */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {BILLING_PLANS.filter((p) => p.key !== "free").map((p) => {
                const isCurrent = plan === p.key;
                const planBadge = PLAN_BADGE[p.key];
                const monthlyPrice = billing === "annual" && p.price > 0
                  ? Math.round(p.price * 0.83 * 10) / 10
                  : p.price;
                const effectiveMonthly = teamDiscount
                  ? Math.round(monthlyPrice * (1 - teamDiscount.percentage / 100) * 10) / 10
                  : monthlyPrice;
                const borderColor = isCurrent ? (planBadge?.color ?? "#888888") : p.popular ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";

                return (
                  <div
                    key={p.key}
                    style={{
                      borderRadius: "16px",
                      border: `1px solid ${borderColor}`,
                      background: isCurrent ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                      padding: "20px 16px 16px",
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
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "14px", lineHeight: 1.4 }}>{p.description}</p>

                    {/* Discount badge */}
                    {teamDiscount && (
                      <div style={{ display: "inline-block", marginBottom: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                        {teamDiscount.label}
                      </div>
                    )}

                    {/* Price */}
                    <div style={{ marginBottom: "14px" }}>
                      {(billing === "annual" || !!teamDiscount) && (
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", textDecoration: "line-through", lineHeight: 1 }}>${p.price}/mes</p>
                      )}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                        <span style={{ fontSize: "28px", fontWeight: 800, color: teamDiscount ? "#4ade80" : "#fff", lineHeight: 1 }}>${effectiveMonthly}</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginLeft: "2px" }}>/mes</span>
                      </div>
                      {teamDiscount && (
                        <p style={{ fontSize: "10px", color: "#4ade80", marginTop: "2px" }}>{teamDiscount.percentage}% de descuento aplicado</p>
                      )}
                      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{costPer10k(effectiveMonthly, p.characters)}</p>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => {
                        if (isCurrent) return;
                        if (plan !== "free") { openPortal(); return; }
                        router.push(`/checkout/${p.key}?billing=${billing}`);
                      }}
                      disabled={isCurrent}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold mb-4 transition-opacity disabled:cursor-not-allowed"
                      style={isCurrent
                        ? { border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.25)" }
                        : p.popular
                        ? { background: "#ffffff", color: "#000000" }
                        : { border: "1px solid rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.06)", color: "#e5e7eb" }}
                    >
                      {isCurrent ? "Plan actual" : plan !== "free" ? `Cambiar a ${p.name}` : "Suscribirse"}
                    </button>

                    {/* Divider */}
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "12px" }} />

                    {/* Features */}
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                      {p.features.map((f, i) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.75)", paddingTop: "8px", paddingBottom: "8px", borderBottom: i < p.features.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                          <FeatureTick />{f}
                        </li>
                      ))}
                    </ul>

                    {/* Character count footer */}
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                        {p.characters.toLocaleString("es-ES")} caracteres/mes
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Facturación tab ── */}
        {activeSubTab === "Facturación" && (
          <div className="space-y-5">
            {/* Payment method */}
            {invoicePm && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="w-10 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <CreditCard size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium capitalize">{invoicePm.brand} ···· {invoicePm.last4}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Método de pago activo</p>
                </div>
                <button
                  onClick={openPortal}
                  className="ml-auto text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Gestionar
                </button>
              </div>
            )}

            {/* Invoices table */}
            {invoicesLoading ? (
              <div className="py-10 flex justify-center">
                <EliteLoader />
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No hay facturas aún.</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      {["FECHA", "DESCRIPCIÓN", "IMPORTE", "ESTADO", "DESCARGAR"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => {
                      const statusColor = inv.status === "paid" ? { bg: "rgba(74,222,128,0.1)", color: "#4ade80" }
                        : inv.status === "open" ? { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" }
                        : { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" };
                      const statusLabel = inv.status === "paid" ? "Pagada" : inv.status === "open" ? "Pendiente" : inv.status ?? "—";
                      return (
                        <tr key={inv.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: i < invoices.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                          <td className="px-4 py-3 text-white">
                            {new Date(inv.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.6)" }}>Suscripción Elite Labs</td>
                          <td className="px-4 py-3 text-white font-medium">
                            {inv.amount.toLocaleString("es-ES", { style: "currency", currency: inv.currency.toUpperCase() })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: statusColor.bg, color: statusColor.color }}>{statusLabel}</span>
                          </td>
                          <td className="px-4 py-3">
                            {inv.pdfUrl ? (
                              <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                                PDF
                              </a>
                            ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
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
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="text-base font-bold text-white">¿Eliminar el equipo &ldquo;{team.name}&rdquo;?</h3>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Los créditos asignados a los miembros se devolverán automáticamente a tu cuenta. Los miembros perderán acceso inmediatamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingTeam}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deletingTeam}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 bg-red-600 hover:bg-red-700 transition-colors"
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

/* ─── Niche Finder Tab ────────────────────────────────────── */
interface NicheChannelRow {
  id: string;
  ytChannelId: string;
  title: string;
  description?: string | null;
  username?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  format?: string | null;
  outlierScore?: number | null;
  isFaceless?: boolean | null;
  isAiChannel?: boolean | null;
  isMonetized?: boolean | null;
  quality?: string | null;
  tags: string[];
  subscribers?: number | null;
  monthlyRevenue?: number | null;
  monthlyViews?: number | null;
  rpm?: number | null;
  uploadsPerWeek?: number | null;
  avgVideoLength?: number | null;
  totalVideos?: number | null;
  createdAt?: string | null;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M/mo";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K/mo";
  return "$" + n.toFixed(0) + "/mo";
}

function NicheChannelCard({ ch }: { ch: NicheChannelRow }) {
  const [imgError, setImgError] = useState(false);

  const initials = ch.title.slice(0, 2).toUpperCase();
  const hue = ch.ytChannelId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  const outlier = ch.outlierScore ?? 0;
  const outlierColor = outlier >= 3 ? "#a78bfa" : outlier >= 2 ? "#60a5fa" : outlier >= 1 ? "#34d399" : "#6b7280";

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", transition: "border-color 0.15s, background 0.15s", cursor: "default" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      {/* Header: thumbnail + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {ch.thumbnail && !imgError ? (
          <img src={ch.thumbnail} alt={ch.title} onError={() => setImgError(true)}
            style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
        ) : (
          <div style={{ width: "44px", height: "44px", borderRadius: "10px", flexShrink: 0, background: `hsl(${hue},40%,18%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: `hsl(${hue},60%,65%)` }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>{ch.title}</p>
          {ch.username && <p style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{ch.username}</p>}
        </div>
        <a
          href={`https://youtube.com/channel/${ch.ytChannelId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flexShrink: 0, color: "#6b7280", display: "flex", alignItems: "center", padding: "4px" }}
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {ch.category && (
          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(167,139,250,0.1)", color: "#a78bfa", fontWeight: 500 }}>{ch.category}</span>
        )}
        {ch.format && (
          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(96,165,250,0.1)", color: "#60a5fa", fontWeight: 500 }}>{ch.format}</span>
        )}
        {ch.isFaceless && (
          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(52,211,153,0.08)", color: "#34d399", fontWeight: 500 }}>Faceless</span>
        )}
        {ch.isAiChannel && (
          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontWeight: 500 }}>AI</span>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px 10px" }}>
          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>Suscriptores</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{fmtNum(ch.subscribers)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px 10px" }}>
          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>Ingresos/mes</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: ch.monthlyRevenue ? "#34d399" : "#6b7280" }}>{fmtMoney(ch.monthlyRevenue)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px 10px" }}>
          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>Vistas/mes</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{fmtNum(ch.monthlyViews)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "8px 10px" }}>
          <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>RPM</p>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{ch.rpm != null ? `$${ch.rpm.toFixed(2)}` : "—"}</p>
        </div>
      </div>

      {/* Footer: outlier score + uploads */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "13px" }}>⚡</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: outlierColor }}>
            {outlier.toFixed(1)}
          </span>
          <span style={{ fontSize: "10px", color: "#4b5563" }}>outlier</span>
        </div>
        {ch.uploadsPerWeek != null && (
          <span style={{ fontSize: "11px", color: "#6b7280" }}>{ch.uploadsPerWeek.toFixed(1)}x/sem</span>
        )}
        {ch.totalVideos != null && (
          <span style={{ fontSize: "11px", color: "#6b7280" }}>{ch.totalVideos} vídeos</span>
        )}
      </div>
    </div>
  );
}

function NicheFinderTab() {
  const [channels, setChannels] = useState<NicheChannelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("");
  const [sortBy, setSortBy] = useState("outlierScore");
  const [page, setPage] = useState(1);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchChannels(params: { search?: string; category?: string; format?: string; sortBy?: string; page?: number } = {}) {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search: params.search ?? search,
        category: params.category ?? category,
        format: params.format ?? format,
        sortBy: params.sortBy ?? sortBy,
        page: String(params.page ?? page),
      });
      const res = await fetch(`/api/niche-channels?${q}`);
      const data = await res.json();
      setChannels(data.channels ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      if (data.categories?.length) setCategories(data.categories);
      if (data.formats?.length) setFormats(data.formats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchChannels(); }, []);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchChannels({ search: val, page: 1 }), 350);
  }

  function handleFilter(key: string, val: string) {
    const next = { category, format, sortBy, page: 1, [key]: val };
    if (key === "category") setCategory(val);
    if (key === "format") setFormat(val);
    if (key === "sortBy") setSortBy(val);
    setPage(1);
    fetchChannels(next);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchChannels({ page: p });
  }

  const selectStyle: React.CSSProperties = {
    fontSize: "12px", color: "#9ca3af", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px", padding: "6px 10px", outline: "none", cursor: "pointer",
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-white">Niche Finder</h1>
          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", color: "#9ca3af" }}>BETA</span>
        </div>
        <p className="text-sm" style={{ color: "#888" }}>Descubre nichos rentables de YouTube con datos reales de canales</p>
      </div>

      {/* Filters bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "320px" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#444", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar nicho, keyword..."
            style={{ width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "7px", paddingBottom: "7px", fontSize: "12px", color: "#e5e7eb", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", outline: "none" }}
          />
        </div>

        {/* Category filter */}
        <select value={category} onChange={e => handleFilter("category", e.target.value)} style={selectStyle}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Format filter */}
        <select value={format} onChange={e => handleFilter("format", e.target.value)} style={selectStyle}>
          <option value="">Todos los formatos</option>
          {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => handleFilter("sortBy", e.target.value)} style={selectStyle}>
          <option value="outlierScore">⚡ Outlier Score</option>
          <option value="monthlyRevenue">💰 Ingresos/mes</option>
          <option value="subscribers">👥 Suscriptores</option>
          <option value="monthlyViews">👁 Vistas/mes</option>
          <option value="rpm">💵 RPM</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {loading ? "Cargando..." : `${total.toLocaleString("es-ES")} canales`}
          </span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: "220px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", animation: "pulse 2s infinite" }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "12px", textAlign: "center" }}>
          <TrendingUp size={40} style={{ color: "#222" }} />
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280" }}>No se encontraron canales</p>
          <p style={{ fontSize: "12px", color: "#444" }}>Prueba con otros filtros o añade canales desde el panel admin</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
          {channels.map(ch => <NicheChannelCard key={ch.id} ch={ch} />)}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && !loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "28px" }}>
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
            style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: page <= 1 ? "#444" : "#e5e7eb", cursor: page <= 1 ? "default" : "pointer" }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Pág. {page} / {pages}</span>
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page >= pages}
            style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: page >= pages ? "#444" : "#e5e7eb", cursor: page >= pages ? "default" : "pointer" }}
          >
            Siguiente →
          </button>
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
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);

  useEffect(() => {
    if (activeTab !== "imagevideo") return;
    fetch("/api/image/history")
      .then(r => r.json())
      .then(data => {
        try {
          const imgs = data?.images;
          if (!imgs || !Array.isArray(imgs)) return;
          setImageHistory(imgs.map((img: Record<string, string>) => ({
            id: img.id ?? "",
            type: (img.type ?? "image") as "image" | "video",
            prompt: img.prompt ?? "",
            model: img.model ?? "",
            aspectRatio: img.aspectRatio ?? "1:1",
            images: img.type === "video" ? [] : [img.imageUrl].filter(Boolean),
            videoUrl: img.type === "video" ? img.imageUrl : undefined,
            createdAt: new Date(img.createdAt ?? Date.now()),
            expiresAt: new Date(img.expiresAt ?? Date.now()),
            provider: (img.model?.startsWith("grok") ? "xai" : "bfl") as "bfl" | "xai",
          })));
        } catch (e) {
          console.error("[imageHistory] parse error:", e);
        }
      })
      .catch(e => console.error("[imageHistory] load error:", e));
  }, [activeTab]);
  const [extraCredits, setExtraCredits] = useState<number>(0);
  const [plan, setPlan] = useState<string>("free");
  const [effectivePlan, setEffectivePlan] = useState<string>("free");
  const [transcriptionUsed, setTranscriptionUsed] = useState<number>(0);
  const [memberInfo, setMemberInfo] = useState<{ percentage: number; creditsLastDistributed: number; teamName: string } | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const DEFAULT_PRO_VOICE: SelectedVoice = { referenceId: "bf322df2096a46f18c579d0baa36f41d", name: "Adrian", isCloned: false };
  const DEFAULT_TURBO_VOICE: SelectedVoice = { referenceId: "9Ft9sm9dzvprPILZmLJl", name: "Adrian EN", isCloned: false };
  const [selectedProVoice, setSelectedProVoice] = useState<SelectedVoice | null>(DEFAULT_PRO_VOICE);
  const [selectedTurboVoice, setSelectedTurboVoice] = useState<SelectedVoice | null>(DEFAULT_TURBO_VOICE);
  const [translateVoice, setTranslateVoice] = useState<SelectedVoice | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [eliteTextOpen, setEliteTextOpen] = useState(false);
  const [pendingNarrateText, setPendingNarrateText] = useState<string | null>(null);
  const [eliteTextStatus, setEliteTextStatus] = useState<{ tokensUsed: number; tokensTotal: number; percentage: number; plan: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nextRenewalDate, setNextRenewalDate] = useState<string | null>(null);
  const [daysUntilRenewal, setDaysUntilRenewal] = useState<number | null>(null);
  const { t: tt, toggle: toggleLang } = useLang();
  const { toggle: toggleSidebar } = useSidebar();
  const BILLING_PLANS = getBillingPlans(tt);

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
    fetch("/api/elite-text/status")
      .then((r) => r.json())
      .then((d) => { if (d.hasPlan) setEliteTextStatus({ tokensUsed: d.tokensUsed, tokensTotal: d.tokensTotal, percentage: d.percentage, plan: d.plan }); })
      .catch(() => {});
  }, [fetchCredits, fetchVoices, fetchMemberInfo]);

  // Link anonymous cookie consent to authenticated user
  useEffect(() => {
    if (!user?.id) return;
    const consentId = localStorage.getItem('cookie_consent_id');
    if (!consentId) return;
    fetch('/api/cookie-consent/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentId }),
    }).catch(() => {});
  }, [user?.id]);

  // Restore selected voices from localStorage once userId is available
  useEffect(() => {
    if (!user?.id) return;
    try {
      const savedPro = localStorage.getItem(`vf_selected_voice_pro_${user.id}`);
      setSelectedProVoice(savedPro ? (JSON.parse(savedPro) as SelectedVoice) : DEFAULT_PRO_VOICE);
    } catch {
      setSelectedProVoice(DEFAULT_PRO_VOICE);
    }
    try {
      const savedTurbo = localStorage.getItem(`vf_selected_voice_turbo_${user.id}`);
      setSelectedTurboVoice(savedTurbo ? (JSON.parse(savedTurbo) as SelectedVoice) : DEFAULT_TURBO_VOICE);
    } catch {
      setSelectedTurboVoice(DEFAULT_TURBO_VOICE);
    }
  }, [user?.id]);

  // Persist pro voice to localStorage whenever it changes
  useEffect(() => {
    if (!user?.id || !selectedProVoice) return;
    try {
      localStorage.setItem(`vf_selected_voice_pro_${user.id}`, JSON.stringify(selectedProVoice));
    } catch { /* ignore quota errors */ }
  }, [selectedProVoice, user?.id]);

  // Persist turbo voice to localStorage whenever it changes
  useEffect(() => {
    if (!user?.id || !selectedTurboVoice) return;
    try {
      localStorage.setItem(`vf_selected_voice_turbo_${user.id}`, JSON.stringify(selectedTurboVoice));
    } catch { /* ignore quota errors */ }
  }, [selectedTurboVoice, user?.id]);

  const successPlan     = searchParams.get("plan");
  const creditsBought   = searchParams.get("creditsBought");
  const planChanged     = searchParams.get("planChanged");
  const lifetimeSuccess = searchParams.get("lifetime");

  useEffect(() => {
    if (lifetimeSuccess === "success") {
      const t = setTimeout(() => fetchCredits(), 2500);
      return () => clearTimeout(t);
    }
  }, [lifetimeSuccess, fetchCredits]);

  function handleUseVoice(voice: SelectedVoice) {
    setSelectedProVoice(voice);
    setActiveTab("generate");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#000000" }}>
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
      <SupportChat open={chatOpen} onClose={() => setChatOpen(false)} />
      <EliteTextPanel
        open={eliteTextOpen}
        onClose={() => setEliteTextOpen(false)}
        onSendToNarrate={(text) => {
          setPendingNarrateText(text);
          setActiveTab("generate");
          setEliteTextOpen(false);
        }}
      />

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
        style={{ width: "260px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} plan={plan} memberInfo={memberInfo} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0" style={{ padding: "0", marginRight: chatOpen ? "380px" : eliteTextOpen ? "400px" : "0", transition: "margin-right 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
        {/* Topbar */}
        {(() => {
          const TAB_META: Record<Tab, { title: string; Icon: React.ElementType }> = {
            home:       { title: tt.tabs.home,        Icon: Home },
            generate:   { title: tt.tabs.generate,    Icon: Type },
            dialogue:   { title: tt.nav.textToDialogue, Icon: MessageSquare },
            transcribe: { title: tt.tabs.transcribe,  Icon: FileAudio },
            translate:  { title: tt.tabs.translate,   Icon: Globe },
            history:    { title: tt.tabs.history,     Icon: Clock },
            billing:    { title: tt.tabs.billing,     Icon: CreditCard },
            voices:     { title: tt.tabs.voices,      Icon: Mic2 },
            referral:   { title: tt.tabs.referral,    Icon: Gift },
            team:       { title: tt.nav.team,          Icon: Users },
            imagevideo:     { title: tt.nav.imageVideo,    Icon: ImageIcon },
            nichefinder:    { title: "Niche Finder",       Icon: TrendingUp },
            "create-voice": { title: "Crear Voz",          Icon: Wand2 },
          };
          const { title, Icon } = TAB_META[activeTab] ?? { title: "", Icon: Home };
          return (
            <div style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 200, background: "#000000", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Hamburger — desktop: collapses sidebar / mobile: opens drawer */}
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                      toggleSidebar();
                    } else {
                      setSidebarOpen(s => !s);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", cursor: "pointer", color: "#888888", flexShrink: 0 }}
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
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Languages size={16} />
                </button>
                {/* Elite Text button — hidden temporarily
                <button
                  onClick={() => setEliteTextOpen(prev => !prev)}
                  title="Elite Text — Generación de guiones"
                  className={`h-9 px-3 min-h-[36px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer text-sm font-medium gap-1.5 ${eliteTextOpen ? "border-violet-500/40 bg-violet-500/15 text-violet-300" : "border-white/10 bg-white/5 text-white/70 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300"}`}
                >
                  <FileText size={14} />
                  <span className="hidden sm:inline">Text</span>
                </button>
                */}
                <button
                  onClick={() => setChatOpen(prev => !prev)}
                  title="Ask AI"
                  className={`h-9 px-3 min-h-[36px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer text-sm font-medium ${chatOpen ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}
                >
                  Ask
                </button>
                <Link
                  href="/dashboard/support"
                  title="Soporte"
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <HelpCircle size={16} />
                </Link>
                <a
                  href="#"
                  title="Discord"
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.082.11 18.105.128 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                </a>
                <UserMenu
                  used={credits !== null ? Math.max(0, (plan === "lifetime" ? 20_000_000 : (BILLING_PLANS.find(p => p.key === plan)?.characters ?? 10_000)) + extraCredits - credits) : undefined}
                  total={credits !== null ? (plan === "lifetime" ? 20_000_000 : (BILLING_PLANS.find(p => p.key === plan)?.characters ?? 10_000)) + extraCredits : undefined}
                  plan={plan}
                  eliteText={eliteTextStatus}
                />
              </div>
            </div>
          );
        })()}
        {/* Page content */}
        {activeTab === "imagevideo" ? (
          <div className="flex-1 overflow-hidden">
            <ImageVideoEditor
              credits={credits ?? 0}
              onCreditsUpdate={(newCredits) => setCredits(newCredits)}
              history={imageHistory}
              onHistoryUpdate={(item) => setImageHistory(prev => [item, ...prev])}
            />
          </div>
        ) : activeTab === "dialogue" ? (
          <div className="flex-1 overflow-hidden p-4">
            <DialogueEditor
              userVoices={voices}
              plan={effectivePlan}
              credits={credits ?? 0}
              onCreditsUpdate={(newCredits) => setCredits(newCredits)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4">
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
            {lifetimeSuccess === "success" && (
              <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)" }}>
                <Check size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
                <p style={{ color: "#f59e0b", fontWeight: 600, fontSize: "14px", margin: 0 }}>
                  ✦ ¡Pago completado! Se han añadido <strong>20.000.000 créditos</strong> a tu cuenta.
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
                selectedProVoice={selectedProVoice}
                onProVoiceChange={setSelectedProVoice}
                selectedTurboVoice={selectedTurboVoice}
                onTurboVoiceChange={setSelectedTurboVoice}
                plan={effectivePlan}
                externalText={pendingNarrateText}
                credits={credits}
                extraCredits={extraCredits}
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
            {activeTab === "team" && (
              <TeamTab
                plan={effectivePlan}
                credits={credits}
                extraCredits={extraCredits}
                nextRenewalDate={nextRenewalDate}
                onNavigateToBilling={() => setActiveTab("billing")}
              />
            )}
            {activeTab === "nichefinder" && <NicheFinderTab />}
            {activeTab === "create-voice" && (
              <CreateVoiceTab
                plan={effectivePlan}
                onCloned={() => { fetchVoices(); setActiveTab("voices"); }}
              />
            )}
          </div>
        )}{/* end page content */}
      </main>
      <WhatsNewPopup />
    </div>
  );
}
