"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Link2, DollarSign, BarChart2, X } from "lucide-react";
import { useLang } from "@/app/dashboard/LanguageContext";

function AplicarModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", email: "", platform: "", audience: "", paymentMethod: "paypal" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.affiliate.errorUnknown);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.affiliate.errorUnknown);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { background: "#0a0a0f", border: "1px solid #2a2a3e", color: "#e5e7eb", borderRadius: "10px", padding: "10px 14px", width: "100%", fontSize: "14px", outline: "none" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 600, color: "#8888a8", marginBottom: "6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "28px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
          <X size={18} />
        </button>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Check size={24} style={{ color: "#4ade80" }} />
            </div>
            <h3 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>{t.affiliate.requestSent}</h3>
            <p style={{ color: "#8888a8", fontSize: "14px", margin: "0 0 24px" }}>
              {t.affiliate.requestSentDesc}
            </p>
            <button onClick={onClose} style={{ padding: "10px 24px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>
              {t.affiliate.close}
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 700, margin: "0 0 6px" }}>{t.affiliate.modalTitle}</h2>
            <p style={{ color: "#8888a8", fontSize: "13px", margin: "0 0 24px" }}>{t.affiliate.modalSubtitle}</p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>{t.affiliate.fullName}</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Tu nombre" />
              </div>
              <div>
                <label style={labelStyle}>{t.affiliate.contactEmail}</label>
                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="tu@email.com" />
              </div>
              <div>
                <label style={labelStyle}>{t.affiliate.platform}</label>
                <input style={inputStyle} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} required placeholder={t.affiliate.platformPlaceholder} />
              </div>
              <div>
                <label style={labelStyle}>{t.affiliate.audience}</label>
                <input style={inputStyle} value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} required placeholder={t.affiliate.audiencePlaceholder} />
              </div>
              <div>
                <label style={labelStyle}>{t.affiliate.preferredPayment}</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ v: "paypal", l: "PayPal" }, { v: "transfer", l: t.affiliate.transfer }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, paymentMethod: v }))}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 150ms",
                        ...(form.paymentMethod === v
                          ? { background: "rgba(255,255,255,0.1)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
                          : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a3e" }
                        ),
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ padding: "12px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {loading && (
                  <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? t.affiliate.sending : t.affiliate.sendRequest}
              </button>
            </form>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AfiliadosPage() {
  const { t } = useLang();
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const STEPS = [
    { n: "01", title: t.affiliate.step1Title, desc: t.affiliate.step1Desc },
    { n: "02", title: t.affiliate.step2Title, desc: t.affiliate.step2Desc },
    { n: "03", title: t.affiliate.step3Title, desc: t.affiliate.step3Desc },
  ];

  const BENEFITS = [
    t.affiliate.benefit1,
    t.affiliate.benefit2,
    t.affiliate.benefit3,
    t.affiliate.benefit4,
    t.affiliate.benefit5,
    t.affiliate.benefit6,
  ];

  const STATS = [
    { Icon: DollarSign, value: "5%",    label: t.affiliate.cashCommission },
    { Icon: BarChart2,  value: "∞",     label: t.affiliate.noLimit },
    { Icon: Link2,      value: "30 días", label: t.affiliate.cookieDuration },
  ];

  if (isLoaded && !isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e5e7eb" }}>
      {showModal && <AplicarModal onClose={() => setShowModal(false)} />}

      {/* Nav */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8888a8", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}
           onClick={(e) => { e.preventDefault(); router.back(); }}>
          <ArrowLeft size={16} /> {t.affiliate.backToDashboard}
        </a>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "9999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
            <DollarSign size={13} style={{ color: "#aaaaaa" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#aaaaaa" }}>{t.affiliate.programBadge}</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, color: "#fff", margin: "0 0 16px", lineHeight: 1.15 }}>
            {t.affiliate.heroTitle}<br />
            <span style={{ color: "#ffffff" }}>
              {t.affiliate.heroTitleHighlight}
            </span>
          </h1>
          <p style={{ fontSize: "18px", color: "#8888a8", margin: "0 0 36px", maxWidth: "540px", marginInline: "auto" }}>
            {t.affiliate.heroDesc}
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "14px 36px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "9999px", fontWeight: 700, fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,255,255,0.1)" }}
          >
            {t.affiliate.applyNow}
          </button>
        </div>

        {/* ── How it works ── */}
        <div style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "40px" }}>{t.affiliate.howItWorks}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "20px", padding: "28px" }}>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#1e3a5f", marginBottom: "16px" }}>{s.n}</div>
                <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 10px" }}>{s.title}</h3>
                <p style={{ color: "#8888a8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Why join? ── */}
        <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "24px", padding: "40px", marginBottom: "64px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "32px", textAlign: "center" }}>{t.affiliate.whyJoin}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {BENEFITS.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Check size={12} style={{ color: "#4ade80" }} />
                </div>
                <p style={{ color: "#d1d5db", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats banner ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "64px" }}>
          {STATS.map(({ Icon, value, label }) => (
            <div key={label} style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <Icon size={24} style={{ color: "#aaaaaa", margin: "0 auto 10px" }} />
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{value}</p>
              <p style={{ fontSize: "12px", color: "#8888a8", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{ textAlign: "center", background: "linear-gradient(135deg, #0f1a2e 0%, #12121a 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "56px 32px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>{t.affiliate.ctaTitle}</h2>
          <p style={{ color: "#8888a8", fontSize: "16px", margin: "0 0 32px" }}>
            {t.affiliate.ctaDesc}
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "14px 40px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "9999px", fontWeight: 700, fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,255,255,0.1)" }}
          >
            {t.affiliate.ctaBtn}
          </button>
        </div>

      </div>
    </div>
  );
}
