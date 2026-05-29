"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Home, Mic2, Type, FileAudio, Globe, Clock,
  CreditCard, Gift, Zap, Settings, Users, Code,
} from "lucide-react";
import { useLang } from "./LanguageContext";

type Tab = "home" | "voices" | "generate" | "transcribe" | "translate" | "history" | "billing" | "referral" | "team";

export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLang();

  const [plan, setPlan] = useState<string>("free");
  const [memberInfo, setMemberInfo] = useState<{
    percentage: number;
    creditsLastDistributed: number;
    teamName: string;
  } | null>(null);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isMiCuenta = pathname === "/dashboard/mi-cuenta";
  const activeTab: Tab | null = isMiCuenta
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
    platformItems.unshift({ key: "team", label: "Equipo", Icon: Users });
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
        width: "240px",
        flexShrink: 0,
        height: "100vh",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        borderRight: "1px solid #1a1a1a",
        background: "#000000",
        overflowX: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ height: "56px", display: "flex", alignItems: "center", paddingLeft: "20px", flexShrink: 0 }}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/elitelabs.png"
            alt="Elite Labs"
            width={28}
            height={28}
            style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast", flexShrink: 0 }}
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
                    onClick={() => router.push(`/dashboard?tab=${key}`)}
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
                      background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                      color: isActive ? "#ffffff" : "#555555",
                    }}
                  >
                    <Icon size={15} style={{ color: isActive ? "#ffffff" : "#444444", flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Desarrollador — bloqueado */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            marginTop: "2px",
            opacity: 0.4,
            cursor: "not-allowed",
            userSelect: "none",
            color: "#555555",
          }}
        >
          <Code size={15} style={{ color: "#444444", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Desarrollador</span>
          <span style={{
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontWeight: 500,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}>
            En desarrollo
          </span>
        </div>

        {/* Mi cuenta */}
        <Link
          href="/dashboard/mi-cuenta"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            marginTop: "2px",
            transition: "background 0.15s",
            background: isMiCuenta ? "rgba(255,255,255,0.08)" : "transparent",
            color: isMiCuenta ? "#ffffff" : "#555555",
          }}
          onMouseEnter={(e) => { if (!isMiCuenta) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#d1d5db"; } }}
          onMouseLeave={(e) => { if (!isMiCuenta) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555555"; } }}
        >
          <Settings size={15} style={{ color: isMiCuenta ? "#ffffff" : "#444444", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{t.nav.account}</span>
          {isMiCuenta && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
        </Link>
      </nav>

      {/* Team membership section */}
      {memberInfo && (
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
                  style={{ flex: 1, padding: "5px 0", borderRadius: "7px", border: "1px solid #333333", background: "transparent", color: "#666666", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
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
              <div style={{ background: "#111111", border: "1px solid #222222", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={14} style={{ color: "#aaaaaa" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {memberInfo.teamName}
                  </p>
                  <p style={{ fontSize: "11px", color: "#555555", marginTop: "1px" }}>
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

      {/* Upgrade button */}
      {plan !== "enterprise" && (
        <div style={{ padding: "0 12px 16px", flexShrink: 0 }}>
          <button
            onClick={() => router.push("/dashboard?tab=billing")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
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
            <span style={{ position: "relative", zIndex: 1, fontSize: "13px", fontWeight: 600, color: "#cccccc", flex: 1, textAlign: "left" }}>
              {t.nav.upgradePlan}
            </span>
            <svg style={{ position: "relative", zIndex: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
