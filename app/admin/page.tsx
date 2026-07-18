"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/CustomSelect";
import { EliteLoader } from "@/components/ui/EliteLoader";
import {
  LayoutDashboard, Users, CreditCard, Mic2, Ticket, Handshake, Wallet,
  BarChart2, Settings, RefreshCw, Check, X, AlertTriangle, Play, Pause,
  ExternalLink, Search, Filter, Plus, Minus, ArrowLeft, ChevronRight,
  ScrollText, Monitor, ChevronDown, Trash2, ShieldOff, Clock, Shield,
  DollarSign, Database, Zap, Eye, MessageSquare,
  CheckCircle, Wrench, PowerOff,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */
const PLAN_PRICE: Record<string, number> = { free: 0, plus: 8, pro: 55, elite: 315, starter: 7, enterprise: 110, lifetime: 0 };

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
  id: string; clerkId: string; email: string; credits: number; extraCredits: number; plan: string; role: string;
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
  totalVisits: number; visitsToday: number;
  visitsByDay: { date: string; count: number }[];
  prevMonthVisits: number;
}
interface SupportTicket {
  id: string; type: string; description: string; status: string;
  adminReply: string | null; createdAt: string; messages: Array<{role: string; text: string; content: string; createdAt: string}>;
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
interface CreditsByType {
  tts: number; ttsCount: number;
  transcription: number; transcriptionCount: number;
  translation: number; translationCount: number;
  images: number; imagesCount: number;
  total: number;
}
interface UserDetail {
  user: { id: string; email: string; credits: number; plan: string; role: string; createdAt: string };
  generations: Generation[];
  creditsByType?: CreditsByType;
}
interface Payment {
  id: string; stripeSessionId: string; paymentIntentId: string | null;
  amount: number; creditsPurchased: number; status: string;
  amountRefunded: number; last4: string | null; createdAt: string;
}

type Section = "dashboard" | "users" | "subscriptions" | "engines" | "support" | "affiliates" | "withdrawals" | "analytics" | "config" | "logs" | "cookies" | "announcements" | "nichefinder";

interface UserSession {
  id: string; ip: string | null; browser: string | null; os: string | null;
  device: string | null; country: string | null; city: string | null; createdAt: string;
}

interface AppLog {
  id: string; level: string; category: string; message: string;
  details: string | null; userId: string | null; createdAt: string;
}

/* ─── Design system ───────────────────────────────────────── */
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: 20,
  backdropFilter: "blur(12px)",
};

const input: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#fff",
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

const btn = (color = "#ffffff", extra: React.CSSProperties = {}): React.CSSProperties =>
  ({
    background: color,
    border: "none",
    borderRadius: 10,
    color: color === "#ffffff" ? "#000000" : "#fff",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    ...extra,
  });

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

