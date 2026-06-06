"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Home, Mic2, Type, FileAudio, Globe, Clock,
  CreditCard, Gift, Zap, Settings, Users, MessageSquare, ChevronsUpDown,
  Image as ImageIcon, Compass,
} from "lucide-react";
import { useLang } from "./LanguageContext";
import { useSidebar } from "./SidebarContext";

type Tab = "home" | "voices" | "generate" | "dialogue" | "imagevideo" | "transcribe" | "translate" | "history" | "billing" | "referral" | "team";

export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const { collapsed } = useSidebar();

  const [plan, setPlan] = useState<string>("free");
  const [memberInfo, setMemberInfo] = useState<{
    percentage: number;
    creditsLastDistributed: number;
    teamName: string;
  } | null>(null);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showProductMenu, setShowProductMenu] = useState(false);

  const isMiCuenta = pathname === "/dashboard/mi-cuenta";
  const isDiscover = pathname === "/voices" || pathname === "/descubrir";
  const activeTab: Tab | null = (isMiCuenta || isDiscover)
    ? null
    : ((searchParams.get("tab") as Tab | null) ?? "home");

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => { if (d.plan) setPlan(d.plan); })
      .catch(() => {});
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.memberInfo) setMemberInfo(d.memberInfo); })
      .catch(() => {});
  }, []);

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
    { key: "billing", label: t.nav.billing, Icon: CreditCard },
    { key: "referral", label: t.nav.referrals, Icon: Gift },
  ];
  if (plan === "enterprise") {
    platformItems.unshift({ key: "team", label: t.nav.team, Icon: Users });
  }

  const sections = [
    {
      items: [
        { key: "home" as Tab, label: t.nav.home, Icon: Home },
        { key: "voices" as Tab, label: t.nav.customVoice, Icon: Mic2 },
      ],
    },
    {
      label: t.nav.products,
      items: [
        { key: "generate" as Tab, label: t.nav.generate, Icon: Type },
        { key: "dialogue" as Tab, label: t.nav.textToDialogue, Icon: MessageSquare },
        { key: "imagevideo" as Tab, label: t.nav.imageVideo, Icon: ImageIcon },
        { key: "transcribe" as Tab, label: t.nav.transcribe, Icon: FileAudio },
        { key: "translate" as Tab, label: t.nav.translate, Icon: Globe },
        { key: "history" as Tab, label: t.nav.history, Icon: Clock },
      ],
    },
    {
      label: t.nav.platform,
      items: platformItems,
    },
  ];

  return (
    <aside
      className="hidden lg:flex"
      style={{
        width: collapsed ? "64px" : "240px",
        flexShrink: 0,
        height: "100vh",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        borderRight: "1px solid #1a1a1a",
        background: "#000000",
        overflowX: "hidden",
        transition: "width 0.3s ease-in-out",
      }}
    >
      {/* Logo */}
      <div style={{ height: "56px", display: "flex", alignItems: "center", paddingLeft: collapsed ? "0" : "20px", justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
        <Link href="/" className="flex items-center gap-2.5" title={collapsed ? "Elite Labs" : undefined}>
          <Image
            src="/elitelabs.png"
            alt="Elite Labs"
            width={28}
            height={28}
            style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast", flexShrink: 0 }}
            className="rounded-lg"
          />
          {!collapsed && <span className="font-bold text-white tracking-tight text-sm">Elite Labs</span>}
        </Link>
      </div>

      {/* Product selector */}
      <div style={{ padding: collapsed ? "0 8px 8px" : "0 12px 8px", position: "relative", flexShrink: 0 }}>
        {collapsed ? (
          /* Icon-only when collapsed */
          <button
            onClick={() => setShowProductMenu(p => !p)}
            title="Elite Studio"
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "linear-gradient(135deg, #1a3a5c, #0ea5e9)", border: "1px solid rgba(14,165,233,0.3)", cursor: "pointer", width: "100%" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9 Q5 3 9 6 Q13 9 16 4" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M2 12 Q6 7 9 10 Q12 13 16 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <circle cx="9" cy="9" r="1.5" fill="white" opacity="0.8"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setShowProductMenu(p => !p)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "8px", padding: "8px 12px", borderRadius: "10px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #1a3a5c, #0ea5e9)", border: "1px solid rgba(14,165,233,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M2 9 Q5 3 9 6 Q13 9 16 4" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <path d="M2 12 Q6 7 9 10 Q12 13 16 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <circle cx="9" cy="9" r="1.5" fill="white" opacity="0.8"/>
                </svg>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>Elite Studio</span>
            </div>
            <ChevronsUpDown size={14} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
          </button>
        )}

        {showProductMenu && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowProductMenu(false)} />
            <div style={{
              position: "absolute", top: "100%", left: collapsed ? "0" : "12px", right: collapsed ? "auto" : "12px",
              marginTop: "4px", minWidth: "220px",
              zIndex: 50, background: "#111111", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", padding: "4px",
            }}>
              {/* Elite Studio — activo */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.08)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1a3a5c, #0ea5e9)", border: "1px solid rgba(14,165,233,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 9 Q5 3 9 6 Q13 9 16 4" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    <path d="M2 12 Q6 7 9 10 Q12 13 16 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    <circle cx="9" cy="9" r="1.5" fill="white" opacity="0.8"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff", margin: 0 }}>Elite Studio</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>Genera y clona voz con IA</p>
                </div>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />
              </div>
              {/* Elite API — en desarrollo */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", opacity: 0.4, cursor: "not-allowed" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="3" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.7)"/>
                    <rect x="10" y="3" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                    <rect x="3" y="10" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                    <rect x="10" y="10" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.15)"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff", margin: 0 }}>Elite API</p>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>Pronto</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>API de síntesis de voz</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: "8px", paddingBottom: "8px", paddingLeft: collapsed ? "8px" : "12px", paddingRight: collapsed ? "8px" : "12px", overflowY: "auto" }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: si < sections.length - 1 ? "20px" : 0 }}>
            {section.label && !collapsed && (
              <p style={{ paddingLeft: "12px", marginBottom: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#444444" }}>
                {section.label}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map(({ key, label, Icon }, itemIdx) => {
                const isActive = activeTab === key;
                return (
                  <>
                    <div key={key} className="relative group">
                      <button
                        onClick={() => router.push(`/dashboard?tab=${key}`)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: collapsed ? "center" : "flex-start",
                          gap: collapsed ? 0 : "10px",
                          padding: collapsed ? "8px 0" : "8px 12px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 500,
                          textAlign: "left",
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                          color: isActive ? "#ffffff" : "#555555",
                        }}
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#d1d5db"; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555555"; } }}
                      >
                        <Icon size={15} style={{ color: isActive ? "#ffffff" : "#444444", flexShrink: 0 }} />
                        {!collapsed && (
                          <>
                            <span style={{ flex: 1 }}>{label}</span>
                            {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                          </>
                        )}
                      </button>
                      {collapsed && (
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                          {label}
                        </div>
                      )}
                    </div>
                    {si === 0 && itemIdx === 0 && (
                      <div key="discover-wrap" className="relative group">
                        <Link
                          href="/voices"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: collapsed ? "center" : "flex-start",
                            gap: collapsed ? 0 : "10px",
                            padding: collapsed ? "8px 0" : "8px 12px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            textDecoration: "none",
                            background: isDiscover ? "rgba(255,255,255,0.08)" : "transparent",
                            color: isDiscover ? "#ffffff" : "#555555",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isDiscover) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#d1d5db"; } }}
                          onMouseLeave={(e) => { if (!isDiscover) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555555"; } }}
                        >
                          <Compass size={15} style={{ color: isDiscover ? "#ffffff" : "#444444", flexShrink: 0 }} />
                          {!collapsed && (
                            <>
                              <span style={{ flex: 1 }}>{t.nav.discover}</span>
                              {isDiscover && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                            </>
                          )}
                        </Link>
                        {collapsed && (
                          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                            {t.nav.discover}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })}
            </div>
          </div>
        ))}

        {/* Mi cuenta */}
        <div className="relative group" style={{ marginTop: "2px" }}>
          <Link
            href="/dashboard/mi-cuenta"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : "10px",
              padding: collapsed ? "8px 0" : "8px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.15s",
              background: isMiCuenta ? "rgba(255,255,255,0.08)" : "transparent",
              color: isMiCuenta ? "#ffffff" : "#555555",
            }}
            onMouseEnter={(e) => { if (!isMiCuenta) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#d1d5db"; } }}
            onMouseLeave={(e) => { if (!isMiCuenta) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555555"; } }}
          >
            <Settings size={15} style={{ color: isMiCuenta ? "#ffffff" : "#444444", flexShrink: 0 }} />
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>{t.nav.account}</span>
                {isMiCuenta && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
              </>
            )}
          </Link>
          {collapsed && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              {t.nav.account}
            </div>
          )}
        </div>
      </nav>

      {/* Team membership section */}
      {memberInfo && !collapsed && (
        <div style={{ borderTop: "1px solid #1a1a1a", padding: "12px 20px 16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#444444", marginBottom: "8px" }}>
            {t.sidebar.team}
          </p>
          {leaveConfirm ? (
            <div style={{ background: "#110a0a", border: "1px solid #3a1a1a", borderRadius: "10px", padding: "10px 12px" }}>
              <p style={{ fontSize: "11px", color: "#fca5a5", marginBottom: "8px", lineHeight: 1.4 }}>
                {t.sidebar.leaveQuestion} <strong>{memberInfo.teamName}</strong>{t.sidebar.leaveLosing}{" "}
                {memberInfo.creditsLastDistributed > 0
                  ? <strong>{memberInfo.creditsLastDistributed.toLocaleString()} {t.generate.credits}</strong>
                  : t.sidebar.creditsAssigned}{" "}
                {t.sidebar.leaveReturn}
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setLeaveConfirm(false)}
                  disabled={leaving}
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "1px solid #333333", background: "transparent", color: "#666666", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                >
                  {t.account.cancel}
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "none", background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", opacity: leaving ? 0.6 : 1 }}
                >
                  {leaving ? "..." : t.sidebar.leave}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: "#111111", border: "1px solid #222222", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={14} style={{ color: "#aaaaaa" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {memberInfo.teamName}
                  </p>
                  <p style={{ fontSize: "11px", color: "#555555", marginTop: "1px" }}>
                    {t.sidebar.member} · {(memberInfo.percentage > 0 ? Math.floor(5_000_000 * memberInfo.percentage / 100) : memberInfo.creditsLastDistributed).toLocaleString()} {t.sidebar.charAbbr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLeaveConfirm(true)}
                style={{ marginTop: "6px", width: "100%", padding: "5px 0", borderRadius: "7px", border: "1px solid #2a1a1a", background: "transparent", color: "#7a3a3a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#4a1a1a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#7a3a3a"; e.currentTarget.style.borderColor = "#2a1a1a"; }}
              >
                {t.sidebar.leaveTeam}
              </button>
            </>
          )}
        </div>
      )}

      {/* Upgrade button */}
      {plan !== "enterprise" && plan !== "lifetime" && (
        <div style={{ padding: collapsed ? "0 8px 16px" : "0 12px 16px", flexShrink: 0 }}>
          <button
            onClick={() => router.push("/dashboard?tab=billing")}
            title={collapsed ? t.nav.upgradePlan : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : "8px",
              padding: collapsed ? "10px 0" : "10px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              background: "#111111",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "#1a1a1a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "#111111"; }}
          >
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)" }} />
            <div style={{ position: "relative", zIndex: 1, width: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={13} style={{ color: "#cccccc" }} />
            </div>
            {!collapsed && (
              <>
                <span style={{ position: "relative", zIndex: 1, fontSize: "13px", fontWeight: 600, color: "#cccccc", flex: 1, textAlign: "left" }}>
                  {t.nav.upgradePlan}
                </span>
                <svg style={{ position: "relative", zIndex: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Lifetime badge */}
      {plan === "lifetime" && !collapsed && (
        <div style={{ padding: "0 12px 16px", flexShrink: 0 }}>
          <div style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.08)",
          }}>
            <span style={{ fontSize: "16px", lineHeight: 1 }}>♾</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#f59e0b", letterSpacing: "0.05em" }}>LIFETIME</span>
          </div>
        </div>
      )}
    </aside>
  );
}
