"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/CustomSelect";
import {
  LayoutDashboard, Users, CreditCard, Mic2, Ticket, Handshake, Wallet,
  BarChart2, Settings, RefreshCw, Check, X, AlertTriangle, Play, Pause,
  ExternalLink, Search, Filter, Plus, Minus, ArrowLeft, ChevronRight,
  ScrollText, Monitor, ChevronDown, Trash2, ShieldOff, Clock,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */
const PLAN_PRICE: Record<string, number> = { free: 0, starter: 7, pro: 13, elite: 25, enterprise: 110 };

interface AffiliateApplication {
  id: string; name: string; email: string; platform: string;
  audience: string; paymentMethod: string; status: string; createdAt: string;
}
interface WithdrawalRequest {
  id: string; userId: string; amount: number; method: string;
  details: Record<string, string>; status: string; createdAt: string;
  paidAt: string | null; user: { email: string };
}
interface AdminUser {
  id: string; clerkId: string; email: string; credits: number; plan: string; role: string;
  createdAt: string; stripeSubscriptionId: string | null;
  stripeCustomerId: string | null; planExpiresAt: string | null;
  billingInterval: string; creditsRenewedAt: string | null;
  disabledUntil: string | null;
  _count: { generations: number };
}
interface StripeSubDetail {
  noSubscription?: boolean; subscriptionId?: string; customerId?: string | null;
  status?: string; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: string | null;
  cancelAt?: string | null; interval?: string | null; error?: string;
}
interface Stats {
  totalUsers: number; totalGenerations: number;
  totalCreditsConsumed: number; totalRevenueDollars: string;
}
interface SupportTicket {
  id: string; type: string; description: string; status: string;
  adminReply: string | null; createdAt: string;
  user: { email: string; plan: string };
}
const TICKET_TYPE_LABELS: Record<string, string> = {
  general: "Ayuda general", technical: "Problema técnico",
  billing: "Facturación", refund: "Reembolso", other: "Otro",
};
interface Generation {
  id: string; status: string; text: string; voiceName: string | null;
  audioUrl: string | null; creditsUsed: number; durationSeconds: number | null;
  error: string | null; refunded: boolean; createdAt: string;
}
interface UserDetail {
  user: { id: string; email: string; credits: number; plan: string; role: string; createdAt: string };
  generations: Generation[];
}
interface Payment {
  id: string; stripeSessionId: string; paymentIntentId: string | null;
  amount: number; creditsPurchased: number; status: string;
  amountRefunded: number; last4: string | null; createdAt: string;
}

type Section = "dashboard" | "users" | "subscriptions" | "engines" | "support" | "affiliates" | "withdrawals" | "analytics" | "config" | "logs";

interface UserSession {
  id: string; ip: string | null; browser: string | null; os: string | null;
  device: string | null; country: string | null; city: string | null; createdAt: string;
}

interface AppLog {
  id: string; level: string; category: string; message: string;
  details: string | null; userId: string | null; createdAt: string;
}

/* ─── Style helpers ───────────────────────────────────────── */
const card = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const input = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "0.5rem",
  color: "#fff",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
} as const;

const btn = (color = "#ffffff", extra: React.CSSProperties = {}) =>
  ({
    background: color,
    border: "none",
    borderRadius: "0.5rem",
    color: color === "#ffffff" ? "#000000" : "#fff",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    ...extra,
  } as const);

const SIDEBAR_W = 220;

/* ─── Helper components ───────────────────────────────────── */
function StatusDot({ color }: { color: "green" | "yellow" | "red" | "gray" }) {
  const colors = { green: "#4ade80", yellow: "#fbbf24", red: "#f87171", gray: "#555555" };
  const c = colors[color];
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10 }}>
      {color === "green" && (
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, opacity: 0.4, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
      )}
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0, display: "inline-block" }} />
    </span>
  );
}

function Tag({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "999px",
      fontSize: "0.7rem", fontWeight: 700,
      background: isAdmin ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
      color: isAdmin ? "#aaaaaa" : "#888888",
      border: `1px solid ${isAdmin ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
    }}>
      {isAdmin ? "admin" : "user"}
    </span>
  );
}

function AudioCell({ url }: { url?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }
  return (
    <>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} style={btn(playing ? "#6b7280" : "#ffffff", { padding: "0.3rem 0.7rem", fontSize: "0.75rem" })}>
        {playing ? <><Pause size={11} style={{ display: "inline", marginRight: 4 }} />Parar</> : <><Play size={11} style={{ display: "inline", marginRight: 4 }} />Escuchar</>}
      </button>
    </>
  );
}

function SimpleBarChart({ data, height = 80 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: height, width: "100%" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
          <div
            title={`${d.label}: ${d.value}`}
            style={{
              width: "100%", borderRadius: "3px 3px 0 0",
              background: d.value > 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.05)",
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 2)}%`,
              transition: "height 0.3s",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={card}>
      <p style={{ color: "#555555", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>{label}</p>
      <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: "0.72rem", color: "#555555", marginTop: "4px" }}>{sub}</p>}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: "#555555", starter: "#3b82f6", pro: "#8b5cf6", elite: "#f59e0b", enterprise: "#10b981",
  };
  const c = colors[plan] ?? "#555555";
  return (
    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: c, background: `${c}22`, border: `1px solid ${c}55`, whiteSpace: "nowrap", textTransform: "uppercase" }}>
      {plan}
    </span>
  );
}