function StatCard({ label, value, sub, Icon, color }: { label: string; value: string | number; sub?: string; Icon?: React.ElementType; color?: string }) {
  const c = color ?? "rgba(255,255,255,0.5)";
  return (
    <div style={card}>
      {Icon && (
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${c}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Icon size={15} color={c} />
        </div>
      )}
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, [string, string]> = {
    free:       ["#6b7280", "rgba(107,114,128,0.12)"],
    creator:    ["#60a5fa", "rgba(96,165,250,0.12)"],
    plus:       ["#a78bfa", "rgba(167,139,250,0.12)"],
    pro:        ["#f97316", "rgba(249,115,22,0.12)"],
    elite:      ["#f59e0b", "rgba(245,158,11,0.12)"],
    starter:    ["#3b82f6", "rgba(59,130,246,0.12)"],
    enterprise: ["#10b981", "rgba(16,185,129,0.12)"],
    lifetime:   ["#f59e0b", "rgba(245,158,11,0.12)"],
  };
  const [color, bg] = colors[plan] ?? ["#6b7280", "rgba(107,114,128,0.12)"];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, color, background: bg, border: `1px solid ${color}44`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
  const [expandedGens, setExpandedGens] = useState<Set<string>>(new Set());
  const [copiedGen, setCopiedGen] = useState<string | null>(null);

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
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="flex items-center justify-center py-16">
            <EliteLoader />
          </div>
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
            {detail.creditsByType && (
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555555", marginBottom: "0.75rem" }}>Créditos consumidos por tipo</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  {[
                    { label: "Texto a Voz",    credits: detail.creditsByType.tts,           count: detail.creditsByType.ttsCount,           unit: "generaciones" },
                    { label: "Audio a Texto",  credits: detail.creditsByType.transcription,  count: detail.creditsByType.transcriptionCount, unit: "tareas" },
                    { label: "Traducción",     credits: detail.creditsByType.translation,    count: detail.creditsByType.translationCount,   unit: "tareas" },
                    { label: "Imágenes/Vídeo", credits: detail.creditsByType.images,         count: detail.creditsByType.imagesCount,        unit: "guardadas" },
                  ].map(({ label, credits, count, unit }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.25rem" }}>{label}</p>
                      <p style={{ color: "#ffffff", fontWeight: 600, fontSize: "1rem", marginBottom: "0.1rem" }}>{credits.toLocaleString("es-ES")} cr</p>
                      <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>{count} {unit}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "0.5rem", padding: "0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>Total gastado</p>
                  <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "1.25rem" }}>{detail.creditsByType.total.toLocaleString("es-ES")}</p>
                </div>
              </div>
            )}
            <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", background: "#000000", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555555", marginBottom: "0.75rem" }}>Estado Stripe</p>
              {stripeSubLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}><EliteLoader /></div>
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
                  options={["free", "plus", "pro", "elite", "starter", "enterprise", "lifetime"].map((p) => ({ value: p, label: p }))}
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
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", maxWidth: "260px" }}>
                              <p style={expandedGens.has(g.id) ? { margin: 0, fontSize: "0.78rem", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" } : { margin: 0, fontSize: "0.78rem", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                                {g.text}
                              </p>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                {g.text.length > 80 && (
                                  <button
                                    onClick={() => setExpandedGens(prev => { const s = new Set(prev); s.has(g.id) ? s.delete(g.id) : s.add(g.id); return s; })}
                                    style={{ fontSize: "0.68rem", color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                                  >
                                    {expandedGens.has(g.id) ? "Ver menos" : "Ver más"}
                                  </button>
                                )}
                                <button
                                  onClick={() => { navigator.clipboard.writeText(g.text); setCopiedGen(g.id); setTimeout(() => setCopiedGen(null), 2000); }}
                                  style={{ fontSize: "0.68rem", color: copiedGen === g.id ? "#4ade80" : "#555", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: copiedGen === g.id ? 700 : 400, transition: "color 0.15s" }}
                                >
                                  {copiedGen === g.id ? "¡Copiado!" : "Copiar"}
                                </button>
                              </div>
                              {g.voiceName && <span style={{ display: "block", fontSize: "0.7rem", color: "#555555", marginTop: "3px" }}>{g.voiceName}</span>}
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
                <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}><EliteLoader /></div>
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
                <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}><EliteLoader /></div>
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
function buildMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const raw = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    options.push({ value, label });
  }
  return options;
}
const MONTH_OPTIONS = buildMonthOptions();

function DashboardSection({
  users, stats: initialStats, tickets, withdrawals, affiliates, onNav, fishCredits, ai33Health,
}: {
  users: AdminUser[]; stats: Stats | null; tickets: SupportTicket[];
  withdrawals: WithdrawalRequest[]; affiliates: AffiliateApplication[];
  onNav: (s: Section) => void;
  fishCredits?: { credit: string } | null;
  ai33Health?: { elevenlabs: string; isDown: boolean } | null;
}) {
  const currentMonthStr = MONTH_OPTIONS[0].value;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    setLoadingStats(true);
    fetch(`/api/admin/stats?month=${selectedMonth}`)
      .then(r => r.json())
      .then(d => setStats(d && !d.error ? d : null))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [selectedMonth]);

  const pendingTickets = tickets.filter(t => t.status === "open").length;
  const pendingAffiliates = affiliates.filter(a => a.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending").length;

  // 30-day new users bar chart (always from users list, not filtered by month)
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

  // Visits chart data
  const visitsDays = (stats?.visitsByDay ?? []).map(v => ({
    label: v.date.slice(8),
    value: v.count,
  }));

  // Trend vs previous month
  const trendPct = stats && stats.prevMonthVisits > 0
    ? Math.round(((stats.totalVisits - stats.prevMonthVisits) / stats.prevMonthVisits) * 100)
    : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 22, color: "#fff", margin: 0 }}>Dashboard</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>
            {loadingStats ? "Actualizando..." : MONTH_OPTIONS.find(o => o.value === selectedMonth)?.label}
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13, padding: "7px 12px", cursor: "pointer", outline: "none" }}
        >
          {MONTH_OPTIONS.map(o => (
            <option key={o.value} value={o.value} style={{ background: "#1a1a1a" }}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* 5 stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 16 }}>
        <StatCard label="Usuarios totales" value={stats ? stats.totalUsers.toLocaleString("es-ES") : "—"} Icon={Users} color="#3b82f6" />
        <StatCard label="MRR estimado" value={mrr} Icon={DollarSign} color="#22c55e" />
        <StatCard label="Generaciones" value={stats ? stats.totalGenerations.toLocaleString("es-ES") : "—"} Icon={BarChart2} color="#a855f7" />
        <StatCard label="Créditos consumidos" value={stats ? stats.totalCreditsConsumed.toLocaleString("es-ES") : "—"} Icon={Zap} color="#f59e0b" />
        <StatCard label="Créditos restantes" value={users.reduce((s, u) => s + u.credits + (u.extraCredits ?? 0), 0).toLocaleString("es-ES")} Icon={Database} color="#06b6d4" />
      </div>

      {/* Fish Audio + Estado del sistema */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <DollarSign size={18} color="#22c55e" />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Fish Audio API</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "0 0 2px" }}>
              {fishCredits?.credit != null ? `$${parseFloat(fishCredits.credit).toFixed(2)}` : "—"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0 }}>Saldo disponible</p>
          </div>
        </div>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>Estado del sistema</p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Fish Audio</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusDot color="green" />
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Operativo</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>ElevenLabs Turbo</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusDot color={ai33Health === null || ai33Health === undefined ? "gray" : ai33Health.isDown ? "red" : "green"} />
                <span style={{ fontSize: 12, fontWeight: 600, color: ai33Health === null || ai33Health === undefined ? "#555" : ai33Health.isDown ? "#ef4444" : "#22c55e" }}>
                  {ai33Health === null || ai33Health === undefined ? "Comprobando..." : ai33Health.isDown ? "Degradado" : "Operativo"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Visitas hoy</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{stats ? stats.visitsToday.toLocaleString("es-ES") : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" as const }}>
        {[
          { label: "Tickets abiertos", count: pendingTickets, color: "#ef4444", section: "support" as Section },
          { label: "Afiliados pendientes", count: pendingAffiliates, color: "#f59e0b", section: "affiliates" as Section },
          { label: "Retiros pendientes", count: pendingWithdrawals, color: "#f59e0b", section: "withdrawals" as Section },
        ].map(({ label, count, color, section }) => (
          <button key={label} onClick={() => onNav(section)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, background: count > 0 ? `${color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${count > 0 ? `${color}40` : "rgba(255,255,255,0.07)"}`, color: count > 0 ? color : "rgba(255,255,255,0.3)" }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{count}</span>
            {label}
            <ChevronRight size={13} style={{ opacity: 0.6 }} />
          </button>
        ))}
        {trendPct !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: trendPct >= 0 ? "#22c55e" : "#ef4444" }}>
            <span style={{ fontWeight: 700 }}>{trendPct >= 0 ? "+" : ""}{trendPct}%</span>
            <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>visitas vs mes anterior</span>
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14 }}>Nuevos usuarios (30 días)</p>
          <SimpleBarChart data={days30} height={80} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{days30[0]?.label}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{days30[days30.length - 1]?.label}</span>
          </div>
        </div>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14 }}>
            Visitas — {MONTH_OPTIONS.find(o => o.value === selectedMonth)?.label ?? selectedMonth}
          </p>
          {visitsDays.length > 0 ? (
            <>
              <SimpleBarChart data={visitsDays} height={80} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{visitsDays[0]?.label}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{visitsDays[visitsDays.length - 1]?.label}</span>
              </div>
            </>
          ) : (
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Sin datos</p>
          )}
        </div>
      </div>

      {/* Top 5 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14 }}>Top 5 por generaciones</p>
          {top5Gen.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Sin datos</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {top5Gen.map((u, i) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 20, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: "#3b82f6", width: `${Math.round((u._count.generations / (top5Gen[0]._count.generations || 1)) * 100)}%` }} />
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{u.email.split("@")[0]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{u._count.generations}</span>
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
  usersPage, usersTotal, usersTotalPages, onPageChange,
}: {
  users: AdminUser[];
  usersPage: number;
  usersTotal: number;
  usersTotalPages: number;
  onPageChange: (page: number) => void;
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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState<string>("all");
  const [emailPlan, setEmailPlan] = useState<string>("all");
  const [emailIndividual, setEmailIndividual] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

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

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeCount = users.filter(u => !isSuspended(u)).length;
  const proPlusCount = users.filter(u => ["pro", "elite", "enterprise", "lifetime"].includes(u.plan)).length;
  const newThisWeek = users.filter(u => new Date(u.createdAt) > oneWeekAgo).length;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {([
          { label: "Total usuarios", value: usersTotal, color: "#60a5fa" },
          { label: "Activos", value: activeCount, color: "#4ade80" },
          { label: "PRO+", value: proPlusCount, color: "#a78bfa" },
          { label: "Nuevos esta semana", value: newThisWeek, color: "#f97316" },
        ] as Array<{ label: string; value: number; color: string }>).map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Plan filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input style={{ ...input, paddingLeft: 36 }} placeholder="Buscar por email o ID..." value={search} onChange={e => onSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "free", "creator", "plus", "pro", "elite", "starter", "enterprise", "lifetime"].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${planFilter === p ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)"}`, background: planFilter === p ? "rgba(255,255,255,0.09)" : "transparent", color: planFilter === p ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "all 0.15s" }}>
              {p === "all" ? "Todos" : p}
            </button>
          ))}
        </div>
        <button onClick={() => setEmailModal(true)} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
          ✉ Enviar email
        </button>
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Usuario", "Plan", "Rol", "Créditos", "Estado", "Registro", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, whiteSpace: "nowrap", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.02)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: hoveredRow === u.id ? "rgba(255,255,255,0.03)" : "transparent", cursor: "pointer", transition: "background 0.1s" }}
                  onClick={() => onSelectUser(u.id)}
                  onMouseEnter={() => setHoveredRow(u.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Avatar + Email */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
                        {u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, color: "#e5e7eb", fontSize: 13, fontWeight: 500 }}>{u.email}</p>
                        <button onClick={e => copyId(u.id, e)} title={copiedId === u.id ? "Copiado!" : "Copiar ID"} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, fontFamily: "monospace", color: copiedId === u.id ? "#4ade80" : "rgba(255,255,255,0.2)", transition: "color 0.15s" }}>
                          {u.id.slice(0, 8)}… {copiedId === u.id ? "✓" : "⎘"}
                        </button>
                      </div>
                    </div>
                  </td>
                  {/* Plan */}
                  <td style={{ padding: "12px 16px" }}><PlanBadge plan={u.plan} /></td>
                  {/* Rol */}
                  <td style={{ padding: "12px 16px" }}><Tag role={u.role} /></td>
                  {/* Créditos */}
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.65)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{u.credits.toLocaleString("es-ES")}</td>
                  {/* Estado */}
                  <td style={{ padding: "12px 16px" }}>
                    {isSuspended(u)
                      ? <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(234,179,8,0.1)", color: "#facc15", border: "1px solid rgba(234,179,8,0.3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Suspendido</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Activo</span>
                    }
                  </td>
                  {/* Fecha */}
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("es-ES")}</td>
                  {/* Acciones */}
                  <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => onSelectUser(u.id)} title="Ver detalles" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", padding: "5px 7px", borderRadius: 8, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", transition: "all 0.15s" }}>
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSuspendTarget(u); setSuspendDate(""); }}
                        title={isSuspended(u) ? `Suspendido hasta ${new Date(u.disabledUntil!).toLocaleDateString("es-ES")}` : "Suspender temporalmente"}
                        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${isSuspended(u) ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", padding: "5px 7px", borderRadius: 8, color: isSuspended(u) ? "#facc15" : "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                        disabled={actionLoading === u.id + "_suspend"}
                      >
                        <Clock size={13} />
                      </button>
                      <button
                        onClick={e => doBan(u, e)}
                        title="Banear usuario en Clerk"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.2)", cursor: "pointer", padding: "5px 7px", borderRadius: 8, color: "rgba(251,146,60,0.55)", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                        disabled={actionLoading === u.id + "_ban"}
                      >
                        <ShieldOff size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(u); }}
                        title="Eliminar usuario"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", padding: "5px 7px", borderRadius: 8, color: "rgba(239,68,68,0.55)", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                        disabled={actionLoading === u.id + "_delete"}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setEmailIndividual(u.email); setEmailTo("individual"); setEmailModal(true); }}
                        title="Enviar email"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", padding: "5px 7px", borderRadius: 8, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", transition: "all 0.15s", fontSize: 12 }}
                      >
                        ✉
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No se encontraron usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersTotalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Página {usersPage} de {usersTotalPages} · {usersTotal} usuarios en total
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onPageChange(usersPage - 1)}
                disabled={usersPage <= 1}
                style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", background: usersPage <= 1 ? "transparent" : "rgba(255,255,255,0.06)", color: usersPage <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", cursor: usersPage <= 1 ? "default" : "pointer" }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => onPageChange(usersPage + 1)}
                disabled={usersPage >= usersTotalPages}
                style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", background: usersPage >= usersTotalPages ? "transparent" : "rgba(255,255,255,0.06)", color: usersPage >= usersTotalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", cursor: usersPage >= usersTotalPages ? "default" : "pointer" }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Credit + Role management */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: 16, fontSize: 14, color: "#fff" }}>Gestión de créditos</p>
          <form onSubmit={onCredits} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>ID de usuario</label>
              <input style={input} placeholder="cuid del usuario" value={creditState.userId} onChange={e => creditState.setUserId(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Cantidad</label>
                <input style={input} type="number" min="1" placeholder="0" value={creditState.amount} onChange={e => creditState.setAmount(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Operación</label>
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
          <p style={{ fontWeight: 700, marginBottom: 16, fontSize: 14, color: "#fff" }}>Gestión de roles</p>
          <form onSubmit={onRole} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>ID de usuario</label>
              <input style={input} placeholder="cuid del usuario" value={roleState.userId} onChange={e => roleState.setUserId(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Nuevo rol</label>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: 360, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trash2 size={16} color="#f87171" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>Eliminar usuario</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
              ¿Eliminar permanentemente a <span style={{ color: "#fff", fontWeight: 600 }}>{confirmDelete.email}</span> de Clerk y la base de datos?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: 380, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(234,179,8,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={16} color="#facc15" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>Suspender cuenta</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>{suspendTarget.email}</p>
              </div>
            </div>
            {isSuspended(suspendTarget) && (
              <p style={{ fontSize: 12, color: "#facc15", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 8, padding: "8px 12px", margin: 0 }}>
                Suspendido hasta {new Date(suspendTarget.disabledUntil!).toLocaleDateString("es-ES")}
              </p>
            )}
            <div>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Suspender hasta:</label>
              <input type="date" value={suspendDate} min={new Date().toISOString().split("T")[0]} onChange={e => setSuspendDate(e.target.value)} style={{ ...input, colorScheme: "dark" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
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

      {emailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 }}>Enviar email</h2>
              <button onClick={() => { setEmailModal(false); setEmailResult(null); }} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#888", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Destinatarios</label>
              <select value={emailTo} onChange={e => setEmailTo(e.target.value)} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px" }}>
                <option value="all">Todos los usuarios</option>
                <option value="plan">Filtrar por plan</option>
                <option value="individual">Usuario individual</option>
              </select>
            </div>

            {emailTo === "plan" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ color: "#888", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Plan</label>
                <select value={emailPlan} onChange={e => setEmailPlan(e.target.value)} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px" }}>
                  <option value="all">Todos</option>
                  <option value="free">Free</option>
                  <option value="creator">Creator</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
            )}

            {emailTo === "individual" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ color: "#888", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Email del usuario</label>
                <input
                  value={emailIndividual}
                  onChange={e => setEmailIndividual(e.target.value)}
                  placeholder="usuario@email.com"
                  type="email"
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#888", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Asunto</label>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Asunto del email" style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#888", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Mensaje</label>
              <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} placeholder="Escribe el mensaje aquí..." rows={6} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>

            {emailResult && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "8px", background: emailResult.startsWith("✓") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${emailResult.startsWith("✓") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: emailResult.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: "13px" }}>
                {emailResult}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => { setEmailModal(false); setEmailResult(null); }} style={{ padding: "10px 20px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button
                disabled={emailSending || !emailSubject.trim() || !emailMessage.trim() || (emailTo === "individual" && !emailIndividual.trim())}
                onClick={async () => {
                  setEmailSending(true);
                  setEmailResult(null);
                  try {
                    const res = await fetch("/api/admin/send-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        sendToAll: emailTo !== "individual",
                        planFilter: emailTo === "plan" ? emailPlan : "all",
                        to: emailTo === "individual" ? emailIndividual : undefined,
                        subject: emailSubject,
                        message: emailMessage,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setEmailResult(`✓ Email enviado a ${data.sent} usuarios`);
                      setEmailSubject("");
                      setEmailMessage("");
                    } else {
                      setEmailResult(`Error: ${data.error}`);
                    }
                  } catch {
                    setEmailResult("Error al enviar");
                  } finally {
                    setEmailSending(false);
                  }
                }}
                style={{ padding: "10px 20px", borderRadius: "8px", background: emailSending || !emailSubject.trim() || !emailMessage.trim() || (emailTo === "individual" && !emailIndividual.trim()) ? "rgba(255,255,255,0.1)" : "#ffffff", color: emailSending || !emailSubject.trim() || !emailMessage.trim() || (emailTo === "individual" && !emailIndividual.trim()) ? "#555" : "#000", fontSize: "13px", fontWeight: 600, cursor: emailSending ? "not-allowed" : "pointer", border: "none" }}
              >
                {emailSending ? "Enviando..." : "Enviar email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section: Subscriptions ──────────────────────────────── */
interface SubUser {
  id: string; email: string; plan: string; planExpiresAt: string | null;
  billingInterval: string; stripeSubscriptionId: string | null;
  stripeCustomerId: string | null; cancelAtPeriodEnd: boolean;
  stripeStatus: string | null; createdAt: string;
}
function subStatus(u: SubUser, now: Date): "active" | "canceled" | "expired" {
  const expires = u.planExpiresAt ? new Date(u.planExpiresAt) : null;
  if (expires && expires < now) return "expired";
  // Cancelado si: flag explícito, status de Stripe, o sin stripeSubscriptionId con acceso vigente
  // (cubre usuarios cancelados antes de que existieran los campos cancelAtPeriodEnd/stripeStatus)
  if (u.cancelAtPeriodEnd || u.stripeStatus === "canceled" || (!u.stripeSubscriptionId && expires && expires > now)) return "canceled";
  return "active";
}
function SubscriptionsSection({ users: _unused }: { users: AdminUser[] }) {
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/subscriptions")
      .then(r => r.json())
      .then(d => { setSubUsers(Array.isArray(d.users) ? d.users : []); })
      .finally(() => setLoading(false));
  }, []);

  const nowGlobal = new Date();
  const withSub = subUsers;
  // "active" tab: planExpiresAt in future OR null (lifetime/enterprise no expiry)
  const activeWithSub = withSub.filter(u => !u.planExpiresAt || new Date(u.planExpiresAt) >= nowGlobal);
  const expiredCount = withSub.filter(u => u.planExpiresAt && new Date(u.planExpiresAt) < nowGlobal).length;
  const canceledCount = activeWithSub.filter(u => u.cancelAtPeriodEnd || u.stripeStatus === "canceled").length;
  const mrr = activeWithSub
    .filter(u => !u.cancelAtPeriodEnd && u.stripeStatus !== "canceled")
    .reduce((sum, u) => sum + (PLAN_PRICE[u.plan] ?? 0), 0);
  const nextWeek = new Date(nowGlobal.getTime() + 7 * 24 * 60 * 60 * 1000);
  const renewingSoon = activeWithSub.filter(u => u.planExpiresAt && new Date(u.planExpiresAt) <= nextWeek && !u.cancelAtPeriodEnd).length;
  const subs = filter === "all" ? withSub : activeWithSub;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {([
          { label: "Con acceso activo", value: activeWithSub.length, color: "#4ade80" },
          { label: "MRR estimado", value: `$${mrr.toLocaleString("es-ES")}`, color: "#60a5fa" },
          { label: "Canceladas (con acceso)", value: canceledCount, color: "#f97316" },
          { label: "Expiradas", value: expiredCount, color: "#f87171" },
        ] as Array<{ label: string; value: string | number; color: string }>).map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["active", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 16px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${filter === f ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)"}`, background: filter === f ? "rgba(255,255,255,0.09)" : "transparent", color: filter === f ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "all 0.15s" }}>
            {f === "active" ? "Activos" : "Todos"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", margin: 0 }}>Cargando...</p>
          </div>
        ) : subs.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <CreditCard size={32} style={{ color: "rgba(255,255,255,0.08)" }} />
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", margin: 0 }}>Sin suscripciones</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Email", "Plan", "Intervalo", "Estado", "Próxima renovación", "Stripe ID"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, whiteSpace: "nowrap", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.02)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(u => {
                  const now = new Date();
                  const status = subStatus(u, now);
                  const statusColor = status === "expired" ? "#6b7280" : status === "canceled" ? "#f87171" : "#4ade80";
                  const statusBg = status === "expired" ? "rgba(107,114,128,0.1)" : status === "canceled" ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.08)";
                  const statusBorder = status === "expired" ? "rgba(107,114,128,0.2)" : status === "canceled" ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.2)";
                  const statusLabel = status === "expired" ? "Expirado" : status === "canceled" ? "Cancelado" : "Activo";
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: hoveredRow === u.id ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 0.1s" }}
                      onMouseEnter={() => setHoveredRow(u.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Email */}
                      <td style={{ padding: "12px 16px", color: "#e5e7eb", fontSize: 13 }}>{u.email}</td>
                      {/* Plan */}
                      <td style={{ padding: "12px 16px" }}><PlanBadge plan={u.plan} /></td>
                      {/* Intervalo */}
                      <td style={{ padding: "12px 16px" }}>
                        {u.billingInterval === "annual"
                          ? <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>Anual</span>
                          : u.billingInterval === "monthly"
                            ? <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>Mensual</span>
                            : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{u.billingInterval || "—"}</span>
                        }
                      </td>
                      {/* Estado */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`, textTransform: "uppercase", letterSpacing: "0.04em" }}>{statusLabel}</span>
                      </td>
                      {/* Próxima renovación */}
                      <td style={{ padding: "12px 16px", color: status === "expired" ? "#f87171" : "rgba(255,255,255,0.45)", whiteSpace: "nowrap", fontSize: 12 }}>
                        {u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      {/* Stripe ID */}
                      <td style={{ padding: "12px 16px" }}>
                        {u.stripeSubscriptionId ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{u.stripeSubscriptionId.slice(0, 12)}…</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(u.stripeSubscriptionId!); setCopiedId(u.id); setTimeout(() => setCopiedId(null), 1500); }}
                              title={copiedId === u.id ? "Copiado!" : "Copiar ID"}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 11, color: copiedId === u.id ? "#4ade80" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
                            >
                              {copiedId === u.id ? <Check size={11} /> : "⎘"}
                            </button>
                            <a href={`https://dashboard.stripe.com/subscriptions/${u.stripeSubscriptionId}`} target="_blank" rel="noopener noreferrer" title="Ver en Stripe" style={{ color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center" }}>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        ) : <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
  const [turboChecking, setTurboChecking] = useState(false);
  const [lastTurboCheck, setLastTurboCheck] = useState<Date | null>(null);
  const [localHealth, setLocalHealth] = useState<{ elevenlabs: string; isDown: boolean } | null>(null);

  const effectiveHealth = localHealth ?? ai33Health;
  const healthColor: "green" | "red" | "gray" = effectiveHealth === null ? "gray" : effectiveHealth.isDown ? "red" : "green";
  const healthLabel = effectiveHealth === null ? "Comprobando..." : effectiveHealth.isDown ? "Degradado / Caído" : "Operativo";
  const hasChanges = turboStatusPending !== turboStatus || turboManualOverridePending !== turboManualOverride;

  async function forceCheck() {
    setTurboChecking(true);
    try {
      const r = await fetch("/api/ai33-health");
      const d = await r.json();
      setLocalHealth({ elevenlabs: d.elevenlabs ?? "unknown", isDown: !!d.isDown });
    } catch {
      setLocalHealth({ elevenlabs: "unknown", isDown: true });
    } finally {
      setLastTurboCheck(new Date());
      setTurboChecking(false);
    }
  }

  return (
    <div style={{ ...card }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Elite Labs Turbo</span>
            <span style={{ fontSize: "10px", fontWeight: 500, padding: "1px 7px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>ElevenLabs · algrow.online</span>
          </div>
          {effectiveHealth?.elevenlabs && effectiveHealth.elevenlabs !== "unknown" && (
            <p style={{ fontSize: "11px", color: "#555" }}>Modelo: <span style={{ color: "#888", fontWeight: 600 }}>{effectiveHealth.elevenlabs}</span></p>
          )}
        </div>
        {/* Prominent health badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", background: healthColor === "green" ? "rgba(74,222,128,0.1)" : healthColor === "red" ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${healthColor === "green" ? "rgba(74,222,128,0.3)" : healthColor === "red" ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.07)"}` }}>
          <StatusDot color={healthColor} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: healthColor === "green" ? "#4ade80" : healthColor === "red" ? "#f87171" : "#555" }}>{healthLabel}</span>
        </div>
      </div>

      {/* 2-col internal grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: status buttons */}
        <div>
          <p style={{ fontSize: "10px", color: "#555", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Estado del motor</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {(["active", "maintenance", "disabled"] as const).map((s) => {
              const cfgMap = {
                active:      { color: "#4ade80", border: "rgba(74,222,128,0.4)",    bg: "rgba(74,222,128,0.12)",    label: "Activo",          Icon: CheckCircle },
                maintenance: { color: "#fbbf24", border: "rgba(251,191,36,0.4)",   bg: "rgba(251,191,36,0.12)",   label: "Mantenimiento",   Icon: Wrench },
                disabled:    { color: "#9ca3af", border: "rgba(107,114,128,0.35)", bg: "rgba(107,114,128,0.12)", label: "Desactivado",     Icon: PowerOff },
              } as const;
              const cfg = cfgMap[s];
              const selected = turboStatusPending === s;
              return (
                <button key={s} onClick={() => setTurboStatusPending(s)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: 600, borderRadius: "7px", cursor: "pointer", transition: "all 150ms", background: selected ? cfg.bg : "transparent", border: `1px solid ${selected ? cfg.border : "rgba(255,255,255,0.06)"}`, color: selected ? cfg.color : "#4b5563", textAlign: "left" }}>
                  <cfg.Icon size={13} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: config + save */}
        <div>
          <p style={{ fontSize: "10px", color: "#555", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Configuración</p>
          <p style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>
            Guardado: <span style={{ fontWeight: 700, color: turboStatus === "active" ? "#4ade80" : turboStatus === "maintenance" ? "#fbbf24" : "#6b7280" }}>
              {turboStatus === "active" ? "Activo" : turboStatus === "maintenance" ? "Mantenimiento" : "Desactivado"}
            </span>
          </p>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "16px", cursor: "pointer" }}>
            <input type="checkbox" checked={turboManualOverridePending} onChange={e => setTurboManualOverridePending(e.target.checked)} style={{ width: "14px", height: "14px", accentColor: "#ffffff", cursor: "pointer", flexShrink: 0, marginTop: "2px" }} />
            <span style={{ fontSize: "11px", color: "#666", lineHeight: 1.45 }}>Anular control automático <span style={{ color: "#3d4451" }}>(el health check no sobreescribirá este estado)</span></span>
          </label>
          <button
            onClick={onSave}
            disabled={turboStatusSaving || !hasChanges}
            style={{ width: "100%", padding: "8px 16px", fontSize: "12px", fontWeight: 700, borderRadius: "7px", border: "none", transition: "all 150ms", cursor: hasChanges && !turboStatusSaving ? "pointer" : "default", background: hasChanges ? "#ffffff" : "rgba(255,255,255,0.05)", color: hasChanges ? "#000" : "#4b5563", opacity: turboStatusSaving ? 0.6 : 1 }}
          >{turboStatusSaving ? "Guardando..." : "Guardar cambios"}</button>
        </div>
      </div>

      {/* Footer: force check */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "20px", paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", color: "#3d4451" }}>
          {lastTurboCheck ? `Última comprobación: ${lastTurboCheck.toLocaleTimeString("es-ES")}` : "Health check no ejecutado aún"}
        </span>
        <button onClick={forceCheck} disabled={turboChecking} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 14px", fontSize: "12px", fontWeight: 600, borderRadius: "7px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#aaa", cursor: turboChecking ? "default" : "pointer", opacity: turboChecking ? 0.6 : 1, transition: "all 150ms" }}>
          <RefreshCw size={12} style={{ animation: turboChecking ? "spin 1s linear infinite" : "none" }} />
          {turboChecking ? "Comprobando..." : "Forzar health check ahora"}
        </button>
      </div>
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
  const [fishLatency, setFishLatency] = useState<number | null>(null);
  const [lastFishCheck, setLastFishCheck] = useState<Date | null>(null);
  const [fishChecking, setFishChecking] = useState(false);
  const [fishUp, setFishUp] = useState<boolean | null>(null);

  async function checkFish() {
    setFishChecking(true);
    const t0 = Date.now();
    try {
      const r = await fetch("/api/admin/fish-credits");
      setFishLatency(Date.now() - t0);
      setFishUp(r.ok);
    } catch {
      setFishLatency(null);
      setFishUp(false);
    } finally {
      setLastFishCheck(new Date());
      setFishChecking(false);
    }
  }

  const fishColor: "green" | "red" | "gray" = fishUp === null ? "gray" : fishUp ? "green" : "red";
  const fishLabel = fishUp === null ? "Sin comprobar" : fishUp ? "Operativo" : "Error de conexión";

  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Motores TTS</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Card 1: Elite Labs M2 (Fish Audio) */}
        <div style={{ ...card }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Left: info + stats */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Elite Labs M2</span>
                <span style={{ fontSize: "10px", fontWeight: 500, padding: "1px 7px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>Fish Audio</span>
              </div>
              <p style={{ fontSize: "12px", color: "#555", marginBottom: "18px" }}>Motor de síntesis principal · Autónomo</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#555" }}>Estado API</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <StatusDot color={fishColor} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: fishColor === "green" ? "#4ade80" : fishColor === "red" ? "#f87171" : "#555" }}>{fishLabel}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#555" }}>Latencia estimada</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>
                    {fishLatency !== null ? `${fishLatency} ms` : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#555" }}>Última comprobación</span>
                  <span style={{ fontSize: "11px", color: "#4b5563" }}>
                    {lastFishCheck ? lastFishCheck.toLocaleTimeString("es-ES") : "—"}
                  </span>
                </div>
              </div>
            </div>
            {/* Right: controls */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>
              <button onClick={checkFish} disabled={fishChecking} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 16px", fontSize: "12px", fontWeight: 700, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#ccc", cursor: fishChecking ? "default" : "pointer", opacity: fishChecking ? 0.6 : 1, transition: "all 150ms", whiteSpace: "nowrap" }}>
                <RefreshCw size={13} style={{ animation: fishChecking ? "spin 1s linear infinite" : "none" }} />
                {fishChecking ? "Comprobando..." : "Forzar health check ahora"}
              </button>
              <p style={{ fontSize: "11px", color: "#3d4451", textAlign: "center", lineHeight: 1.45 }}>Sin controles manuales — este motor opera de forma autónoma.</p>
            </div>
          </div>
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
  const openCount = tickets.filter(t => t.status === "open").length;

  const CATEGORY_COLORS: Record<string, [string, string]> = {
    technical: ["#60a5fa", "rgba(96,165,250,0.12)"],
    billing:   ["#4ade80", "rgba(74,222,128,0.1)"],
    general:   ["#9ca3af", "rgba(156,163,175,0.1)"],
    refund:    ["#f97316", "rgba(249,115,22,0.1)"],
    other:     ["#a78bfa", "rgba(167,139,250,0.1)"],
  };

  const relativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "inline-flex", gap: 2, marginBottom: 20, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
        {(["open", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: filter === f ? "#ffffff" : "transparent", color: filter === f ? "#000000" : "rgba(255,255,255,0.4)", transition: "all 0.15s" }}>
            {f === "open" ? `Abiertos${openCount > 0 ? ` (${openCount})` : ""}` : "Todos"}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {shown.length === 0 ? (
        <div style={{ ...card, padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Ticket size={32} style={{ color: "rgba(255,255,255,0.08)" }} />
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", margin: 0 }}>No hay tickets{filter === "open" ? " abiertos" : ""}.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map(ticket => {
            const [catColor, catBg] = CATEGORY_COLORS[ticket.type] ?? ["#9ca3af", "rgba(156,163,175,0.1)"];
            const isClosed = ticket.status === "closed";
            const isReplying = replyState.ticketId === ticket.id;
            return (
              <div key={ticket.id} style={{ ...card, padding: 0, overflow: "hidden", opacity: isClosed ? 0.55 : 1, transition: "opacity 0.15s" }}>
                {/* Card body */}
                <div style={{ padding: "16px 20px" }}>
                  {/* Header row: email + category badge | time */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{ticket.user.email}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: catColor, background: catBg, border: `1px solid ${catColor}44`, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}</span>
                      {isClosed && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(107,114,128,0.1)", color: "#6b7280", border: "1px solid rgba(107,114,128,0.2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Cerrado</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap", flexShrink: 0 }}>{relativeTime(ticket.createdAt)}</span>
                  </div>
                  {/* Historial completo de mensajes */}
                  {(() => {
                    const msgs: Array<{role: string; content: string; createdAt: string}> = 
                      Array.isArray(ticket.messages) ? ticket.messages as Array<{role: string; content: string; createdAt: string}> : [];
                    const allMessages: Array<{role: string; content: string; createdAt: string}> = [
                      { role: "user", content: ticket.description, createdAt: ticket.createdAt },
                      ...msgs,
                    ];
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {allMessages.map((msg, idx) => {
                          const isAdmin = msg.role === "admin";
                          return (
                            <div key={idx} style={{ padding: "8px 12px", borderRadius: 8, background: isAdmin ? "rgba(96,165,250,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isAdmin ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.06)"}` }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: isAdmin ? "#60a5fa" : "rgba(255,255,255,0.25)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                {isAdmin ? "Soporte" : ticket.user.email}
                              </p>
                              <p style={{ fontSize: 12, color: isAdmin ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                {/* Card footer — actions */}
                {!isClosed && (
                  <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.01)" }}>
                    <button
                      onClick={() => { replyState.setTicketId(isReplying ? null : ticket.id); replyState.setText(ticket.adminReply ?? ""); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${isReplying ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.1)"}`, background: isReplying ? "rgba(96,165,250,0.1)" : "rgba(255,255,255,0.04)", color: isReplying ? "#60a5fa" : "rgba(255,255,255,0.55)", cursor: "pointer", transition: "all 0.15s" }}
                    >
                      <MessageSquare size={12} />
                      Responder
                    </button>
                    <button
                      onClick={() => onReply(ticket.id, true)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.15s" }}
                    >
                      <X size={12} />
                      Cerrar
                    </button>
                  </div>
                )}
                {/* Inline reply form */}
                {isReplying && (
                  <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
                    <textarea
                      value={replyState.text}
                      onChange={e => replyState.setText(e.target.value)}
                      placeholder="Escribe tu respuesta..."
                      rows={3}
                      style={{ ...input, resize: "vertical", marginBottom: 10 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onReply(ticket.id, false)} disabled={replyState.loading || !replyState.text.trim()} style={btn("#ffffff", { display: "flex", alignItems: "center", gap: 6, opacity: replyState.loading || !replyState.text.trim() ? 0.5 : 1 })}>
                        <MessageSquare size={12} />
                        {replyState.loading ? "Enviando..." : "Enviar respuesta"}
                      </button>
                      <button onClick={() => onReply(ticket.id, true)} disabled={replyState.loading} style={btn("#1e3a5f", { border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 6, opacity: replyState.loading ? 0.5 : 1 })}>
                        <Check size={12} />
                        Responder y cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
  const PLAN_PRICES: Record<string, number> = {
    free: 0, creator: 8, plus: 26, pro: 49, elite: 315,
    starter: 7, enterprise: 110, lifetime: 0,
  };
  const PLAN_COLORS: Record<string, string> = {
    free: "#6b7280", creator: "#60a5fa", plus: "#a78bfa",
    pro: "#f97316", elite: "#f59e0b", starter: "#3b82f6",
    enterprise: "#10b981", lifetime: "#f59e0b",
  };
  const TURBO_PLANS = new Set(["pro", "elite", "enterprise", "lifetime"]);
  const ALL_PLANS = ["free", "creator", "plus", "pro", "elite", "starter", "enterprise", "lifetime"];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Summary metrics
  const withSub = users.filter(u => u.plan !== "free" && (!u.planExpiresAt || new Date(u.planExpiresAt) >= now));
  const mrr = withSub.reduce((sum, u) => sum + (PLAN_PRICES[u.plan] ?? 0), 0);
  const activeRecent = users.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
  const paidUsers = users.filter(u => u.plan !== "free").length;
  const convRate = users.length > 0 ? ((paidUsers / users.length) * 100).toFixed(1) : "0.0";
  const totalCreditsConsumed = stats?.totalCreditsConsumed ?? 0;

  // Plan distribution
  const planCounts: Record<string, number> = {};
  for (const u of users) { planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1; }
  const planData = ALL_PLANS.map(p => ({ label: p, value: planCounts[p] ?? 0 }));
  const maxPlan = Math.max(...planData.map(d => d.value), 1);

  // Motor distribution
  const turboCount = users.filter(u => TURBO_PLANS.has(u.plan)).length;
  const fishCount = users.length - turboCount;
  const turboRatio = users.length > 0 ? Math.round((turboCount / users.length) * 100) : 0;

  // Registros 30 días
  const days30: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days30.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: users.filter(u => u.createdAt.slice(0, 10) === key).length });
  }

  // Top 10 by fewest credits remaining (most consumed)
  const top10 = [...users].sort((a, b) => (a.credits + a.extraCredits) - (b.credits + b.extraCredits)).slice(0, 10);
  const maxTotal = Math.max(...users.map(u => u.credits + u.extraCredits), 1);

  return (
    <div>
      {/* Summary stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {([
          { label: "MRR estimado", value: `$${mrr.toLocaleString("es-ES")}`, color: "#4ade80", sub: `${withSub.length} suscripciones activas` },
          { label: "Activos últimos 7d", value: activeRecent, color: "#60a5fa", sub: "nuevos registros" },
          { label: "Tasa conversión", value: `${convRate}%`, color: "#a78bfa", sub: `${paidUsers} usuarios de pago` },
          { label: "Créditos consumidos", value: totalCreditsConsumed.toLocaleString("es-ES"), color: "#f97316", sub: "total histórico" },
        ] as Array<{ label: string; value: string | number; color: string; sub: string }>).map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Plan distribution */}
        <div style={card}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Distribución por plan</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {planData.map(({ label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 78, fontSize: 11, color: PLAN_COLORS[label] ?? "#888", fontWeight: 700, textTransform: "uppercase" as const }}>{label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: PLAN_COLORS[label] ?? "#888", width: `${(value / maxPlan) * 100}%`, transition: "width 0.4s" }} />
                </div>
                <span style={{ width: 28, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "right" as const, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Registros 30 días */}
        <div style={card}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Registros (últimos 30 días)</p>
          <SimpleBarChart data={days30} height={90} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{days30[0]?.label}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{days30[days30.length - 1]?.label}</span>
          </div>
        </div>
      </div>

      {/* Motor distribution */}
      <div style={{ ...card, marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Distribución por motor</p>
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 10 }}>
          <div style={{ textAlign: "center" as const, minWidth: 80 }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: "#60a5fa", margin: 0 }}>{fishCount}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Fish Audio</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", margin: 0 }}>PRO</p>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.05)", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${100 - turboRatio}%`, background: "#3b82f6", transition: "width 0.4s", minWidth: turboRatio < 100 ? 2 : 0 }} />
              <div style={{ width: `${turboRatio}%`, background: "#f97316", transition: "width 0.4s", minWidth: turboRatio > 0 ? 2 : 0 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600 }}>Fish PRO · {100 - turboRatio}%</span>
              <span style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>Turbo · {turboRatio}%</span>
            </div>
          </div>
          <div style={{ textAlign: "center" as const, minWidth: 80 }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: "#f97316", margin: 0 }}>{turboCount}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>ElevenLabs</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", margin: 0 }}>Turbo</p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", margin: 0 }}>
          Turbo: Pro · Elite · Enterprise · Lifetime &nbsp;|&nbsp; Fish PRO: Free · Creator · Plus · Starter
        </p>
      </div>

      {/* Top 10 table */}
      <div style={card}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Top 10 usuarios — mayor consumo de créditos</p>
        {top10.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Sin datos</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["#", "Email", "Plan", "Motor", "Créditos rest.", "% Uso", "Generaciones"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", whiteSpace: "nowrap" as const, background: "rgba(255,255,255,0.02)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10.map((u, i) => {
                  const total = u.credits + u.extraCredits;
                  const usedPct = Math.max(0, Math.round((1 - total / maxTotal) * 100));
                  const isTurbo = TURBO_PLANS.has(u.plan);
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: 11 }}>#{i + 1}</td>
                      <td style={{ padding: "9px 12px", color: "#e5e7eb", fontSize: 13 }}>{u.email}</td>
                      <td style={{ padding: "9px 12px" }}><PlanBadge plan={u.plan} /></td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: isTurbo ? "rgba(249,115,22,0.1)" : "rgba(59,130,246,0.1)", color: isTurbo ? "#f97316" : "#60a5fa", border: `1px solid ${isTurbo ? "rgba(249,115,22,0.25)" : "rgba(59,130,246,0.25)"}` }}>
                          {isTurbo ? "Turbo" : "Fish PRO"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: total < 500 ? "#f87171" : "rgba(255,255,255,0.55)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{total.toLocaleString("es-ES")}</td>
                      <td style={{ padding: "9px 12px", minWidth: 110 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${usedPct}%`, background: usedPct > 75 ? "#f87171" : usedPct > 40 ? "#f59e0b" : "#4ade80" }} />
                          </div>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", width: 28, textAlign: "right" as const }}>{usedPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.4)" }}>{u._count.generations}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section: Config ─────────────────────────────────────── */
const CFG_PLAN_ORDER = ["free", "creator", "plus", "pro", "elite"] as const;
const CFG_PLAN_LABELS: Record<string, string> = { free: "Free", creator: "Creator", plus: "Plus", pro: "Pro", elite: "Elite" };
const CFG_PLAN_BADGE: Record<string, string> = { free: "#888", creator: "#60a5fa", plus: "#a78bfa", pro: "#f97316", elite: "#fbbf24" };
const CFG_PLAN_DEFAULT: Record<string, number> = { free: 10000, creator: 250000, plus: 1000000, pro: 2000000, elite: 15000000 };

function ConfigSection() {
  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfgSaving, setCfgSaving] = useState<string | null>(null);

  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [maintActive, setMaintActive] = useState(false);
  const [maintSaved, setMaintSaved] = useState("");
  const [maintPending, setMaintPending] = useState("");
  const [creditsSaved, setCreditsSaved] = useState<Record<string, number>>(CFG_PLAN_DEFAULT);
  const [creditsPending, setCreditsPending] = useState<Record<string, number>>(CFG_PLAN_DEFAULT);

  useEffect(() => {
    fetch("/api/admin/system-config")
      .then(r => r.json())
      .then(d => {
        setRegistrationOpen(d.registrationOpen ?? true);
        setMaintActive(d.maintenanceMessageActive ?? false);
        const msg = d.maintenanceMessage ?? "";
        setMaintSaved(msg); setMaintPending(msg);
        let credits: Record<string, number> = { ...CFG_PLAN_DEFAULT };
        if (d.planCredits && d.planCredits !== "{}") {
          try { credits = { ...credits, ...JSON.parse(d.planCredits) }; } catch { /* ignore */ }
        }
        setCreditsSaved(credits); setCreditsPending(credits);
      })
      .catch(() => {})
      .finally(() => setCfgLoading(false));
  }, []);

  async function saveField(key: string, payload: Record<string, unknown>) {
    setCfgSaving(key);
    try {
      const r = await fetch("/api/admin/system-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return;
      const d = await r.json();
      if ("registrationOpen" in payload) setRegistrationOpen(d.registrationOpen ?? true);
      if ("maintenanceMessageActive" in payload) setMaintActive(d.maintenanceMessageActive ?? false);
      if ("maintenanceMessage" in payload) { const m = d.maintenanceMessage ?? ""; setMaintSaved(m); setMaintPending(m); }
      if ("planCredits" in payload) {
        let c: Record<string, number> = { ...CFG_PLAN_DEFAULT };
        try { c = { ...c, ...JSON.parse(d.planCredits ?? "{}") }; } catch { /* ignore */ }
        setCreditsSaved(c); setCreditsPending(c);
      }
    } catch { /* ignore */ }
    finally { setCfgSaving(null); }
  }

  const creditsChanged = CFG_PLAN_ORDER.some(p => creditsPending[p] !== creditsSaved[p]);

  if (cfgLoading) return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Configuración</p>
      <div style={{ ...card, display: "flex", justifyContent: "center", padding: "3rem" }}><EliteLoader /></div>
    </div>
  );

  return (
    <div>
      <p style={{ fontWeight: 800, fontSize: "20px", marginBottom: "20px", color: "#fff" }}>Configuración</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Row 1: 2-col */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Card: Registro de usuarios */}
          <div style={{ ...card }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "5px" }}>Registro de usuarios</p>
                <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.55, marginBottom: "18px" }}>Permite o bloquea el registro de nuevas cuentas en la plataforma.</p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Toggle switch */}
                  <button
                    onClick={() => { const next = !registrationOpen; setRegistrationOpen(next); saveField("registration", { registrationOpen: next }); }}
                    disabled={cfgSaving === "registration"}
                    style={{ position: "relative", width: 44, height: 24, borderRadius: 12, border: "none", background: registrationOpen ? "#4ade80" : "rgba(255,255,255,0.1)", cursor: cfgSaving === "registration" ? "default" : "pointer", transition: "background 200ms", flexShrink: 0, opacity: cfgSaving === "registration" ? 0.5 : 1 }}
                  >
                    <span style={{ position: "absolute", top: 3, left: registrationOpen ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                  </button>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: registrationOpen ? "#4ade80" : "#f87171" }}>
                    {cfgSaving === "registration" ? "Guardando..." : registrationOpen ? "Registro abierto" : "Registro cerrado"}
                  </span>
                </div>
              </div>
              <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <Users size={20} color={registrationOpen ? "#4ade80" : "#f87171"} />
              </div>
            </div>
          </div>

          {/* Card: Mensaje de mantenimiento */}
          <div style={{ ...card }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>Mensaje de mantenimiento</p>
                <p style={{ fontSize: "12px", color: "#555" }}>Banner global visible en el dashboard para todos los usuarios.</p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => { const next = !maintActive; setMaintActive(next); saveField("maintenanceActive", { maintenanceMessageActive: next }); }}
                disabled={cfgSaving === "maintenanceActive"}
                style={{ position: "relative", width: 44, height: 24, borderRadius: 12, border: "none", background: maintActive ? "#fbbf24" : "rgba(255,255,255,0.1)", cursor: cfgSaving === "maintenanceActive" ? "default" : "pointer", transition: "background 200ms", flexShrink: 0, opacity: cfgSaving === "maintenanceActive" ? 0.5 : 1, marginTop: "2px" }}
              >
                <span style={{ position: "absolute", top: 3, left: maintActive ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              </button>
            </div>
            <textarea
              value={maintPending}
              onChange={e => setMaintPending(e.target.value)}
              placeholder="Estamos realizando tareas de mantenimiento. Por favor inténtalo más tarde."
              rows={3}
              style={{ ...input, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", gap: 8 }}>
              {maintActive ? (
                <span style={{ fontSize: "11px", color: "#fbbf24", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <AlertTriangle size={11} /> Mensaje activo — visible para todos
                </span>
              ) : <span />}
              <button
                onClick={() => saveField("maintenance", { maintenanceMessage: maintPending })}
                disabled={cfgSaving === "maintenance" || maintPending === maintSaved}
                style={btn(maintPending !== maintSaved ? "#ffffff" : "#1a1a1a", { color: maintPending !== maintSaved ? "#000" : "#555", border: "1px solid rgba(255,255,255,0.08)", opacity: cfgSaving === "maintenance" ? 0.6 : 1, cursor: (cfgSaving === "maintenance" || maintPending === maintSaved) ? "default" : "pointer" })}
              >
                {cfgSaving === "maintenance" ? "Guardando..." : "Guardar mensaje"}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Plan credits (full width) */}
        <div style={{ ...card }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: 12 }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>Límites de créditos por plan</p>
              <p style={{ fontSize: "12px", color: "#555" }}>Créditos asignados al registrarse y en cada renovación mensual/anual.</p>
            </div>
            <button
              onClick={() => saveField("credits", { planCredits: JSON.stringify(creditsPending) })}
              disabled={cfgSaving === "credits" || !creditsChanged}
              style={btn(creditsChanged ? "#ffffff" : "#1a1a1a", { color: creditsChanged ? "#000" : "#555", border: "1px solid rgba(255,255,255,0.08)", opacity: cfgSaving === "credits" ? 0.6 : 1, cursor: (!creditsChanged || cfgSaving === "credits") ? "default" : "pointer" })}
            >
              {cfgSaving === "credits" ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
            {CFG_PLAN_ORDER.map(plan => {
              const badgeColor = CFG_PLAN_BADGE[plan] ?? "#888";
              const val = creditsPending[plan] ?? 0;
              return (
                <div key={plan} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "5px", background: `${badgeColor}18`, color: badgeColor, border: `1px solid ${badgeColor}38`, display: "inline-block", textAlign: "center" }}>
                    {CFG_PLAN_LABELS[plan]}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={val}
                    onChange={e => {
                      const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setCreditsPending(prev => ({ ...prev, [plan]: n }));
                    }}
                    style={{ ...input, textAlign: "right", fontWeight: 600 }}
                  />
                  <span style={{ fontSize: "10px", color: "#444", textAlign: "right" }}>
                    {val.toLocaleString("es-ES")} cr
                  </span>
                </div>
              );
            })}
          </div>
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (levelFilter) params.set("level", levelFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    try {
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setLastUpdated(new Date());
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
    info: "#60a5fa", warn: "#f59e0b", error: "#f87171", debug: "#888888",
  };
  const levelBorder: Record<string, string> = {
    info: "#3b82f6", warn: "#f59e0b", error: "#ef4444", debug: "#6b7280",
  };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {/* Level pills */}
        <div style={{ display: "flex", gap: 5 }}>
          {(["", "info", "warn", "error", "debug"] as const).map(l => {
            const label = l === "" ? "Todos" : l.toUpperCase();
            const col = l === "" ? "rgba(255,255,255,0.5)" : (levelColor[l] ?? "#888");
            const active = levelFilter === l;
            return (
              <button key={l} onClick={() => setLevelFilter(l)} style={{ padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${active ? col : "rgba(255,255,255,0.07)"}`, background: active ? `${col}18` : "transparent", color: active ? col : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "all 0.15s" }}>
                {label}
              </button>
            );
          })}
        </div>
        {/* Category input */}
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", pointerEvents: "none" }} />
          <input placeholder="Filtrar por categoría..." value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...input, paddingLeft: 32 }} />
        </div>
        {/* Action buttons */}
        <button onClick={fetchLogs} style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#888", display: "flex", alignItems: "center", gap: 5 })}>
          <RefreshCw size={11} /> Actualizar
        </button>
        <button onClick={clearLogs} disabled={clearing || logs.length === 0} style={btn("#ef4444", { opacity: clearing || logs.length === 0 ? 0.4 : 1 })}>
          Limpiar
        </button>
        {/* Last updated indicator */}
        {lastUpdated && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto", whiteSpace: "nowrap" }}>
            Actualizado a las {lastUpdated.toLocaleTimeString("es-ES")} · {total.toLocaleString("es-ES")} entradas · auto 30s
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ ...card, display: "flex", justifyContent: "center", padding: "3rem" }}><EliteLoader /></div>
      ) : logs.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Monitor size={32} style={{ color: "rgba(255,255,255,0.08)" }} />
          <p style={{ color: "rgba(255,255,255,0.2)", margin: 0, fontSize: 14 }}>Sin logs registrados</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {logs.map(log => {
            const lc = levelColor[log.level] ?? "#888";
            const lb = levelBorder[log.level] ?? "#444";
            const isExp = expanded.has(log.id);
            return (
              <div key={log.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderLeft: `3px solid ${lb}`, borderRadius: 8, overflow: "hidden" }}>
                <div
                  onClick={() => log.details && toggleExpand(log.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: log.details ? "pointer" : "default" }}
                >
                  {/* Level pill */}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, color: lc, background: `${lc}15`, border: `1px solid ${lc}30`, flexShrink: 0, textTransform: "uppercase" as const }}>
                    {log.level}
                  </span>
                  {/* Category pill */}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, fontFamily: "monospace" }}>
                    {log.category}
                  </span>
                  {/* Message */}
                  <span style={{ fontSize: 12, color: "#e5e7eb", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message}</span>
                  {/* Timestamp */}
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {log.details && (
                    <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0, transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                  )}
                </div>
                {isExp && log.details && (
                  <div style={{ padding: "0 14px 12px 28px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <pre style={{ margin: 0, fontSize: 11, color: "#9ca3af", background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "10px 12px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {(() => { try { return JSON.stringify(JSON.parse(log.details), null, 2); } catch { return log.details; } })()}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Section: Cookies ────────────────────────────────────── */
function CookiesSection() {
  const [consents, setConsents] = useState<{id:string;userId:string|null;ip:string|null;email:string|null;consent:string;createdAt:string}[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/admin/cookie-consents').then(r=>r.json()).then(d=>{setConsents(d);setLoading(false)})
  }, [])
  return (
    <div>
      <h2 style={{color:'#fff',marginBottom:'1.5rem',fontSize:'1.25rem',fontWeight:700}}>Consentimientos de Cookies</h2>
      {loading ? <div style={{display:'flex',justifyContent:'center',padding:'2rem'}}><EliteLoader /></div> : (
        <div style={{background:'#111111',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'1rem',padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                {['IP','Usuario','Email','Consentimiento','Fecha'].map(h=>(
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#888',fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consents.map(c=>(
                <tr key={c.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <td style={{padding:'10px 16px',color:'#ccc'}}>{c.ip||'—'}</td>
                  <td style={{padding:'10px 16px',color:'#ccc'}}>{c.userId||'Anónimo'}</td>
                  <td style={{padding:'10px 16px',color:'#ccc'}}>{c.email||'—'}</td>
                  <td style={{padding:'10px 16px'}}>
                    <span style={{padding:'2px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                      background:c.consent==='all'?'rgba(34,197,94,0.1)':'rgba(251,191,36,0.1)',
                      color:c.consent==='all'?'#22c55e':'#fbbf24',border:`1px solid ${c.consent==='all'?'rgba(34,197,94,0.3)':'rgba(251,191,36,0.3)'}`}}>
                      {c.consent==='all'?'Todo':'Solo necesarias'}
                    </span>
                  </td>
                  <td style={{padding:'10px 16px',color:'#888'}}>{new Date(c.createdAt).toLocaleString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {consents.length===0&&<p style={{padding:'2rem',textAlign:'center',color:'#555'}}>No hay registros todavía.</p>}
        </div>
      )}
    </div>
  )
}

/* ─── AnnouncementsSection ───────────────────────────────── */
function AnnouncementsSection() {
  interface AdminAnnouncement { id: string; title: Record<string,string>; content: Record<string,string>; active: boolean; createdAt: string; }
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [titleEs, setTitleEs] = useState("");
  const [contentEs, setContentEs] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/announcements");
    const d = await r.json();
    if (d.announcements) setAnnouncements(d.announcements);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!titleEs.trim() || !contentEs.trim()) return;
    setSaving(true);
    const langs = ["es","en","fr","de","pt","ja","zh"];
    const title: Record<string,string> = {};
    const content: Record<string,string> = {};
    langs.forEach(l => { title[l] = titleEs; content[l] = contentEs; });
    const r = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, active }),
    });
    if (r.ok) { setTitleEs(""); setContentEs(""); setMsg("Anuncio publicado"); load(); }
    else setMsg("Error al publicar");
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      {/* Left: Create form */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nuevo anuncio</p>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 6 }}>Título</label>
            <input style={input} value={titleEs} onChange={e => setTitleEs(e.target.value)} placeholder="🚀 Novedades de Elite Labs" required />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 6 }}>Contenido (usa **negrita** para resaltar)</label>
            <textarea
              style={{ ...input, minHeight: 120, resize: "vertical", fontFamily: "inherit" }}
              value={contentEs}
              onChange={e => setContentEs(e.target.value)}
              placeholder="**Nueva función** — Descripción de la novedad."
              required
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="ann-active" checked={active} onChange={e => setActive(e.target.checked)} style={{ accentColor: "#4ade80", width: 14, height: 14 }} />
            <label htmlFor="ann-active" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>Activo (visible para usuarios)</label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" disabled={saving} style={btn("#ffffff", { opacity: saving ? 0.6 : 1 })}>{saving ? "Publicando..." : "Publicar"}</button>
            {msg && <span style={{ fontSize: 13, color: msg.startsWith("Error") ? "#f87171" : "#4ade80" }}>{msg}</span>}
          </div>
        </form>
      </div>

      {/* Right: Announcements list */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Anuncios existentes ({announcements.length})
        </p>
        {announcements.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "3rem" }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", margin: 0 }}>No hay anuncios todavía.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {announcements.map(a => (
              <div key={a.id} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>{a.title.es}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: 0 }}>{new Date(a.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggle(a.id, a.active)}
                      title={a.active ? "Click para desactivar" : "Click para activar"}
                      style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: a.active ? "rgba(74,222,128,0.1)" : "rgba(107,114,128,0.1)", color: a.active ? "#4ade80" : "#6b7280", border: `1px solid ${a.active ? "rgba(74,222,128,0.25)" : "rgba(107,114,128,0.2)"}`, cursor: "pointer", transition: "all 0.15s", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}
                    >
                      {a.active ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      title="Eliminar anuncio"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", cursor: "pointer", padding: "5px 7px", borderRadius: 8, color: "rgba(239,68,68,0.55)", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0, overflow: "hidden", maxHeight: "2.6em", lineHeight: 1.5 }}>{a.content.es}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NAV config ──────────────────────────────────────────── */
/* ─── Section: Niche Finder ───────────────────────────────── */
function NicheFinderSection() {
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<object[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ inserted: number; updated: number; total: number; errors: string[] } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refreshCount() {
    setCountLoading(true);
    try {
      const res = await fetch("/api/admin/niche-channels-count");
      const data = await res.json();
      setCount(typeof data.count === "number" ? data.count : null);
    } catch { setCount(null); }
    finally { setCountLoading(false); }
  }

  useEffect(() => { refreshCount(); }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileError(null);
    setSyncResult(null);
    setSyncError(null);
    setFileData(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const channels = Array.isArray(raw) ? raw : raw?.channels;
        if (!Array.isArray(channels)) {
          setFileError("El archivo debe contener un array o un objeto con campo 'channels'.");
          return;
        }
        setFileData(channels);
      } catch {
        setFileError("JSON inválido — no se puede parsear el archivo.");
      }
    };
    reader.readAsText(f);
  }

  async function handleSync() {
    if (!fileData) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch("/api/admin/sync-niche-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: fileData }),
      });
      const text = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); }
      catch { throw new Error(`Respuesta no válida del servidor (${res.status}): ${text.slice(0, 200)}`); }
      if (!res.ok) throw new Error((data.error as string) ?? `Error ${res.status}`);
      setSyncResult({
        inserted: data.inserted as number,
        updated: data.updated as number,
        total: data.total as number,
        errors: Array.isArray(data.errors) ? data.errors as string[] : [],
      });
      await refreshCount();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontWeight: 800, fontSize: 22, color: "#fff", margin: 0 }}>Buscador de Nichos</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "4px 0 0" }}>
          Sincroniza canales de YouTube subiendo un archivo JSON generado externamente
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Database size={15} color="#a78bfa" />
          </div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Canales en base de datos</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
            {countLoading ? "…" : count?.toLocaleString("es-ES") ?? "—"}
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div style={{ ...card, maxWidth: 560 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb", marginBottom: 4 }}>Importar archivo JSON</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
          Formato: <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>{`{ channels: [...] }`}</code> o directamente un array <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>[...]</code>
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.12)", color: "#ccc", flexShrink: 0 })}
          >
            Elegir archivo
          </button>
          <span style={{ fontSize: 12, color: fileName ? "#e5e7eb" : "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {fileName ?? "Ningún archivo seleccionado"}
          </span>
        </div>

        {fileData && !fileError && (
          <p style={{ fontSize: 12, color: "#4ade80", marginBottom: 12 }}>
            ✓ {fileData.length.toLocaleString("es-ES")} canales detectados en el archivo
          </p>
        )}

        {fileError && (
          <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>✗ {fileError}</p>
        )}

        <button
          onClick={handleSync}
          disabled={!fileData || syncing}
          style={btn("#ffffff", { opacity: !fileData || syncing ? 0.5 : 1, cursor: !fileData || syncing ? "not-allowed" : "pointer" })}
        >
          {syncing ? "Sincronizando…" : "Sincronizar canales"}
        </button>

        {/* Result */}
        {syncResult && (
          <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>✓ Sincronización completada</p>
            <p style={{ fontSize: 13, color: "#e5e7eb" }}>
              Insertados: <strong>{syncResult.inserted.toLocaleString("es-ES")}</strong>
              {" · "}Actualizados: <strong>{syncResult.updated.toLocaleString("es-ES")}</strong>
              {" · "}Total: <strong>{syncResult.total.toLocaleString("es-ES")}</strong>
            </p>
            {syncResult.errors.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>
                  {syncResult.errors.length} error{syncResult.errors.length !== 1 ? "es" : ""}:
                </p>
                <div style={{ maxHeight: 120, overflowY: "auto", fontSize: 11, color: "#f87171", fontFamily: "monospace", lineHeight: 1.6 }}>
                  {syncResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {syncError && (
          <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>✗ Error en la sincronización</p>
            <p style={{ fontSize: 12, color: "#fca5a5", marginTop: 4, wordBreak: "break-all" }}>{syncError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const NAV_ITEMS_BASE: { key: Section; label: string; Icon: React.ElementType; href?: string }[] = [
  { key: "dashboard",     label: "Dashboard",      Icon: LayoutDashboard },
  { key: "users",         label: "Usuarios",        Icon: Users },
  { key: "subscriptions", label: "Suscripciones",   Icon: CreditCard },
  { key: "engines",       label: "Motores",          Icon: Mic2 },
  { key: "support",       label: "Soporte",          Icon: Ticket },
  { key: "affiliates",    label: "Afiliados ↗",      Icon: Handshake, href: "/admin/afiliados" },
  { key: "withdrawals",   label: "Retiros",          Icon: Wallet },
  { key: "analytics",     label: "Analytics",        Icon: BarChart2 },
  { key: "config",         label: "Configuración",    Icon: Settings },
  { key: "nichefinder",    label: "Niche Finder",     Icon: Database },
  { key: "logs",           label: "Logs",             Icon: ScrollText },
  { key: "cookies",        label: "Cookies",          Icon: Shield },
  { key: "announcements",  label: "Anuncios",         Icon: Monitor },
];

/* ─── Main ────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
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
  const [fishCredits, setFishCredits] = useState<{ credit: string } | null>(null);

  const toast = useCallback((msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const clockId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  const SECTION_TITLES: Record<Section, string> = {
    dashboard: "Dashboard", users: "Usuarios", subscriptions: "Suscripciones",
    engines: "Motores", support: "Soporte", affiliates: "Afiliados",
    withdrawals: "Retiros", analytics: "Analytics", config: "Configuración",
    nichefinder: "Buscador de Nichos",
    logs: "Logs", cookies: "Cookies", announcements: "Anuncios",
  };

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

  const fetchUsersPage = useCallback(async (page: number) => {
    const res = await fetch(`/api/admin/users?page=${page}&limit=50`);
    if (!res.ok) return;
    const data = await res.json();
    setUsers(Array.isArray(data.users) ? data.users : []);
    setUsersTotal(data.total ?? 0);
    setUsersTotalPages(data.totalPages ?? 1);
    setUsersPage(data.page ?? page);
  }, []);

  const fetchAll = useCallback(async () => {
    fetch("/api/admin/fish-credits").then(r => r.json()).then(d => setFishCredits(d)).catch(() => {});
    const [uRes, sRes, tRes, aRes, wRes, cfgRes] = await Promise.all([
      fetch("/api/admin/users?page=1&limit=50"),
      fetch("/api/admin/stats"),
      fetch("/api/admin/support"),
      fetch("/api/admin/affiliate-applications"),
      fetch("/api/admin/withdrawal-requests"),
      fetch("/api/admin/system-config"),
    ]);
    if (uRes.status === 403 || uRes.status === 401) { setAuthorized(false); return; }
    setAuthorized(true);
    const uData = await uRes.json();
    setUsers(Array.isArray(uData.users) ? uData.users : []);
    setUsersTotal(uData.total ?? 0);
    setUsersTotalPages(uData.totalPages ?? 1);
    setUsersPage(1);
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
        <EliteLoader />
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
    <div style={{ display: "flex", minHeight: "100vh", background: "#080808", color: "#fff", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* Logo */}
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Elite Labs</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, fontWeight: 500 }}>Admin Panel</p>
          </div>
        </div>
        {/* Nav groups */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {([
            { label: "GENERAL", keys: ["dashboard"] },
            { label: "GESTIÓN", keys: ["users", "subscriptions", "support", "affiliates", "withdrawals"] },
            { label: "PLATAFORMA", keys: ["engines", "analytics", "config", "nichefinder"] },
            { label: "SISTEMA", keys: ["logs", "cookies", "announcements"] },
          ] as Array<{ label: string; keys: string[] }>).map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", padding: "0 12px 6px", margin: 0 }}>{group.label}</p>
              {NAV_ITEMS.filter(item => group.keys.includes(item.key)).map(({ key, label, Icon, badge, href }: { key: string; label: string; Icon: React.ElementType; badge: number; href?: string }) => (
                <button key={key} onClick={() => href ? router.push(href) : setActiveSection(key as Section)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: activeSection === key ? "rgba(255,255,255,0.08)" : "transparent", color: activeSection === key ? "#ffffff" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: activeSection === key ? 600 : 500, marginBottom: 1, textAlign: "left", transition: "all 0.15s" }}>
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,0.85)", color: "#fff", flexShrink: 0 }}>{badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {/* Bottom */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {user?.primaryEmailAddress?.emailAddress && (
            <div style={{ padding: "4px 12px 8px" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.primaryEmailAddress.emailAddress}</p>
            </div>
          )}
          <button onClick={() => router.push("/dashboard")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
            <ArrowLeft size={13} />
            Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top header bar */}
        <div style={{ height: 64, flexShrink: 0, position: "sticky", top: 0, zIndex: 10, background: "rgba(8,8,8,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0, fontWeight: 500 }}>Admin</p>
            <p style={{ fontSize: 15, color: "#fff", margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>{SECTION_TITLES[activeSection]}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>{currentTime.toLocaleTimeString("es-ES")}</span>
            <button onClick={() => fetchAll()} style={btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.08)", color: "#888888", display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "12px" })}>
              <RefreshCw size={12} />
              Actualizar
            </button>
          </div>
        </div>

        <div style={{ padding: "28px 32px", flex: 1 }}>
          {/* Toast */}
          {feedback && (
            <div style={{ position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 200, padding: "0.75rem 1.25rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.875rem", background: feedback.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)", color: feedback.ok ? "#4ade80" : "#f87171", border: `1px solid ${feedback.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              {feedback.msg}
            </div>
          )}

          {/* Modals */}
          {detailUserId && <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} toast={toast} />}
          {affiliateDetailApp && <AffiliateDetailModal app={affiliateDetailApp} onClose={() => setAffiliateDetailApp(null)} onUpdate={updateAffiliateStatus} toast={toast} />}

          {/* Sections */}
          <div key={activeSection} style={{ animation: "fadeIn 200ms ease-out" }}>
            {activeSection === "dashboard" && (
              <DashboardSection users={users} stats={stats} tickets={tickets} withdrawals={withdrawalRequests} affiliates={affiliateApps} onNav={setActiveSection} fishCredits={fishCredits} ai33Health={ai33Health} />
            )}
            {activeSection === "users" && (
              <UsersSection
                users={users}
                usersPage={usersPage}
                usersTotal={usersTotal}
                usersTotalPages={usersTotalPages}
                onPageChange={fetchUsersPage}
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
            {activeSection === "config" && <ConfigSection />}
            {activeSection === "logs" && <LogsSection />}
            {activeSection === "cookies" && <CookiesSection />}
            {activeSection === "announcements" && <AnnouncementsSection />}
            {activeSection === "nichefinder" && <NicheFinderSection />}
          </div>
        </div>
      </main>
    </div>
  );
}
