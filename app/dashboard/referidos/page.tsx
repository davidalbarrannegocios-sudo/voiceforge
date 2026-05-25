"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Gift, DollarSign, ArrowLeft, Copy, Check, ChevronRight, Info, X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

/* ── Constants ────────────────────────────────────────────────── */
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
  { key: "100k", label: "100K caracteres", price: 5,  chars: 100_000   },
  { key: "300k", label: "300K caracteres", price: 12, chars: 300_000   },
  { key: "600k", label: "600K caracteres", price: 19, chars: 600_000   },
  { key: "1m",   label: "1M caracteres",   price: 30, chars: 1_000_000 },
] as const;

function centsToUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ── Spinner ─────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite", flexShrink: 0 }} fill="none" viewBox="0 0 24 24">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ── Tooltip ─────────────────────────────────────────────────── */
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#555570", padding: 0, display: "flex" }}
      >
        <Info size={14} />
      </button>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: "8px",
          padding: "8px 12px", width: 220, fontSize: "12px", color: "#9ca3af",
          lineHeight: 1.5, zIndex: 50, pointerEvents: "none",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

/* ── Withdraw Modal ──────────────────────────────────────────── */
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

  const inp = { background: "#0a0a0f", border: "1px solid #2a2a3e", color: "#e5e7eb", borderRadius: "10px", padding: "10px 14px", width: "100%", fontSize: "14px", outline: "none", boxSizing: "border-box" as const };
  const lbl = { display: "block", fontSize: "12px", fontWeight: 600 as const, color: "#8888a8", marginBottom: "6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "20px", width: "100%", maxWidth: "420px", padding: "28px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
          <X size={18} />
        </button>
        <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>Retirar en efectivo</h2>
        <p style={{ color: "#8888a8", fontSize: "13px", margin: "0 0 20px" }}>
          Saldo disponible: <strong style={{ color: "#4ade80" }}>${maxAmount.toFixed(2)}</strong> · Mín. $20
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={lbl}>Método de pago</label>
            <div style={{ position: "relative", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: "8px", padding: "3px", display: "flex" }}>
              <div style={{ position: "absolute", top: 3, left: 3, width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "#1a1a2e", borderRadius: "5px", border: "1px solid #2a2a3e", transition: "transform 0.2s", transform: `translateX(${method === "transfer" ? "100%" : "0%"})` }} />
              {(["paypal", "transfer"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} style={{ flex: 1, position: "relative", zIndex: 1, padding: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: method === m ? "#e5e7eb" : "#6b7280", transition: "color 0.2s" }}>
                  {m === "paypal" ? "PayPal" : "Transferencia"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Importe (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: "14px" }}>$</span>
              <input style={{ ...inp, paddingLeft: "28px" }} type="number" min="20" max={maxAmount} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="20.00" required />
            </div>
          </div>
          {method === "paypal" && (
            <div>
              <label style={lbl}>Email de PayPal</label>
              <input style={inp} type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} placeholder="tu@paypal.com" required />
            </div>
          )}
          {method === "transfer" && (
            <>
              <div>
                <label style={lbl}>Nombre del banco</label>
                <input style={inp} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Nombre del banco" required />
              </div>
              <div>
                <label style={lbl}>IBAN / Número de cuenta</label>
                <input style={inp} value={bankIban} onChange={e => setBankIban(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" required />
              </div>
            </>
          )}
          {error && <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={!canSubmit || loading} style={{ padding: "12px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: canSubmit && !loading ? "pointer" : "not-allowed", opacity: canSubmit && !loading ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading && <Spinner />} Solicitar retiro
          </button>
        </form>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

/* ── History drawer ─────────────────────────────────────────── */
function HistoryDrawer({ referrals, loading, onClose }: { referrals: ReferralEntry[]; loading: boolean; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 560, background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "20px 20px 0 0", padding: "24px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>Historial de recompensas</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 52, borderRadius: 12, background: "#1a1a2e" }} />)}
            </div>
          ) : referrals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Gift size={32} style={{ color: "#2a2a3e", marginBottom: 10 }} />
              <p style={{ color: "#6b7280", fontSize: "14px" }}>Aún no tienes referidos</p>
              <p style={{ color: "#4a4a65", fontSize: "12px", marginTop: 4 }}>Comparte tu enlace y empieza a ganar</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {referrals.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: "#0d0d17", border: "1px solid #1a1a2e" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>{i + 1}</div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>Referido #{i + 1}</p>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "999px",
                    ...(r.status === "claimed"
                      ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                      : r.status === "rewarded"
                      ? { background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }
                      : { background: "rgba(255,255,255,0.06)", color: "#8888a8", border: "1px solid #2a2a3e" })
                    }}>
                    {r.status === "claimed" ? "Canjeado" : r.status === "rewarded" ? "Completado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Redeem button ───────────────────────────────────────────── */
function RedeemBtn({
  label, price, chars, disabled, loading, onClick, accent = "#3b82f6",
}: {
  label: string; price: number; chars: number; disabled: boolean; loading: boolean; onClick: () => void; accent?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        padding: "10px 14px", borderRadius: "10px", border: `1px solid ${hovered && !disabled ? accent + "55" : "#2a2a3e"}`,
        background: hovered && !disabled ? `${accent}12` : "#0a0a0f",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "#6b7280" }}>{chars.toLocaleString("es-ES")} chars</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: disabled ? "#4a4a65" : accent }}>${price}</span>
        {loading ? <Spinner /> : <ChevronRight size={13} style={{ color: "#555570" }} />}
      </div>
    </button>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function ReferidosPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralBalance, setReferralBalance] = useState(0);
  const [referralEarned, setReferralEarned] = useState(0);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  // Redeem state
  const [redeemingKey, setRedeemingKey] = useState<string | null>(null);
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

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const referralLink = referralCode ? `https://elitelabs.es/?ref=${referralCode}` : "";

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRedeem(type: "plan" | "chars", key: string) {
    setRedeemingKey(key);
    setRedeemMsg(null);
    try {
      const body = type === "plan" ? { type: "plan", planKey: key } : { type: "chars", packKey: key };
      const res = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemMsg({ ok: false, text: data.error ?? "Error al canjear" });
      } else {
        const item = type === "plan"
          ? REDEEM_PLANS.find(p => p.key === key)
          : REDEEM_PACKS.find(p => p.key === key);
        setRedeemMsg({ ok: true, text: `¡${item?.chars.toLocaleString("es-ES")} caracteres añadidos!` });
        fetchReferral();
        setTimeout(() => setRedeemMsg(null), 4000);
      }
    } finally {
      setRedeemingKey(null);
    }
  }

  if (!isLoaded) return null;

  const S = {
    card: { background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "16px", padding: "24px" },
    sectionTitle: { fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 },
    label: { fontSize: "11px", color: "#8888a8", marginBottom: 2 },
    value: { fontSize: "18px", fontWeight: 800, color: "#fff" },
    divider: { width: 1, height: 36, background: "#2a2a3e", flexShrink: 0 } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e5e7eb" }}>
      {showWithdraw && (
        <WithdrawModal
          balance={referralBalance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            setWithdrawMsg("¡Solicitud de retiro enviada! Te contactaremos pronto.");
            fetchReferral();
            setTimeout(() => setWithdrawMsg(null), 6000);
          }}
        />
      )}
      {showHistory && (
        <HistoryDrawer referrals={referrals} loading={loading} onClose={() => setShowHistory(false)} />
      )}

      {/* Nav */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "#8888a8", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}
        >
          <ArrowLeft size={15} /> Volver
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── SECCIÓN 1: Créditos de producto ─────────────────── */}
        <div style={S.card}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Gift size={16} style={{ color: "#3b82f6" }} />
              </div>
              <p style={S.sectionTitle}>Comparte tu enlace y obtén créditos de producto</p>
              <InfoTooltip text="Comparte tu enlace de referido y cuando alguien se una y pague, recibirás créditos de producto que puedes canjear por caracteres." />
            </div>
            <button
              onClick={() => setShowHistory(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#3b82f6", flexShrink: 0 }}
            >
              Ver historial de recompensas <ChevronRight size={13} />
            </button>
          </div>

          {/* Body: two-column */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "start" }}>
            {/* Left: link + stats */}
            <div>
              <p style={{ fontSize: "12px", color: "#8888a8", marginBottom: 8 }}>Tu enlace único:</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: "9px 14px", borderRadius: 10, background: "#0a0a0f", border: "1px solid #2a2a3e", fontSize: "13px", fontFamily: "monospace", color: "#93c5fd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loading ? "—" : referralLink || "—"}
                </div>
                <button
                  onClick={handleCopy}
                  disabled={!referralLink}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10,
                    fontSize: "13px", fontWeight: 600, border: "none", cursor: referralLink ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                    ...(copied
                      ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                      : { background: "rgba(59,130,246,0.15)", color: "#93c5fd" })
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>

              {/* Balance row */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
                    <span style={S.label}>Disponible para canjear</span>
                  </div>
                  <p style={{ ...S.value, color: "#4ade80" }}>
                    {loading ? "—" : centsToUSD(referralBalance)}
                  </p>
                </div>
                <div style={S.divider} />
                <div>
                  <p style={{ ...S.label, marginBottom: 3 }}>Créditos Totales Ganados</p>
                  <p style={S.value}>{loading ? "—" : centsToUSD(referralEarned)}</p>
                </div>
              </div>
            </div>

            {/* Right: Canjear column */}
            <div style={{ width: 200 }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#555570", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Canjear</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {REDEEM_PLANS.map(p => (
                  <RedeemBtn
                    key={p.key}
                    label={`Plan ${p.label}`}
                    price={p.price}
                    chars={p.chars}
                    disabled={referralBalance < p.price * 100}
                    loading={redeemingKey === p.key}
                    onClick={() => handleRedeem("plan", p.key)}
                    accent="#3b82f6"
                  />
                ))}

                <div style={{ height: 1, background: "#1e1e2e", margin: "6px 0" }} />

                {REDEEM_PACKS.map(p => (
                  <RedeemBtn
                    key={p.key}
                    label={p.label}
                    price={p.price}
                    chars={p.chars}
                    disabled={referralBalance < p.price * 100}
                    loading={redeemingKey === p.key}
                    onClick={() => handleRedeem("chars", p.key)}
                    accent="#8b5cf6"
                  />
                ))}
              </div>

              {redeemMsg && (
                <p style={{ fontSize: "12px", marginTop: 10, fontWeight: 600, color: redeemMsg.ok ? "#4ade80" : "#f87171" }}>
                  {redeemMsg.ok ? "✓ " : ""}{redeemMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: Comisiones en efectivo ───────────────── */}
        <div style={{ ...S.card, border: `1px solid ${canWithdraw ? "rgba(74,222,128,0.25)" : "#2a2a3e"}` }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: canWithdraw ? "rgba(74,222,128,0.12)" : "rgba(234,179,8,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <DollarSign size={16} style={{ color: canWithdraw ? "#4ade80" : "#eab308" }} />
            </div>
            <p style={S.sectionTitle}>Comparte tu enlace y recibe comisiones en efectivo</p>
            {canWithdraw && (
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 9px", borderRadius: "999px", background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", flexShrink: 0 }}>
                Afiliado aprobado
              </span>
            )}
            <InfoTooltip text="Programa de afiliados: gana un 5% en efectivo de cada pago de tus referidos. Requiere aprobación previa." />
          </div>

          <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: 20 }}>
            Gana un <strong style={{ color: "#93c5fd" }}>5% de comisión en efectivo</strong> por cada referido que pague · Pagos vía PayPal o transferencia
          </p>

          {withdrawMsg && (
            <p style={{ fontSize: "13px", color: "#4ade80", fontWeight: 600, marginBottom: 14 }}>✓ {withdrawMsg}</p>
          )}

          {canWithdraw ? (
            /* Approved: show withdraw panel */
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <p style={{ fontSize: "11px", color: "#8888a8", marginBottom: 3 }}>Disponible para retirar</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "#4ade80" }}>{centsToUSD(referralBalance)}</p>
              </div>
              <button
                onClick={() => setShowWithdraw(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: "10px", background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
              >
                Retirar en efectivo <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            /* Not approved: CTA */
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <a
                href="/dashboard/afiliados"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: "10px", background: "transparent", color: "#e5e7eb", border: "1px solid #3a3a52", fontSize: "13px", fontWeight: 600, textDecoration: "none", transition: "border-color 0.15s" }}
              >
                Más información y solicitar <ChevronRight size={13} />
              </a>
              <span style={{ fontSize: "12px", color: "#555570" }}>
                ¿Ya estás aprobado?{" "}
                <a href="/dashboard/afiliados" style={{ color: "#6b7280", textDecoration: "underline" }}>
                  Ver tu panel →
                </a>
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