/* ─── User Detail Modal ───────────────────────────────────── */
function UserDetailModal({
  userId, onClose, toast,
}: {
  userId: string; onClose: () => void; toast: (msg: string, ok?: boolean) => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"generaciones" | "pagos" | "accesos">("generaciones");
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [refundingPayment, setRefundingPayment] = useState<string | null>(null);
  const [stripeSub, setStripeSub] = useState<StripeSubDetail | null>(null);
  const [stripeSubLoading, setStripeSubLoading] = useState(false);
  const [planValue, setPlanValue] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/generations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetail(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error cargando detalle", false);
      onClose();
    } finally { setLoading(false); }
  }, [userId, toast, onClose]);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/payments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error cargando pagos", false);
    } finally { setPaymentsLoading(false); }
  }, [userId, toast]);

  const fetchStripeSub = useCallback(async () => {
    setStripeSubLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`);
      const data = await res.json();
      setStripeSub(data);
    } catch { setStripeSub({ error: "Error de conexión" }); }
    finally { setStripeSubLoading(false); }
  }, [userId]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { setSessions([]); }
    finally { setSessionsLoading(false); }
  }, [userId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => { fetchStripeSub(); }, [fetchStripeSub]);
  useEffect(() => { if (detail?.user.plan) setPlanValue(detail.user.plan); }, [detail]);
  useEffect(() => { if (modalTab === "pagos" && payments === null) fetchPayments(); }, [modalTab, payments, fetchPayments]);
  useEffect(() => { if (modalTab === "accesos" && sessions === null) fetchSessions(); }, [modalTab, sessions, fetchSessions]);

  async function handleAssignPlan() {
    if (!planValue || planValue === detail?.user.plan) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Plan actualizado a "${data.plan}". Créditos: ${data.credits.toLocaleString("es-ES")}`);
      fetchDetail();
    } catch (e) { toast(e instanceof Error ? e.message : "Error asignando plan", false); }
    finally { setPlanLoading(false); }
  }

  async function handleRefund(gen: Generation) {
    setRefunding(gen.id);
    try {
      const res = await fetch(`/api/admin/users/${userId}/refund`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: gen.id, creditsToRefund: gen.creditsUsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Devueltos ${gen.creditsUsed.toLocaleString("es-ES")} créditos. Nuevo saldo: ${data.newCredits.toLocaleString("es-ES")}`);
      fetchDetail();
    } catch (e) { toast(e instanceof Error ? e.message : "Error en reembolso", false); }
    finally { setRefunding(null); }
  }

  async function handleRefundPayment(payment: Payment) {
    if (!payment.paymentIntentId) { toast("Sin payment intent", false); return; }
    setRefundingPayment(payment.id);
    try {
      const res = await fetch(`/api/admin/users/${userId}/refund-payment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: payment.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Reembolso de $${payment.amount.toFixed(2)} procesado. Créditos deducidos: ${data.creditsDeducted.toLocaleString("es-ES")}`);
      setPayments(null); fetchPayments(); fetchDetail();
    } catch (e) { toast(e instanceof Error ? e.message : "Error en reembolso Stripe", false); }
    finally { setRefundingPayment(null); }
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; color: string }> = {
      succeeded: { label: "COMPLETADO", color: "#4ade80" },
      refunded: { label: "REEMBOLSADO", color: "#f59e0b" },
      canceled: { label: "CANCELADO", color: "#f87171" },
      failed: { label: "FALLIDO", color: "#f87171" },
    };
    const s = map[status] ?? { label: status.toUpperCase(), color: "#888888" };
    return <span style={{ color: s.color, fontSize: "0.7rem", fontWeight: 700 }}>{s.label}</span>;
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem", overflowY: "auto" }}
    >
      <div style={{ width: "100%", maxWidth: "960px", background: "#111111", borderRadius: "1.25rem", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontWeight: 700, fontSize: "1rem" }}>Detalle de usuario</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888888", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>
            <X size={18} />
          </button>
        </div>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555555" }}>Cargando...</div>
        ) : detail ? (
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Email", value: detail.user.email },
                { label: "Créditos", value: detail.user.credits.toLocaleString("es-ES") },
                { label: "Rol", value: detail.user.role },
                { label: "Registro", value: new Date(detail.user.createdAt).toLocaleDateString("es-ES") },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "0.75rem 1rem" }}>
                  <p style={{ color: "#555555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>{label}</p>
                  <p style={{ color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 600, wordBreak: "break-all" }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", background: "#000000", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555555", marginBottom: "0.75rem" }}>Estado Stripe</p>
              {stripeSubLoading ? (
                <p style={{ color: "#555555", fontSize: "0.8rem" }}>Consultando Stripe...</p>
              ) : stripeSub?.noSubscription ? (
                <p style={{ color: "#555555", fontSize: "0.8rem" }}>Sin suscripción en Stripe</p>
              ) : stripeSub?.error ? (
                <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{stripeSub.error}</p>
              ) : stripeSub ? (() => {
                const statusColors: Record<string, string> = { active: "#4ade80", canceled: "#f87171", past_due: "#f59e0b", trialing: "#aaaaaa", incomplete: "#f59e0b", unpaid: "#f87171" };
                const statusLabels: Record<string, string> = { active: "ACTIVO", canceled: "CANCELADO", past_due: "PAGO PENDIENTE", trialing: "TRIAL", incomplete: "INCOMPLETO", unpaid: "IMPAGADO" };
                const col = statusColors[stripeSub.status ?? ""] ?? "#888888";
                const lbl = statusLabels[stripeSub.status ?? ""] ?? (stripeSub.status ?? "").toUpperCase();
                const periodDate = stripeSub.currentPeriodEnd ? new Date(stripeSub.currentPeriodEnd).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : null;
                const cancelDate = stripeSub.cancelAt ? new Date(stripeSub.cancelAt).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : null;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", color: col, background: `${col}22`, border: `1px solid ${col}55` }}>{lbl}</span>
                    {stripeSub.cancelAtPeriodEnd && periodDate && <span style={{ fontSize: "0.78rem", color: "#f59e0b", fontWeight: 600 }}><AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} />Cancela el {periodDate}</span>}
                    {!stripeSub.cancelAtPeriodEnd && stripeSub.status === "active" && periodDate && <span style={{ fontSize: "0.78rem", color: "#4ade80" }}>Renueva el {periodDate}</span>}
                    {stripeSub.status === "past_due" && <span style={{ fontSize: "0.78rem", color: "#f87171", fontWeight: 600 }}><X size={12} style={{ display: "inline", marginRight: 4 }} />Pago pendiente — requiere acción</span>}
                    {stripeSub.status === "canceled" && cancelDate && <span style={{ fontSize: "0.78rem", color: "#f87171" }}>Cancelado el {cancelDate}</span>}
                    <span style={{ fontSize: "0.72rem", color: "#6b7280", padding: "1px 8px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.08)" }}>{stripeSub.interval === "year" ? "Anual" : "Mensual"}</span>
                    {stripeSub.customerId && (
                      <a href={`https://dashboard.stripe.com/customers/${stripeSub.customerId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#aaaaaa", textDecoration: "none", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Ver en Stripe <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                );
              })() : null}
            </div>
            <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", background: "#000000", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555555", marginBottom: "0.75rem" }}>
                Plan actual: <span style={{ color: "#e5e7eb" }}>{detail.user.plan}</span>
              </p>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <CustomSelect
                  options={["free", "starter", "pro", "elite", "enterprise"].map((p) => ({ value: p, label: p }))}
                  value={planValue} onChange={setPlanValue} style={{ minWidth: "160px" }}
                />
                <button onClick={handleAssignPlan} disabled={planLoading || !planValue || planValue === detail.user.plan} style={btn("#ffffff", { opacity: planLoading || planValue === detail.user.plan ? 0.5 : 1 })}>
                  {planLoading ? "Asignando..." : "Asignar plan"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "1rem" }}>
              {(["generaciones", "pagos", "accesos"] as const).map((t) => (
                <button key={t} onClick={() => setModalTab(t)} style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: modalTab === t ? "#fff" : "#555555", borderBottom: modalTab === t ? "2px solid #ffffff" : "2px solid transparent", textTransform: "capitalize" }}>
                  {t === "generaciones" ? `Generaciones (${detail.generations.length})` : t === "pagos" ? "Pagos" : "Accesos"}
                </button>
              ))}
            </div>
            {modalTab === "generaciones" && (
              detail.generations.length === 0 ? (
                <p style={{ color: "#555555", fontSize: "0.85rem", padding: "1rem 0" }}>Sin generaciones.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {["Fecha", "Texto", "Duración", "Créditos", "Estado", "Audio", "Acción"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.generations.map((g) => {
                        const isProcessing = g.status === "processing";
                        const isError = g.status === "error";
                        return (
                          <tr key={g.id} style={{ borderBottom: "1px solid #1a1a1a", opacity: g.refunded ? 0.5 : 1 }}>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#555555", whiteSpace: "nowrap" }}>{new Date(g.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", maxWidth: "220px" }}>
                              <span title={g.text}>{g.text.slice(0, 50)}{g.text.length > 50 ? "…" : ""}</span>
                              {g.voiceName && <span style={{ display: "block", fontSize: "0.7rem", color: "#555555", marginTop: "2px" }}>{g.voiceName}</span>}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>{g.durationSeconds != null ? `${g.durationSeconds.toFixed(1)}s` : "—"}</td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#aaaaaa", fontWeight: 600 }}>{g.creditsUsed.toLocaleString("es-ES")}</td>
                            <td style={{ padding: "0.6rem 0.75rem", maxWidth: "180px" }}>
                              {g.refunded ? <span style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: 700 }}>REEMBOLSADO</span>
                                : isProcessing ? <span style={{ color: "#60a5fa", fontSize: "0.7rem", fontWeight: 700 }}>PROCESANDO</span>
                                : isError ? <><span style={{ color: "#f87171", fontSize: "0.7rem", fontWeight: 700 }}>ERROR</span>{g.error && <span title={g.error} style={{ display: "block", fontSize: "0.65rem", color: "#6b7280", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.error.slice(0, 80)}</span>}</>
                                : <span style={{ color: "#4ade80", fontSize: "0.7rem", fontWeight: 700 }}>COMPLETADO</span>}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}><AudioCell url={g.audioUrl ?? undefined} /></td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                              {!g.refunded && g.status === "done" && (
                                <button onClick={() => handleRefund(g)} disabled={refunding === g.id} style={btn("#6b7280", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", opacity: refunding === g.id ? 0.6 : 1 })}>
                                  {refunding === g.id ? "..." : "Devolver créditos"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
            {modalTab === "pagos" && (
              paymentsLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#555555" }}>Consultando Stripe...</div>
              ) : payments === null ? null : payments.length === 0 ? (
                <p style={{ color: "#555555", fontSize: "0.85rem", padding: "1rem 0" }}>Sin pagos registrados.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {["Fecha", "Importe", "Reembolsado", "Caracteres", "Tarjeta", "Estado", "Acción"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1a1a1a", opacity: p.status === "refunded" ? 0.55 : 1 }}>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#555555", whiteSpace: "nowrap" }}>{new Date(p.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#4ade80", fontWeight: 600 }}>${p.amount.toFixed(2)}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: p.amountRefunded > 0 ? "#f59e0b" : "#555555" }}>{p.amountRefunded > 0 ? `$${p.amountRefunded.toFixed(2)}` : "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#aaaaaa", fontWeight: 600 }}>{p.creditsPurchased.toLocaleString("es-ES")}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{p.last4 ? `•••• ${p.last4}` : "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>{statusBadge(p.status)}</td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>
                            {p.status === "succeeded" && p.paymentIntentId && (
                              <button onClick={() => handleRefundPayment(p)} disabled={refundingPayment === p.id} style={btn("#ef4444", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", opacity: refundingPayment === p.id ? 0.6 : 1 })}>
                                {refundingPayment === p.id ? "..." : "Reembolsar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
            {modalTab === "accesos" && (
              sessionsLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#555555" }}>Cargando accesos...</div>
              ) : !sessions || sessions.length === 0 ? (
                <p style={{ color: "#555555", fontSize: "0.85rem", padding: "1rem 0" }}>Sin accesos registrados.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {["Fecha", "IP", "País", "Ciudad", "Navegador", "OS", "Dispositivo"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #1a1a1a", background: i === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(s.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#aaaaaa", fontFamily: "monospace" }}>{s.ip ?? "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.country ?? "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.city ?? "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.browser ?? "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.os ?? "—"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.device ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Affiliate Detail Modal ──────────────────────────────── */
function AffiliateDetailModal({
  app, onClose, onUpdate, toast,
}: {
  app: AffiliateApplication; onClose: () => void;
  onUpdate: (id: string, status: "approved" | "rejected") => Promise<void>;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function handle(status: "approved" | "rejected") {
    setLoading(status);
    try {
      await onUpdate(app.id, status);
      toast(status === "approved" ? "Solicitud aprobada" : "Solicitud rechazada", status === "approved");
      onClose();
    } catch { toast("Error al actualizar", false); }
    finally { setLoading(null); }
  }

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#555555", width: 140, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: "0.875rem", color: "#e5e7eb", wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  const statusColor = app.status === "approved" ? "#4ade80" : app.status === "rejected" ? "#f87171" : "#fbbf24";
  const statusBg = app.status === "approved" ? "rgba(74,222,128,0.12)" : app.status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)";
  const statusBorder = app.status === "approved" ? "rgba(74,222,128,0.3)" : app.status === "rejected" ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)";
  const statusLabel = app.status === "approved" ? "Aprobado" : app.status === "rejected" ? "Rechazado" : "Pendiente";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", width: "100%", maxWidth: "520px", padding: "28px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#fff", margin: 0 }}>Solicitud de afiliado</p>
            <p style={{ fontSize: "0.75rem", color: "#555555", margin: "4px 0 0" }}>{app.id}</p>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>{statusLabel}</span>
        </div>
        {row("Nombre", app.name)}
        {row("Email", app.email)}
        {row("Canal / Plataforma", app.platform)}
        {row("Audiencia estimada", app.audience)}
        {row("Método de pago", app.paymentMethod === "paypal" ? "PayPal" : "Transferencia internacional")}
        {row("Fecha de solicitud", new Date(app.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }))}
        {row("Estado actual", statusLabel)}
        {app.status === "pending" && (
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button onClick={() => handle("approved")} disabled={loading !== null} style={{ ...btn("#16a34a"), flex: 1, opacity: loading ? 0.6 : 1 }}>
              {loading === "approved" ? "Aprobando..." : "Aprobar"}
            </button>
            <button onClick={() => handle("rejected")} disabled={loading !== null} style={{ ...btn("#dc2626"), flex: 1, opacity: loading ? 0.6 : 1 }}>
              {loading === "rejected" ? "Rechazando..." : "Rechazar"}
            </button>
          </div>
        )}
        <button onClick={onClose} style={{ ...btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#888888" }), width: "100%", marginTop: app.status === "pending" ? "8px" : "20px" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

/* ─── Section: Dashboard ──────────────────────────────────── */
function DashboardSection({
  users, stats, tickets, withdrawals, affiliates, onNav,
}: {
  users: AdminUser[]; stats: Stats | null; tickets: SupportTicket[];
  withdrawals: WithdrawalRequest[]; affiliates: AffiliateApplication[];
  onNav: (s: Section) => void;
}) {
  const pendingTickets = tickets.filter(t => t.status === "open").length;
  const pendingAffiliates = affiliates.filter(a => a.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending").length;

  // 30-day new users bar chart
  const now = new Date();
  const days30: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const value = users.filter(u => u.createdAt.slice(0, 10) === key).length;
    days30.push({ label, value });
  }

  const top5Gen = [...users].sort((a, b) => b._count.generations - a._count.generations).slice(0, 5);

  const mrr = stats ? `$${stats.totalRevenueDollars}/mes` : "—";

  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Dashboard</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Usuarios totales" value={stats ? stats.totalUsers.toLocaleString("es-ES") : "—"} />
        <StatCard label="MRR estimado" value={mrr} />
        <StatCard label="Generaciones totales" value={stats ? stats.totalGenerations.toLocaleString("es-ES") : "—"} />
        <StatCard label="Créditos consumidos" value={stats ? stats.totalCreditsConsumed.toLocaleString("es-ES") : "—"} />
      </div>

      {/* Alerts row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { label: "Tickets abiertos", count: pendingTickets, color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", section: "support" as Section },
          { label: "Afiliados pendientes", count: pendingAffiliates, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", section: "affiliates" as Section },
          { label: "Retiros pendientes", count: pendingWithdrawals, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", section: "withdrawals" as Section },
        ].map(({ label, count, color, bg, border, section }) => (
          <button key={label} onClick={() => onNav(section)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderRadius: "10px", background: count > 0 ? bg : "rgba(255,255,255,0.03)", border: `1px solid ${count > 0 ? border : "rgba(255,255,255,0.08)"}`, cursor: "pointer", color: count > 0 ? color : "#555555", fontSize: "13px", fontWeight: 600 }}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: count > 0 ? color : "#555555" }}>{count}</span>
            {label}
            <ChevronRight size={13} style={{ opacity: 0.6 }} />
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* 30-day chart */}
        <div style={card}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Nuevos usuarios (30 días)</p>
          <SimpleBarChart data={days30} height={80} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "10px", color: "#444444" }}>{days30[0]?.label}</span>
            <span style={{ fontSize: "10px", color: "#444444" }}>{days30[days30.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top 5 users */}
        <div style={card}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Top 5 usuarios por generaciones</p>
          {top5Gen.length === 0 ? (
            <p style={{ color: "#555555", fontSize: "0.8rem" }}>Sin datos</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {top5Gen.map((u, i) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: 18, fontSize: "11px", color: "#444444", fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: "12px", color: "#888888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{u._count.generations}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Users ──────────────────────────────────────── */
function UsersSection({
  users, onSelectUser, creditState, roleState, onCredits, onRole, search, onSearch,
  onDeleteUser, onBanUser, onSuspendUser,
}: {
  users: AdminUser[];
  onSelectUser: (id: string) => void;
  creditState: { userId: string; amount: string; op: "add" | "subtract"; loading: boolean; setUserId: (v: string) => void; setAmount: (v: string) => void; setOp: (v: "add" | "subtract") => void };
  roleState: { userId: string; role: "admin" | "user"; loading: boolean; setUserId: (v: string) => void; setRole: (v: "admin" | "user") => void };
  onCredits: (e: React.FormEvent) => void;
  onRole: (e: React.FormEvent) => void;
  search: string;
  onSearch: (v: string) => void;
  onDeleteUser: (id: string) => Promise<void>;
  onBanUser: (id: string) => Promise<void>;
  onSuspendUser: (id: string, until: string) => Promise<void>;
}) {
  const [planFilter, setPlanFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendDate, setSuspendDate] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function copyId(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  async function doDelete(u: AdminUser) {
    setActionLoading(u.id + "_delete");
    try { await onDeleteUser(u.id); } finally { setActionLoading(null); setConfirmDelete(null); }
  }

  async function doBan(u: AdminUser, e: React.MouseEvent) {
    e.stopPropagation();
    setActionLoading(u.id + "_ban");
    try { await onBanUser(u.id); } finally { setActionLoading(null); }
  }

  async function doSuspend() {
    if (!suspendTarget || !suspendDate) return;
    setActionLoading(suspendTarget.id + "_suspend");
    try { await onSuspendUser(suspendTarget.id, suspendDate); } finally { setActionLoading(null); setSuspendTarget(null); setSuspendDate(""); }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search);
    const matchPlan = planFilter === "all" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const isSuspended = (u: AdminUser) => !!u.disabledUntil && new Date(u.disabledUntil) > new Date();

  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Usuarios</p>
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555555" }} />
          <input style={{ ...input, paddingLeft: "32px" }} placeholder="Buscar por email o ID..." value={search} onChange={e => onSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["all", "free", "starter", "pro", "elite", "enterprise"].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)} style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: `1px solid ${planFilter === p ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`, background: planFilter === p ? "rgba(255,255,255,0.1)" : "transparent", color: planFilter === p ? "#fff" : "#555555", cursor: "pointer" }}>
              {p === "all" ? "Todos" : p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginBottom: "1.5rem", padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0d0d0d" }}>
                {["CUID", "Email", "Plan", "Créditos", "Generaciones", "Rol", "Registro", "Acciones"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#0d0d0d" : "#111111", cursor: "pointer" }} onClick={() => onSelectUser(u.id)}>
                  <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span title={u.id} style={{ fontFamily: "monospace", fontSize: "11px", color: "#666666" }}>{u.id.slice(0, 8)}…</span>
                      <button
                        onClick={e => copyId(u.id, e)}
                        title={copiedId === u.id ? "Copiado!" : "Copiar CUID"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "4px", fontSize: "11px", color: copiedId === u.id ? "#4ade80" : "#555555", transition: "color 0.15s" }}
                      >
                        {copiedId === u.id ? "✓" : "⎘"}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#e5e7eb" }}>{u.email}</span>
                      {isSuspended(u) && <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "rgba(234,179,8,0.15)", color: "#facc15", border: "1px solid rgba(234,179,8,0.3)" }}>SUSPENDIDO</span>}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}><PlanBadge plan={u.plan} /></td>
                  <td style={{ padding: "10px 14px", color: "#aaaaaa", fontWeight: 600 }}>{u.credits.toLocaleString("es-ES")}</td>
                  <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{u._count.generations}</td>
                  <td style={{ padding: "10px 14px" }}><Tag role={u.role} /></td>
                  <td style={{ padding: "10px 14px", color: "#555555", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString("es-ES")}</td>
                  <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button onClick={() => onSelectUser(u.id)} style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#aaaaaa", padding: "0.2rem 0.55rem", fontSize: "0.7rem" })}>
                        Ver
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSuspendTarget(u); setSuspendDate(""); }}
                        title={isSuspended(u) ? `Suspendido hasta ${new Date(u.disabledUntil!).toLocaleDateString("es-ES")}` : "Suspender temporalmente"}
                        style={{ background: "none", border: "1px solid rgba(234,179,8,0.25)", cursor: "pointer", padding: "4px 6px", borderRadius: "6px", color: isSuspended(u) ? "#facc15" : "#555555", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                        disabled={actionLoading === u.id + "_suspend"}
                      >
                        <Clock size={13} />
                      </button>
                      <button
                        onClick={e => doBan(u, e)}
                        title="Banear usuario en Clerk"
                        style={{ background: "none", border: "1px solid rgba(251,146,60,0.25)", cursor: "pointer", padding: "4px 6px", borderRadius: "6px", color: "#555555", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                        disabled={actionLoading === u.id + "_ban"}
                      >
                        <ShieldOff size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(u); }}
                        title="Eliminar usuario"
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", padding: "4px 6px", borderRadius: "6px", color: "#555555", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                        disabled={actionLoading === u.id + "_delete"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#555555" }}>No se encontraron usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px" }}>Gestión de créditos</p>
          <form onSubmit={onCredits} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#888888", display: "block", marginBottom: "0.35rem" }}>ID de usuario</label>
              <input style={input} placeholder="cuid del usuario" value={creditState.userId} onChange={e => creditState.setUserId(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "#888888", display: "block", marginBottom: "0.35rem" }}>Cantidad</label>
                <input style={input} type="number" min="1" placeholder="0" value={creditState.amount} onChange={e => creditState.setAmount(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "#888888", display: "block", marginBottom: "0.35rem" }}>Operación</label>
                <CustomSelect
                  options={[{ value: "add", label: "Añadir" }, { value: "subtract", label: "Quitar" }]}
                  value={creditState.op}
                  onChange={(v) => creditState.setOp(v as "add" | "subtract")}
                  className="w-full"
                />
              </div>
            </div>
            <button type="submit" disabled={creditState.loading} style={{ ...btn(creditState.op === "add" ? "#ffffff" : "#ef4444"), opacity: creditState.loading ? 0.6 : 1 }}>
              {creditState.loading ? "Procesando..." : creditState.op === "add" ? "Añadir créditos" : "Quitar créditos"}
            </button>
          </form>
        </div>
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "14px" }}>Gestión de roles</p>
          <form onSubmit={onRole} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#888888", display: "block", marginBottom: "0.35rem" }}>ID de usuario</label>
              <input style={input} placeholder="cuid del usuario" value={roleState.userId} onChange={e => roleState.setUserId(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#888888", display: "block", marginBottom: "0.35rem" }}>Nuevo rol</label>
              <CustomSelect
                options={[{ value: "user", label: "user" }, { value: "admin", label: "admin" }]}
                value={roleState.role}
                onChange={(v) => roleState.setRole(v as "admin" | "user")}
                className="w-full"
              />
            </div>
            <button type="submit" disabled={roleState.loading} style={{ ...btn(), opacity: roleState.loading ? 0.6 : 1 }}>
              {roleState.loading ? "Actualizando..." : "Cambiar rol"}
            </button>
          </form>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px", width: "360px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={16} color="#f87171" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#fff", margin: 0 }}>Eliminar usuario</p>
                <p style={{ fontSize: "11px", color: "#555555", margin: 0 }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#aaaaaa", lineHeight: 1.5 }}>
              ¿Eliminar permanentemente a <span style={{ color: "#fff", fontWeight: 600 }}>{confirmDelete.email}</span> de Clerk y la base de datos?
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setConfirmDelete(null)} style={btn("#1a1a1a", { flex: 1, border: "1px solid rgba(255,255,255,0.08)", color: "#888888" })}>Cancelar</button>
              <button onClick={() => doDelete(confirmDelete)} disabled={actionLoading === confirmDelete.id + "_delete"} style={{ ...btn("#ef4444"), flex: 1, opacity: actionLoading === confirmDelete.id + "_delete" ? 0.6 : 1 }}>
                {actionLoading === confirmDelete.id + "_delete" ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {suspendTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px", width: "380px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(234,179,8,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={16} color="#facc15" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#fff", margin: 0 }}>Suspender cuenta</p>
                <p style={{ fontSize: "11px", color: "#555555", margin: 0 }}>{suspendTarget.email}</p>
              </div>
            </div>
            {isSuspended(suspendTarget) && (
              <p style={{ fontSize: "12px", color: "#facc15", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", padding: "8px 12px" }}>
                Suspendido hasta {new Date(suspendTarget.disabledUntil!).toLocaleDateString("es-ES")}
              </p>
            )}
            <div>
              <label style={{ fontSize: "12px", color: "#888888", display: "block", marginBottom: "6px" }}>Suspender hasta:</label>
              <input
                type="date"
                value={suspendDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setSuspendDate(e.target.value)}
                style={{ ...input, colorScheme: "dark" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setSuspendTarget(null); setSuspendDate(""); }} style={btn("#1a1a1a", { flex: 1, border: "1px solid rgba(255,255,255,0.08)", color: "#888888" })}>Cancelar</button>
              {isSuspended(suspendTarget) && (
                <button onClick={async () => { setActionLoading(suspendTarget.id + "_suspend"); try { await onSuspendUser(suspendTarget.id, ""); } finally { setActionLoading(null); setSuspendTarget(null); } }} style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.12)", color: "#aaaaaa" })}>
                  Quitar suspensión
                </button>
              )}
              <button onClick={doSuspend} disabled={!suspendDate || actionLoading === suspendTarget.id + "_suspend"} style={{ ...btn("#eab308", { color: "#000" }), flex: 1, opacity: !suspendDate || actionLoading === suspendTarget.id + "_suspend" ? 0.6 : 1 }}>
                {actionLoading === suspendTarget.id + "_suspend" ? "Guardando..." : "Suspender"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section: Subscriptions ──────────────────────────────── */
function SubscriptionsSection({ users }: { users: AdminUser[] }) {
  const [filter, setFilter] = useState<"active" | "all">("active");
  const subs = users.filter(u => filter === "all" || u.stripeSubscriptionId !== null);

  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Suscripciones</p>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {(["active", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: `1px solid ${filter === f ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`, background: filter === f ? "rgba(255,255,255,0.1)" : "transparent", color: filter === f ? "#fff" : "#555555", cursor: "pointer" }}>
            {f === "active" ? "Con suscripción" : "Todos"}
          </button>
        ))}
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0d0d0d" }}>
                {["Email", "Plan", "Intervalo", "Estado", "Próxima renovación", "Stripe ID"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((u, idx) => {
                const now = new Date();
                const expires = u.planExpiresAt ? new Date(u.planExpiresAt) : null;
                const expired = expires && expires < now;
                const statusColor = !u.stripeSubscriptionId ? "#555555" : expired ? "#f87171" : "#4ade80";
                const statusLabel = !u.stripeSubscriptionId ? "Sin suscripción" : expired ? "Expirado" : "Activo";
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#0d0d0d" : "#111111" }}>
                    <td style={{ padding: "10px 14px", color: "#e5e7eb" }}>{u.email}</td>
                    <td style={{ padding: "10px 14px" }}><PlanBadge plan={u.plan} /></td>
                    <td style={{ padding: "10px 14px", color: "#888888" }}>{u.billingInterval === "annual" ? "Anual" : u.billingInterval === "monthly" ? "Mensual" : u.billingInterval || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: statusColor, background: `${statusColor}22`, border: `1px solid ${statusColor}55` }}>{statusLabel}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#888888", whiteSpace: "nowrap" }}>
                      {expires ? expires.toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#555555", fontFamily: "monospace", fontSize: "0.7rem" }}>
                      {u.stripeSubscriptionId ? (
                        <a href={`https://dashboard.stripe.com/subscriptions/${u.stripeSubscriptionId}`} target="_blank" rel="noopener noreferrer" style={{ color: "#888888", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {u.stripeSubscriptionId.slice(0, 18)}… <ExternalLink size={10} />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {subs.length === 0 && <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#555555" }}>Sin suscripciones</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Engine config card shared ──────────────────────────── */
function TurboEngineCard({
  turboStatus, turboStatusPending, setTurboStatusPending,
  turboManualOverride, turboManualOverridePending, setTurboManualOverridePending,
  turboStatusSaving, onSave, ai33Health,
}: {
  turboStatus: "active" | "maintenance" | "disabled";
  turboStatusPending: "active" | "maintenance" | "disabled";
  setTurboStatusPending: (v: "active" | "maintenance" | "disabled") => void;
  turboManualOverride: boolean;
  turboManualOverridePending: boolean;
  setTurboManualOverridePending: (v: boolean) => void;
  turboStatusSaving: boolean;
  onSave: () => void;
  ai33Health: { elevenlabs: string; isDown: boolean } | null;
}) {
  const healthColor: "green" | "red" | "gray" = ai33Health === null ? "gray" : ai33Health.isDown ? "red" : "green";
  const healthLabel = ai33Health === null ? "Comprobando..." : ai33Health.isDown ? "Degradado / Caído" : "Operativo";

  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>Elite Labs Turbo</span>
            <span style={{ fontSize: "10px", fontWeight: 500, padding: "1px 7px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>ElevenLabs · ai33.pro</span>
          </div>
          <p style={{ fontSize: "12px", color: "#555555", marginTop: "3px" }}>
            Estado guardado: <span style={{ color: turboStatus === "active" ? "#4ade80" : turboStatus === "maintenance" ? "#fbbf24" : "#9ca3af", fontWeight: 600 }}>{turboStatus === "active" ? "Activo" : turboStatus === "maintenance" ? "Mantenimiento" : "Desactivado"}</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
          <StatusDot color={healthColor} />
          <span style={{ color: healthColor === "gray" ? "#555555" : healthColor === "red" ? "#f87171" : "#4ade80", fontWeight: 500 }}>{healthLabel}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {(["active", "maintenance", "disabled"] as const).map((s) => {
          const cfg = {
            active: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", text: "#4ade80", label: "Activo" },
            maintenance: { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)", text: "#fbbf24", label: "Mantenimiento" },
            disabled: { bg: "rgba(107,114,128,0.15)", border: "rgba(107,114,128,0.4)", text: "#9ca3af", label: "Desactivado" },
          }[s];
          const selected = turboStatusPending === s;
          return (
            <button key={s} onClick={() => setTurboStatusPending(s)} style={{ padding: "6px 14px", fontSize: "12px", fontWeight: 500, borderRadius: "6px", cursor: "pointer", transition: "all 150ms", background: selected ? cfg.bg : "transparent", border: `1px solid ${selected ? cfg.border : "rgba(255,255,255,0.08)"}`, color: selected ? cfg.text : "#6b7280" }}>
              {cfg.label}
            </button>
          );
        })}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", cursor: "pointer" }}>
        <input type="checkbox" checked={turboManualOverridePending} onChange={e => setTurboManualOverridePending(e.target.checked)} style={{ width: "14px", height: "14px", accentColor: "#ffffff", cursor: "pointer" }} />
        <span style={{ fontSize: "12px", color: "#888888" }}>Anular control automático <span style={{ color: "#4b5563" }}>(el health check no sobreescribirá este estado)</span></span>
      </label>
      <button
        onClick={onSave}
        disabled={turboStatusSaving || (turboStatusPending === turboStatus && turboManualOverridePending === turboManualOverride)}
        style={{ padding: "6px 18px", fontSize: "12px", fontWeight: 600, borderRadius: "6px", border: "none", transition: "all 150ms", cursor: (turboStatusPending === turboStatus && turboManualOverridePending === turboManualOverride) ? "default" : "pointer", background: (turboStatusPending === turboStatus && turboManualOverridePending === turboManualOverride) ? "rgba(255,255,255,0.05)" : "#ffffff", color: (turboStatusPending === turboStatus && turboManualOverridePending === turboManualOverride) ? "#6b7280" : "#000000", opacity: turboStatusSaving ? 0.6 : 1 }}
      >{turboStatusSaving ? "Guardando..." : "Guardar cambios"}</button>
    </div>
  );
}

/* ─── Section: Engines ────────────────────────────────────── */
function EnginesSection(props: {
  turboStatus: "active" | "maintenance" | "disabled";
  turboStatusPending: "active" | "maintenance" | "disabled";
  setTurboStatusPending: (v: "active" | "maintenance" | "disabled") => void;
  turboManualOverride: boolean;
  turboManualOverridePending: boolean;
  setTurboManualOverridePending: (v: boolean) => void;
  turboStatusSaving: boolean;
  onSave: () => void;
  ai33Health: { elevenlabs: string; isDown: boolean } | null;
}) {
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Motores TTS</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Card 1: Elite Labs M2 */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>Elite Labs M2</span>
                <span style={{ fontSize: "10px", fontWeight: 500, padding: "1px 7px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>Fish Audio</span>
              </div>
              <p style={{ fontSize: "12px", color: "#555555", marginTop: "3px" }}>Motor de síntesis principal</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <StatusDot color="green" />
              <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 500 }}>Operativo</span>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#444444" }}>Sin controles manuales — este motor opera de forma autónoma.</p>
        </div>
        {/* Card 2: Elite Labs Turbo */}
        <TurboEngineCard {...props} />
      </div>
    </div>
  );
}

/* ─── Section: Support ────────────────────────────────────── */
function SupportSection({
  tickets, replyState, onReply,
}: {
  tickets: SupportTicket[];
  replyState: { ticketId: string | null; text: string; loading: boolean; setTicketId: (id: string | null) => void; setText: (t: string) => void };
  onReply: (ticketId: string, close: boolean) => void;
}) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const shown = tickets.filter(t => filter === "all" || t.status === "open");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <p style={{ fontWeight: 800, fontSize: "20px", color: "#fff" }}>Tickets de soporte</p>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["open", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: `1px solid ${filter === f ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`, background: filter === f ? "rgba(255,255,255,0.1)" : "transparent", color: filter === f ? "#fff" : "#555555", cursor: "pointer" }}>
              {f === "open" ? "Abiertos" : "Todos"}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p style={{ color: "#555555", fontSize: "0.85rem" }}>No hay tickets{filter === "open" ? " abiertos" : ""}.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shown.map(ticket => (
            <div key={ticket.id} style={{ borderRadius: "12px", border: `1px solid ${ticket.status === "closed" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"}`, background: "#111111", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af" }}>{TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}</span>
                    <span style={{ fontSize: "0.65rem", color: "#555555" }}>·</span>
                    <span style={{ fontSize: "0.7rem", color: "#555555" }}>{ticket.user.email}</span>
                    <span style={{ fontSize: "0.65rem", padding: "1px 7px", borderRadius: "999px", background: ticket.status === "closed" ? "rgba(107,114,128,0.12)" : "rgba(248,113,113,0.12)", color: ticket.status === "closed" ? "#6b7280" : "#f87171", border: `1px solid ${ticket.status === "closed" ? "rgba(255,255,255,0.08)" : "rgba(248,113,113,0.3)"}`, fontWeight: 700 }}>
                      {ticket.status === "closed" ? "CERRADO" : "ABIERTO"}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "#444444", marginLeft: "auto" }}>{new Date(ticket.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5 }}>{ticket.description}</p>
                  {ticket.adminReply && (
                    <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#aaaaaa", marginBottom: "3px" }}>TU RESPUESTA</p>
                      <p style={{ fontSize: "0.78rem", color: "#aaaaaa" }}>{ticket.adminReply}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  {ticket.status === "open" && (
                    <>
                      <button onClick={() => { replyState.setTicketId(replyState.ticketId === ticket.id ? null : ticket.id); replyState.setText(ticket.adminReply ?? ""); }} style={btn("#1e3a5f", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.15)" })}>Responder</button>
                      <button onClick={() => onReply(ticket.id, true)} style={btn("#1a1a1a", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" })}>Cerrar</button>
                    </>
                  )}
                </div>
              </div>
              {replyState.ticketId === ticket.id && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0d0d0d" }}>
                  <textarea value={replyState.text} onChange={e => replyState.setText(e.target.value)} placeholder="Escribe tu respuesta..." rows={3} style={{ ...input, resize: "vertical", marginBottom: "8px" }} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => onReply(ticket.id, false)} disabled={replyState.loading || !replyState.text.trim()} style={btn("#ffffff", { padding: "0.4rem 1rem", fontSize: "0.8rem", opacity: replyState.loading || !replyState.text.trim() ? 0.6 : 1 })}>
                      {replyState.loading ? "Enviando..." : "Enviar respuesta"}
                    </button>
                    <button onClick={() => onReply(ticket.id, true)} disabled={replyState.loading} style={btn("#1e3a5f", { padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid rgba(255,255,255,0.15)" })}>
                      Responder y cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section: Affiliates ─────────────────────────────────── */
function AffiliatesSection({
  affiliates, onUpdate, onSelectApp,
}: {
  affiliates: AffiliateApplication[];
  onUpdate: (id: string, status: "approved" | "rejected") => Promise<void>;
  onSelectApp: (app: AffiliateApplication) => void;
}) {
  const pendingCount = affiliates.filter(a => a.status === "pending").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 800, fontSize: "20px", color: "#fff" }}>Solicitudes Afiliados</p>
        {pendingCount > 0 && <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</span>}
      </div>
      {affiliates.length === 0 ? (
        <p style={{ color: "#555555", fontSize: "0.85rem" }}>No hay solicitudes de afiliado aún.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0d0d0d" }}>
                  {["Nombre", "Email", "Plataforma", "Audiencia", "Pago", "Estado", "Fecha", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((app, idx) => {
                  const sc = app.status === "approved" ? "#4ade80" : app.status === "rejected" ? "#f87171" : "#fbbf24";
                  const sl = app.status === "approved" ? "Aprobado" : app.status === "rejected" ? "Rechazado" : "Pendiente";
                  return (
                    <tr key={app.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#0d0d0d" : "#111111" }}>
                      <td style={{ padding: "10px 14px", color: "#e5e7eb", whiteSpace: "nowrap" }}>{app.name}</td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{app.email}</td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af", maxWidth: 140 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.platform}</span></td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af", maxWidth: 120 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.audience}</span></td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af", whiteSpace: "nowrap" }}>{app.paymentMethod === "paypal" ? "PayPal" : "Transferencia"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: sc, background: `${sc}22`, border: `1px solid ${sc}55`, whiteSpace: "nowrap" }}>{sl}</span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#555555", whiteSpace: "nowrap" }}>{new Date(app.createdAt).toLocaleDateString("es-ES")}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <button onClick={() => onSelectApp(app)} style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#aaaaaa", padding: "0.25rem 0.6rem", fontSize: "0.7rem" })}>Ver</button>
                          {app.status === "pending" && (
                            <>
                              <button onClick={async () => { try { await onUpdate(app.id, "approved"); } catch { /* handled by parent */ } }} style={btn("#16a34a", { padding: "0.25rem 0.6rem", fontSize: "0.7rem" })}><Check size={11} /></button>
                              <button onClick={async () => { try { await onUpdate(app.id, "rejected"); } catch { /* handled by parent */ } }} style={btn("#dc2626", { padding: "0.25rem 0.6rem", fontSize: "0.7rem" })}><X size={11} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section: Withdrawals ────────────────────────────────── */
function WithdrawalsSection({
  withdrawals, onWithdrawal, loadingId,
}: {
  withdrawals: WithdrawalRequest[];
  onWithdrawal: (id: string, status: "paid" | "rejected") => void;
  loadingId: string | null;
}) {
  const pendingCount = withdrawals.filter(w => w.status === "pending").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <p style={{ fontWeight: 800, fontSize: "20px", color: "#fff" }}>Solicitudes de Retiro</p>
        {pendingCount > 0 && <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</span>}
      </div>
      {withdrawals.length === 0 ? (
        <p style={{ color: "#555555", fontSize: "0.85rem" }}>No hay solicitudes de retiro aún.</p>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0d0d0d" }}>
                  {["Usuario", "Importe", "Método", "Detalles", "Fecha", "Estado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555555", fontWeight: 600, whiteSpace: "nowrap", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w, idx) => {
                  const sc = w.status === "paid" ? "#4ade80" : w.status === "rejected" ? "#f87171" : "#fbbf24";
                  const sl = w.status === "paid" ? "Pagado" : w.status === "rejected" ? "Rechazado" : "Pendiente";
                  const detailStr = w.method === "paypal" ? `PayPal: ${w.details?.email ?? "—"}` : `${w.details?.bankName ?? "—"} · ${w.details?.iban ?? "—"}`;
                  return (
                    <tr key={w.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#0d0d0d" : "#111111" }}>
                      <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{w.user.email}</td>
                      <td style={{ padding: "10px 14px", color: "#4ade80", fontWeight: 700 }}>${w.amount.toFixed(2)}</td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af", whiteSpace: "nowrap" }}>{w.method === "paypal" ? "PayPal" : "Transferencia"}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7280", maxWidth: 200 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detailStr}</span></td>
                      <td style={{ padding: "10px 14px", color: "#555555", whiteSpace: "nowrap" }}>{new Date(w.createdAt).toLocaleDateString("es-ES")}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: sc, background: `${sc}22`, border: `1px solid ${sc}55`, whiteSpace: "nowrap" }}>{sl}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {w.status === "pending" && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => onWithdrawal(w.id, "paid")} disabled={loadingId === w.id} style={btn("#16a34a", { padding: "0.25rem 0.6rem", fontSize: "0.7rem", opacity: loadingId === w.id ? 0.6 : 1 })}>
                              {loadingId === w.id ? "..." : "Marcar pagado"}
                            </button>
                            <button onClick={() => onWithdrawal(w.id, "rejected")} disabled={loadingId === w.id} style={btn("#dc2626", { padding: "0.25rem 0.6rem", fontSize: "0.7rem", opacity: loadingId === w.id ? 0.6 : 1 })}>
                              Rechazar
                            </button>
                          </div>
                        )}
                        {w.status === "paid" && w.paidAt && <span style={{ fontSize: "0.7rem", color: "#4ade80" }}>{new Date(w.paidAt).toLocaleDateString("es-ES")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section: Analytics ──────────────────────────────────── */
function AnalyticsSection({ users, stats }: { users: AdminUser[]; stats: Stats | null }) {
  const planCounts: Record<string, number> = {};
  for (const u of users) { planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1; }
  const plans = ["free", "starter", "pro", "elite", "enterprise"];
  const planData = plans.map(p => ({ label: p, value: planCounts[p] ?? 0 }));
  const maxPlan = Math.max(...planData.map(d => d.value), 1);

  const now = new Date();
  const days30: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const value = users.filter(u => u.createdAt.slice(0, 10) === key).length;
    days30.push({ label, value });
  }

  const top10Credits = [...users].sort((a, b) => a.credits - b.credits).slice(0, 10);
  const planColors: Record<string, string> = { free: "#555555", starter: "#3b82f6", pro: "#8b5cf6", elite: "#f59e0b", enterprise: "#10b981" };

  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Analytics</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={card}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>Distribución por plan</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {planData.map(({ label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: 70, fontSize: "11px", color: planColors[label] ?? "#888888", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "4px", background: planColors[label] ?? "#888888", width: `${(value / maxPlan) * 100}%`, transition: "width 0.4s" }} />
                </div>
                <span style={{ width: 30, fontSize: "12px", color: "#888888", textAlign: "right", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Registros (30 días)</p>
          <SimpleBarChart data={days30} height={90} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "10px", color: "#444444" }}>{days30[0]?.label}</span>
            <span style={{ fontSize: "10px", color: "#444444" }}>{days30[days30.length - 1]?.label}</span>
          </div>
        </div>
      </div>

      <div style={card}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Top 10 usuarios — créditos restantes (menor = más consumido)</p>
        {top10Credits.length === 0 ? (
          <p style={{ color: "#555555", fontSize: "0.8rem" }}>Sin datos</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["#", "Email", "Plan", "Créditos restantes", "Generaciones"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#555555", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10Credits.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px 12px", color: "#444444", fontWeight: 700 }}>#{i + 1}</td>
                    <td style={{ padding: "8px 12px", color: "#e5e7eb" }}>{u.email}</td>
                    <td style={{ padding: "8px 12px" }}><PlanBadge plan={u.plan} /></td>
                    <td style={{ padding: "8px 12px", color: "#f87171", fontWeight: 700 }}>{u.credits.toLocaleString("es-ES")}</td>
                    <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{u._count.generations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section: Config ─────────────────────────────────────── */
function ConfigSection(props: {
  turboStatus: "active" | "maintenance" | "disabled";
  turboStatusPending: "active" | "maintenance" | "disabled";
  setTurboStatusPending: (v: "active" | "maintenance" | "disabled") => void;
  turboManualOverride: boolean;
  turboManualOverridePending: boolean;
  setTurboManualOverridePending: (v: boolean) => void;
  turboStatusSaving: boolean;
  onSave: () => void;
  ai33Health: { elevenlabs: string; isDown: boolean } | null;
}) {
  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Configuración</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <TurboEngineCard {...props} />
        <div style={card}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Otras opciones</p>
          <p style={{ fontSize: "13px", color: "#444444" }}>Más opciones de configuración disponibles próximamente.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Logs Section ────────────────────────────────────────── */
function LogsSection() {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (levelFilter) params.set("level", levelFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    try {
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [levelFilter, categoryFilter]);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 30000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  async function clearLogs() {
    setClearing(true);
    await fetch("/api/admin/logs", { method: "DELETE" });
    setLogs([]); setTotal(0);
    setClearing(false);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const levelColor: Record<string, string> = {
    info: "#60a5fa",
    warn: "#f59e0b",
    error: "#f87171",
    debug: "#888888",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: "20px", color: "#fff", margin: 0 }}>Errores y Logs</p>
          <p style={{ fontSize: "12px", color: "#555555", marginTop: "4px", margin: 0 }}>{total.toLocaleString("es-ES")} entradas · actualiza cada 30s</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={fetchLogs} style={{ ...btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#888888", display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "12px" }) }}>
            <RefreshCw size={11} /> Actualizar
          </button>
          <button onClick={clearLogs} disabled={clearing || logs.length === 0} style={{ ...btn("#ef4444", { padding: "6px 12px", fontSize: "12px", opacity: clearing || logs.length === 0 ? 0.5 : 1 }) }}>
            Limpiar todo
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <CustomSelect
          options={[{ value: "", label: "Todos los niveles" }, { value: "error", label: "Error" }, { value: "warn", label: "Warn" }, { value: "info", label: "Info" }, { value: "debug", label: "Debug" }]}
          value={levelFilter} onChange={setLevelFilter} style={{ minWidth: "160px" }}
        />
        <input
          placeholder="Filtrar por categoría..."
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...input, width: "200px" }}
        />
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#555555" }}>Cargando logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: "#555555" }}>
          <Monitor size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
          <p>Sin logs registrados</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {logs.map(log => (
            <div key={log.id} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", overflow: "hidden" }}>
              <div
                onClick={() => log.details && toggleExpand(log.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: log.details ? "pointer" : "default" }}
              >
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: levelColor[log.level] ?? "#888", background: `${levelColor[log.level] ?? "#888"}18`, border: `1px solid ${levelColor[log.level] ?? "#888"}33`, flexShrink: 0 }}>
                  {log.level.toUpperCase()}
                </span>
                <span style={{ fontSize: "11px", color: "#555555", fontFamily: "monospace", flexShrink: 0 }}>{log.category}</span>
                <span style={{ fontSize: "13px", color: "#e5e7eb", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message}</span>
                <span style={{ fontSize: "11px", color: "#444444", flexShrink: 0, whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                {log.details && (
                  <ChevronDown size={13} style={{ color: "#555555", flexShrink: 0, transform: expanded.has(log.id) ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                )}
              </div>
              {expanded.has(log.id) && log.details && (
                <div style={{ padding: "0 14px 12px" }}>
                  <pre style={{ margin: 0, fontSize: "11px", color: "#9ca3af", background: "#000000", borderRadius: "6px", padding: "10px 12px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {(() => { try { return JSON.stringify(JSON.parse(log.details), null, 2); } catch { return log.details; } })()}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── NAV config ──────────────────────────────────────────── */
const NAV_ITEMS_BASE: { key: Section; label: string; Icon: React.ElementType }[] = [
  { key: "dashboard",     label: "Dashboard",      Icon: LayoutDashboard },
  { key: "users",         label: "Usuarios",        Icon: Users },
  { key: "subscriptions", label: "Suscripciones",   Icon: CreditCard },
  { key: "engines",       label: "Motores",          Icon: Mic2 },
  { key: "support",       label: "Soporte",          Icon: Ticket },
  { key: "affiliates",    label: "Afiliados",        Icon: Handshake },
  { key: "withdrawals",   label: "Retiros",          Icon: Wallet },
  { key: "analytics",     label: "Analytics",        Icon: BarChart2 },
  { key: "config",        label: "Configuración",    Icon: Settings },
  { key: "logs",          label: "Logs",             Icon: ScrollText },
];

/* ─── Main ────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [affiliateApps, setAffiliateApps] = useState<AffiliateApplication[]>([]);
  const [affiliateDetailApp, setAffiliateDetailApp] = useState<AffiliateApplication | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [withdrawalLoading, setWithdrawalLoading] = useState<string | null>(null);

  const [creditUserId, setCreditUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditOp, setCreditOp] = useState<"add" | "subtract">("add");
  const [creditLoading, setCreditLoading] = useState(false);

  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState<"admin" | "user">("admin");
  const [roleLoading, setRoleLoading] = useState(false);

  const [turboStatus, setTurboStatus] = useState<"active" | "maintenance" | "disabled">("active");
  const [turboStatusPending, setTurboStatusPending] = useState<"active" | "maintenance" | "disabled">("active");
  const [turboManualOverride, setTurboManualOverride] = useState(false);
  const [turboManualOverridePending, setTurboManualOverridePending] = useState(false);
  const [turboStatusSaving, setTurboStatusSaving] = useState(false);
  const [ai33Health, setAi33Health] = useState<{ elevenlabs: string; isDown: boolean } | null>(null);
  const [logErrorCount, setLogErrorCount] = useState(0);

  const toast = useCallback((msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }, []);

  useEffect(() => {
    function refreshErrorCount() {
      fetch("/api/admin/logs?level=error&limit=1")
        .then(r => r.json())
        .then(d => setLogErrorCount(typeof d.total === "number" ? d.total : 0))
        .catch(() => {});
    }
    refreshErrorCount();
    const id = setInterval(refreshErrorCount, 60000);
    return () => clearInterval(id);
  }, []);

  const fetchAll = useCallback(async () => {
    const [uRes, sRes, tRes, aRes, wRes, cfgRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/stats"),
      fetch("/api/admin/support"),
      fetch("/api/admin/affiliate-applications"),
      fetch("/api/admin/withdrawal-requests"),
      fetch("/api/admin/system-config"),
    ]);
    if (uRes.status === 403 || uRes.status === 401) { setAuthorized(false); return; }
    setAuthorized(true);
    const uData = await uRes.json(); setUsers(Array.isArray(uData) ? uData : []);
    const sData = await sRes.json(); setStats(sData && !sData.error ? sData : null);
    const tData = await tRes.json(); setTickets(Array.isArray(tData) ? tData : []);
    const aData = await aRes.json(); setAffiliateApps(Array.isArray(aData) ? aData : []);
    const wData = await wRes.json(); setWithdrawalRequests(Array.isArray(wData) ? wData : []);
    if (cfgRes.ok) {
      const cfgData = await cfgRes.json();
      const s = cfgData.elitelabsTurboStatus ?? "active";
      const m = !!cfgData.elitelabsTurboManualOverride;
      setTurboStatus(s); setTurboStatusPending(s);
      setTurboManualOverride(m); setTurboManualOverridePending(m);
    }
  }, []);

  async function handleWithdrawal(id: string, status: "paid" | "rejected") {
    setWithdrawalLoading(id);
    try {
      const res = await fetch(`/api/admin/withdrawal-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Error"); }
      setWithdrawalRequests(prev => prev.map(w => w.id === id ? { ...w, status, paidAt: status === "paid" ? new Date().toISOString() : null } : w));
      toast(status === "paid" ? "Marcado como pagado" : "Solicitud rechazada y saldo devuelto", status === "paid");
    } catch (err) { toast(err instanceof Error ? err.message : "Error", false); }
    finally { setWithdrawalLoading(null); }
  }

  async function updateAffiliateStatus(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/admin/affiliate-applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Error al actualizar"); }
    setAffiliateApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setAffiliateDetailApp(prev => prev?.id === id ? { ...prev, status } : prev);
    toast(status === "approved" ? "Solicitud aprobada" : "Solicitud rechazada", status === "approved");
  }

  async function saveTurboStatus() {
    setTurboStatusSaving(true);
    try {
      const res = await fetch("/api/admin/system-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ elitelabsTurboStatus: turboStatusPending, elitelabsTurboManualOverride: turboManualOverridePending }) });
      if (res.ok) { setTurboStatus(turboStatusPending); setTurboManualOverride(turboManualOverridePending); toast("Configuración de motores guardada", true); }
      else toast("Error al guardar", false);
    } catch { toast("Error al guardar", false); }
    finally { setTurboStatusSaving(false); }
  }

  async function fetchAi33Health() {
    try {
      const r = await fetch("/api/ai33-health");
      const d = await r.json();
      setAi33Health({ elevenlabs: d.elevenlabs ?? "unknown", isDown: !!d.isDown });
    } catch { setAi33Health({ elevenlabs: "unknown", isDown: true }); }
  }

  async function handleCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!creditUserId || !creditAmount) return;
    setCreditLoading(true);
    try {
      const res = await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: creditUserId, amount: Number(creditAmount), operation: creditOp }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Créditos actualizados. Nuevo saldo: ${data.credits.toLocaleString("es-ES")}`);
      setCreditUserId(""); setCreditAmount(""); fetchAll();
    } catch (err) { toast(err instanceof Error ? err.message : "Error", false); }
    finally { setCreditLoading(false); }
  }

  async function handleRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleUserId) return;
    setRoleLoading(true);
    try {
      const res = await fetch("/api/admin/role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: roleUserId, role: roleValue }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Rol actualizado a "${data.role}"`);
      setRoleUserId(""); fetchAll();
    } catch (err) { toast(err instanceof Error ? err.message : "Error", false); }
    finally { setRoleLoading(false); }
  }

  async function handleDeleteUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast("Usuario eliminado correctamente");
    } catch (err) { toast(err instanceof Error ? err.message : "Error al eliminar", false); }
  }

  async function handleBanUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ban" }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      toast("Usuario baneado en Clerk");
    } catch (err) { toast(err instanceof Error ? err.message : "Error al banear", false); }
  }

  async function handleSuspendUser(userId: string, until: string) {
    try {
      const action = until ? "suspend" : "unsuspend";
      const body: Record<string, string> = { action };
      if (until) body.until = new Date(until).toISOString();
      const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, disabledUntil: until ? new Date(until).toISOString() : null } : u));
      toast(until ? "Cuenta suspendida" : "Suspensión eliminada");
    } catch (err) { toast(err instanceof Error ? err.message : "Error al suspender", false); }
  }

  async function handleReply(ticketId: string, close: boolean) {
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: replyText, close }) });
      if (!res.ok) throw new Error("Error al responder");
      toast(close ? "Ticket cerrado" : "Respuesta enviada");
      setReplyTicketId(null); setReplyText(""); fetchAll();
    } catch (err) { toast(err instanceof Error ? err.message : "Error", false); }
    finally { setReplyLoading(false); }
  }

  useEffect(() => { if (isLoaded && user) fetchAll(); }, [isLoaded, user, fetchAll]);
  useEffect(() => { if (isLoaded && !user) router.push("/sign-in"); }, [isLoaded, user, router]);
  useEffect(() => {
    fetchAi33Health();
    const id = setInterval(fetchAi33Health, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoaded || authorized === null)
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#888888" }}>Cargando...</p>
      </div>
    );

  if (authorized === false)
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "#f87171", fontSize: "1.25rem", fontWeight: 700 }}>Acceso denegado</p>
        <p style={{ color: "#888888" }}>Necesitas permisos de administrador.</p>
        <button style={btn()} onClick={() => router.push("/dashboard")}>Volver al dashboard</button>
      </div>
    );

  const pendingTickets = tickets.filter(t => t.status === "open").length;
  const pendingAffiliates = affiliateApps.filter(a => a.status === "pending").length;
  const pendingWithdrawals = withdrawalRequests.filter(w => w.status === "pending").length;

  const NAV_ITEMS = NAV_ITEMS_BASE.map(item => ({
    ...item,
    badge: item.key === "support" ? pendingTickets : item.key === "affiliates" ? pendingAffiliates : item.key === "withdrawals" ? pendingWithdrawals : item.key === "logs" ? logErrorCount : 0,
  }));

  const engineProps = { turboStatus, turboStatusPending, setTurboStatusPending, turboManualOverride, turboManualOverridePending, setTurboManualOverridePending, turboStatusSaving, onSave: saveTurboStatus, ai33Health };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000000", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`}</style>

      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontWeight: 800, fontSize: "14px", color: "#fff", margin: 0 }}>Admin Panel</p>
          <p style={{ fontSize: "11px", color: "#555555", marginTop: "2px", margin: 0 }}>Elite Labs</p>
        </div>
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(({ key, label, Icon, badge }) => (
            <button key={key} onClick={() => setActiveSection(key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: activeSection === key ? "rgba(255,255,255,0.08)" : "transparent", color: activeSection === key ? "#ffffff" : "#666666", fontSize: "13px", fontWeight: activeSection === key ? 600 : 400, marginBottom: "1px", textAlign: "left", transition: "all 0.15s" }}>
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "999px", background: "rgba(239,68,68,0.85)", color: "#fff" }}>{badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => router.push("/dashboard")} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: "transparent", color: "#444444", fontSize: "12px" }}>
            <ArrowLeft size={13} />
            Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {/* Toast */}
        {feedback && (
          <div style={{ position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 200, padding: "0.75rem 1.25rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.875rem", background: feedback.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)", color: feedback.ok ? "#4ade80" : "#f87171", border: `1px solid ${feedback.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}` }}>
            {feedback.msg}
          </div>
        )}

        {/* Refresh button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button onClick={() => fetchAll()} style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#888888", display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "12px" })}>
            <RefreshCw size={12} />
            Actualizar
          </button>
        </div>

        {/* Modals */}
        {detailUserId && <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} toast={toast} />}
        {affiliateDetailApp && <AffiliateDetailModal app={affiliateDetailApp} onClose={() => setAffiliateDetailApp(null)} onUpdate={updateAffiliateStatus} toast={toast} />}

        {/* Sections */}
        {activeSection === "dashboard" && (
          <DashboardSection users={users} stats={stats} tickets={tickets} withdrawals={withdrawalRequests} affiliates={affiliateApps} onNav={setActiveSection} />
        )}
        {activeSection === "users" && (
          <UsersSection
            users={users}
            onSelectUser={setDetailUserId}
            creditState={{ userId: creditUserId, amount: creditAmount, op: creditOp, loading: creditLoading, setUserId: setCreditUserId, setAmount: setCreditAmount, setOp: setCreditOp }}
            roleState={{ userId: roleUserId, role: roleValue, loading: roleLoading, setUserId: setRoleUserId, setRole: setRoleValue }}
            onCredits={handleCredits}
            onRole={handleRole}
            search={search}
            onSearch={setSearch}
            onDeleteUser={handleDeleteUser}
            onBanUser={handleBanUser}
            onSuspendUser={handleSuspendUser}
          />
        )}
        {activeSection === "subscriptions" && <SubscriptionsSection users={users} />}
        {activeSection === "engines" && <EnginesSection {...engineProps} />}
        {activeSection === "support" && (
          <SupportSection
            tickets={tickets}
            replyState={{ ticketId: replyTicketId, text: replyText, loading: replyLoading, setTicketId: setReplyTicketId, setText: setReplyText }}
            onReply={handleReply}
          />
        )}
        {activeSection === "affiliates" && (
          <AffiliatesSection affiliates={affiliateApps} onUpdate={updateAffiliateStatus} onSelectApp={setAffiliateDetailApp} />
        )}
        {activeSection === "withdrawals" && (
          <WithdrawalsSection withdrawals={withdrawalRequests} onWithdrawal={handleWithdrawal} loadingId={withdrawalLoading} />
        )}
        {activeSection === "analytics" && <AnalyticsSection users={users} stats={stats} />}
        {activeSection === "config" && <ConfigSection {...engineProps} />}
        {activeSection === "logs" && <LogsSection />}
      </main>
    </div>
  );
}
