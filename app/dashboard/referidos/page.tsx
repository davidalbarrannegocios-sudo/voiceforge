"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Gift, DollarSign, ArrowLeft, Copy, Check, ChevronRight, Info, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

/* ── Types & constants ───────────────────────────────────────── */
interface ReferralEntry {
  id: string;
  status: string;
  rewardChars: number;
  createdAt: string;
}

const REDEEM_PLANS = [
  { key: "starter",    label: "Starter",    price: 7,   chars: 200_000   },
  { key: "pro",        label: "Pro",         price: 13,  chars: 500_000   },
  { key: "elite",      label: "Elite",       price: 25,  chars: 1_000_000 },
  { key: "enterprise", label: "Enterprise",  price: 110, chars: 5_000_000 },
] as const;

const REDEEM_PACKS = [
  { key: "100k", label: "100K chars", price: 5,  chars: 100_000   },
  { key: "300k", label: "300K chars", price: 12, chars: 300_000   },
  { key: "600k", label: "600K chars", price: 19, chars: 600_000   },
  { key: "1m",   label: "1M chars",   price: 30, chars: 1_000_000 },
] as const;

function centsToUSD(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

/* ── Spinner ─────────────────────────────────────────────────── */
function Spin() {
  return (
    <svg style={{ width: 13, height: 13, animation: "spin 1s linear infinite", flexShrink: 0 }} fill="none" viewBox="0 0 24 24">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ── Withdraw modal ──────────────────────────────────────────── */
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

  const inp: React.CSSProperties = { background: "#0a0a0f", border: "1px solid #2a2a3e", color: "#e5e7eb", borderRadius: 10, padding: "10px 14px", width: "100%", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#8888a8", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 20, width: "100%", maxWidth: 420, padding: 28, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}><X size={18} /></button>
        <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Retirar en efectivo</h2>
        <p style={{ color: "#8888a8", fontSize: 13, margin: "0 0 20px" }}>Saldo disponible: <strong style={{ color: "#4ade80" }}>${maxAmount.toFixed(2)}</strong> · Mín. $20</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={lbl}>Método de pago</label>
            <div style={{ position: "relative", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: 8, padding: 3, display: "flex" }}>
              <div style={{ position: "absolute", top: 3, left: 3, width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "#1a1a2e", borderRadius: 5, border: "1px solid #2a2a3e", transition: "transform 0.2s", transform: `translateX(${method === "transfer" ? "100%" : "0%"})` }} />
              {(["paypal", "transfer"] as const).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)} style={{ flex: 1, position: "relative", zIndex: 1, padding: 8, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: method === m ? "#e5e7eb" : "#6b7280", transition: "color 0.2s" }}>
                  {m === "paypal" ? "PayPal" : "Transferencia"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Importe (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: 14 }}>$</span>
              <input style={{ ...inp, paddingLeft: 28 }} type="number" min="20" max={maxAmount} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="20.00" required />
            </div>
          </div>
          {method === "paypal" && (
            <div><label style={lbl}>Email de PayPal</label><input style={inp} type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} placeholder="tu@paypal.com" required /></div>
          )}
          {method === "transfer" && (
            <>
              <div><label style={lbl}>Nombre del banco</label><input style={inp} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Nombre del banco" required /></div>
              <div><label style={lbl}>IBAN</label><input style={inp} value={bankIban} onChange={e => setBankIban(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" required /></div>
            </>
          )}
          {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={!canSubmit || loading} style={{ padding: 12, background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: canSubmit && !loading ? "pointer" : "not-allowed", opacity: canSubmit && !loading ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading && <Spin />} Solicitar retiro
          </button>
        </form>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
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

  // Redeem
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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isLoaded && !isSignedIn) router.push("/sign-in"); }, [isLoaded, isSignedIn, router]);
  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const referralLink = referralCode ? `https://elitelabs.es/?ref=${referralCode}` : "";

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRedeem(type: "plan" | "chars") {
    const isP = type === "plan";
    if (isP) setRedeemingPlan(true); else setRedeemingChars(true);
    setRedeemMsg(null);
    try {
      const body = isP ? { type: "plan", planKey: selectedPlan } : { type: "chars", packKey: selectedPack };
      const res = await fetch("/api/referral/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setRedeemMsg({ ok: false, text: data.error ?? "Error al canjear" });
      } else {
        const item = isP ? REDEEM_PLANS.find(p => p.key === selectedPlan) : REDEEM_PACKS.find(p => p.key === selectedPack);
        setRedeemMsg({ ok: true, text: `¡${item?.chars.toLocaleString("es-ES")} caracteres añadidos!` });
        fetchReferral();
        setTimeout(() => setRedeemMsg(null), 5000);
      }
    } finally { if (isP) setRedeemingPlan(false); else setRedeemingChars(false); }
  }

  if (!isLoaded) return null;

  const currentPlan = REDEEM_PLANS.find(p => p.key === selectedPlan)!;
  const currentPack = REDEEM_PACKS.find(p => p.key === selectedPack)!;
  const canRedeemPlan = referralBalance >= currentPlan.price * 100;
  const canRedeemChars = referralBalance >= currentPack.price * 100;

  const redeemRowBtn = (active: boolean): React.CSSProperties => ({
    width: "100%", textAlign: "center", padding: "10px 14px", borderRadius: 10,
    cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s",
    background: active ? "#1a1a2e" : "transparent",
    border: `1px solid ${active ? "#3a3a5e" : "#2a2a3e"}`,
    color: active ? "#e5e7eb" : "#9ca3af",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e5e7eb" }}>
      {showWithdraw && (
        <WithdrawModal balance={referralBalance} onClose={() => setShowWithdraw(false)} onSuccess={() => {
          setWithdrawMsg("¡Solicitud enviada! Te contactaremos pronto.");
          fetchReferral();
          setTimeout(() => setWithdrawMsg(null), 6000);
        }} />
      )}

      {/* Nav */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, color: "#8888a8", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={15} /> Volver
        </button>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 32 }}>Gana recompensas de dos maneras</h1>

        {/* ── SECCIÓN 1 ── */}
        <div style={{ paddingBottom: 36, marginBottom: 36, borderBottom: "1px solid #1e1e2e" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Gift size={15} style={{ color: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Comparte tu enlace y obtén créditos de producto</span>
              <button style={{ background: "none", border: "none", cursor: "default", color: "#555570", padding: 0, display: "flex" }} title="Comparte tu enlace y cuando alguien pague recibirás saldo canjeable por caracteres."><Info size={13} /></button>
            </div>
            <button onClick={() => setShowHistory(h => !h)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap", flexShrink: 0 }}>
              Ver historial de recompensas <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "40px 48px", alignItems: "start" }}>
            {/* Left */}
            <div>
              <p style={{ fontSize: 12, color: "#8888a8", marginBottom: 8 }}>Tu enlace único:</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <div style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "1px solid #2a2a3e", fontSize: 13, fontFamily: "monospace", color: "#93c5fd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loading ? "—" : (referralLink || "—")}
                </div>
                <button onClick={handleCopy} disabled={!referralLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "1px solid #2a2a3e", background: "transparent", cursor: referralLink ? "pointer" : "not-allowed", color: copied ? "#4ade80" : "#9ca3af", flexShrink: 0, opacity: referralLink ? 1 : 0.4 }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: "#8888a8" }}>Disponible para canjear</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", lineHeight: 1 }}>{loading ? "—" : centsToUSD(referralBalance)}</p>
                </div>
                <div style={{ width: 1, height: 40, background: "#2a2a3e" }} />
                <div>
                  <p style={{ fontSize: 11, color: "#8888a8", marginBottom: 4 }}>Créditos Totales Ganados</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{loading ? "—" : centsToUSD(referralEarned)}</p>
                </div>
              </div>
            </div>

            {/* Right: Canjear */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#555570", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Canjear</p>
              <button onClick={() => setOpenRedeem(o => o === "plan" ? null : "plan")} style={redeemRowBtn(openRedeem === "plan")}>Plan de 1 mes</button>
              {openRedeem === "plan" && (
                <div style={{ marginTop: 8, padding: 14, background: "#0d0d17", borderRadius: 10, border: "1px solid #2a2a3e", marginBottom: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {REDEEM_PLANS.map(p => (
                      <button key={p.key} onClick={() => setSelectedPlan(p.key)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", ...(selectedPlan === p.key ? { background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" } : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a3e" }) }}>
                        {p.label} <span style={{ opacity: 0.7 }}>${p.price}</span>
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{currentPlan.chars.toLocaleString("es-ES")} chars{!canRedeemPlan && <span style={{ color: "#f87171" }}> · saldo insuficiente</span>}</p>
                  <button onClick={() => handleRedeem("plan")} disabled={!canRedeemPlan || redeemingPlan} style={{ width: "100%", padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: canRedeemPlan && !redeemingPlan ? "pointer" : "not-allowed", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", opacity: canRedeemPlan && !redeemingPlan ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {redeemingPlan && <Spin />} Canjear plan
                  </button>
                </div>
              )}
              <button onClick={() => setOpenRedeem(o => o === "chars" ? null : "chars")} style={{ ...redeemRowBtn(openRedeem === "chars"), marginTop: openRedeem === "plan" ? 0 : 8 }}>Caracteres extra</button>
              {openRedeem === "chars" && (
                <div style={{ marginTop: 8, padding: 14, background: "#0d0d17", borderRadius: 10, border: "1px solid #2a2a3e" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {REDEEM_PACKS.map(p => (
                      <button key={p.key} onClick={() => setSelectedPack(p.key)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", ...(selectedPack === p.key ? { background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)" } : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a3e" }) }}>
                        {p.label} <span style={{ opacity: 0.7 }}>${p.price}</span>
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{currentPack.chars.toLocaleString("es-ES")} chars{!canRedeemChars && <span style={{ color: "#f87171" }}> · saldo insuficiente</span>}</p>
                  <button onClick={() => handleRedeem("chars")} disabled={!canRedeemChars || redeemingChars} style={{ width: "100%", padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: canRedeemChars && !redeemingChars ? "pointer" : "not-allowed", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", opacity: canRedeemChars && !redeemingChars ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {redeemingChars && <Spin />} Canjear
                  </button>
                </div>
              )}
              {redeemMsg && <p style={{ fontSize: 12, marginTop: 10, fontWeight: 600, color: redeemMsg.ok ? "#4ade80" : "#f87171" }}>{redeemMsg.ok ? "✓ " : ""}{redeemMsg.text}</p>}
            </div>
          </div>

          {/* History */}
          {showHistory && (
            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 14 }}>Historial de recompensas</p>
              {referrals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <Gift size={24} style={{ color: "#2a2a3e", marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "#6b7280" }}>Aún no tienes referidos</p>
                </div>
              ) : referrals.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "#0d0d17", border: "1px solid #1e1e2e", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{i + 1}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb" }}>Referido #{i + 1}</p>
                      <p style={{ fontSize: 11, color: "#6b7280" }}>{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: "999px", ...(r.status === "claimed" ? { background: "rgba(34,197,94,0.12)", color: "#4ade80" } : r.status === "rewarded" ? { background: "rgba(59,130,246,0.12)", color: "#93c5fd" } : { background: "rgba(255,255,255,0.06)", color: "#8888a8" }) }}>
                    {r.status === "claimed" ? "Canjeado" : r.status === "rewarded" ? "Completado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECCIÓN 2 ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <DollarSign size={15} style={{ color: canWithdraw ? "#4ade80" : "#eab308", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Comparte tu enlace y recibe comisiones en efectivo</span>
            {canWithdraw && <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: "999px", background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", flexShrink: 0 }}>Afiliado aprobado</span>}
            <button style={{ background: "none", border: "none", cursor: "default", color: "#555570", padding: 0, display: "flex" }} title="Gana un 5% en efectivo por cada pago de tus referidos. Requiere aprobación previa."><Info size={13} /></button>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
            Gana un <strong style={{ color: "#e5e7eb" }}>5% de comisión en efectivo</strong> por cada referido que pague
          </p>
          {withdrawMsg && <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 14 }}>✓ {withdrawMsg}</p>}
          {canWithdraw ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 11, color: "#8888a8", marginBottom: 3 }}>Disponible para retirar</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>{centsToUSD(referralBalance)}</p>
              </div>
              <button onClick={() => setShowWithdraw(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Retirar en efectivo <ChevronRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <a href="/dashboard/afiliados" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "transparent", color: "#e5e7eb", border: "1px solid #3a3a52", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Más información y solicitar
              </a>
              <span style={{ fontSize: 13, color: "#555570" }}>
                ¿Ya estás aprobado?{" "}
                <a href="/dashboard/afiliados" style={{ color: "#6b7280", textDecoration: "underline" }}>Ver tu panel →</a>
              </span>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
