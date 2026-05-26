"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/CustomSelect";

/* ─── Types ───────────────────────────────────────────────── */
const PLAN_PRICE: Record<string, number> = { free: 0, starter: 7, pro: 13, elite: 25, enterprise: 110 };

interface AffiliateApplication {
  id: string;
  name: string;
  email: string;
  platform: string;
  audience: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  method: string;
  details: Record<string, string>;
  status: string;
  createdAt: string;
  paidAt: string | null;
  user: { email: string };
}

interface AdminUser {
  id: string;
  email: string;
  credits: number;
  plan: string;
  role: string;
  createdAt: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  planExpiresAt: string | null;
  billingInterval: string;
  creditsRenewedAt: string | null;
  _count: { generations: number };
}

interface StripeSubDetail {
  noSubscription?: boolean;
  subscriptionId?: string;
  customerId?: string | null;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  cancelAt?: string | null;
  interval?: string | null;
  error?: string;
}

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  totalCreditsConsumed: number;
  totalRevenueDollars: string;
}

interface SupportTicket {
  id: string;
  type: string;
  description: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
  user: { email: string; plan: string };
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  general: "Ayuda general", technical: "Problema técnico",
  billing: "Facturación", refund: "Reembolso", other: "Otro",
};

interface Generation {
  id: string;
  text: string;
  audioUrl: string;
  creditsUsed: number;
  durationSeconds: number;
  refunded: boolean;
  createdAt: string;
}

interface UserDetail {
  user: { id: string; email: string; credits: number; plan: string; role: string; createdAt: string };
  generations: Generation[];
}

interface Payment {
  id: string;
  stripeSessionId: string;
  paymentIntentId: string | null;
  amount: number;
  creditsPurchased: number;
  status: string;
  amountRefunded: number;
  last4: string | null;
  createdAt: string;
}

/* ─── Style helpers ───────────────────────────────────────── */
const card = {
  background: "#12121a",
  border: "1px solid #2a2a3e",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const input = {
  background: "#0d0d17",
  border: "1px solid #2a2a3e",
  borderRadius: "0.5rem",
  color: "#fff",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
} as const;

const btn = (color = "#3b82f6", extra: React.CSSProperties = {}) =>
  ({
    background: color,
    border: "none",
    borderRadius: "0.5rem",
    color: "#fff",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    ...extra,
  } as const);

function Tag({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "999px",
      fontSize: "0.7rem", fontWeight: 700,
      background: isAdmin ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
      color: isAdmin ? "#93c5fd" : "#8888a8",
      border: `1px solid ${isAdmin ? "rgba(59,130,246,0.35)" : "#2a2a3e"}`,
    }}>
      {isAdmin ? "admin" : "user"}
    </span>
  );
}

/* ─── Audio player cell ───────────────────────────────────── */
function AudioCell({ url }: { url: string }) {
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
      <button onClick={toggle} style={btn(playing ? "#6b7280" : "#3b82f6", { padding: "0.3rem 0.7rem", fontSize: "0.75rem" })}>
        {playing ? "⏸ Parar" : "▶ Escuchar"}
      </button>
    </>
  );
}

/* ─── User Detail Modal ───────────────────────────────────── */
function UserDetailModal({
  userId,
  onClose,
  toast,
}: {
  userId: string;
  onClose: () => void;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"generaciones" | "pagos">("generaciones");
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [refundingPayment, setRefundingPayment] = useState<string | null>(null);
  const [stripeSub, setStripeSub] = useState<StripeSubDetail | null>(null);
  const [stripeSubLoading, setStripeSubLoading] = useState(false);
  const [planValue, setPlanValue] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
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
    } finally {
      setPaymentsLoading(false);
    }
  }, [userId, toast]);

  const fetchStripeSub = useCallback(async () => {
    setStripeSubLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`);
      const data = await res.json();
      setStripeSub(data);
    } catch {
      setStripeSub({ error: "Error de conexión" });
    } finally {
      setStripeSubLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => { fetchStripeSub(); }, [fetchStripeSub]);
  useEffect(() => { if (detail?.user.plan) setPlanValue(detail.user.plan); }, [detail]);

  useEffect(() => {
    if (modalTab === "pagos" && payments === null) fetchPayments();
  }, [modalTab, payments, fetchPayments]);

  async function handleAssignPlan() {
    if (!planValue || planValue === detail?.user.plan) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Plan actualizado a "${data.plan}". Créditos: ${data.credits.toLocaleString("es-ES")}`);
      fetchDetail();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error asignando plan", false);
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleRefund(gen: Generation) {
    setRefunding(gen.id);
    try {
      const res = await fetch(`/api/admin/users/${userId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: gen.id, creditsToRefund: gen.creditsUsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Devueltos ${gen.creditsUsed.toLocaleString("es-ES")} créditos. Nuevo saldo: ${data.newCredits.toLocaleString("es-ES")}`);
      fetchDetail();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error en reembolso", false);
    } finally {
      setRefunding(null);
    }
  }

  async function handleRefundPayment(payment: Payment) {
    if (!payment.paymentIntentId) { toast("Sin payment intent", false); return; }
    setRefundingPayment(payment.id);
    try {
      const res = await fetch(`/api/admin/users/${userId}/refund-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: payment.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Reembolso de $${payment.amount.toFixed(2)} procesado. Créditos deducidos: ${data.creditsDeducted.toLocaleString("es-ES")}`);
      setPayments(null);
      fetchPayments();
      fetchDetail();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error en reembolso Stripe", false);
    } finally {
      setRefundingPayment(null);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; color: string }> = {
      succeeded:  { label: "COMPLETADO", color: "#4ade80" },
      refunded:   { label: "REEMBOLSADO", color: "#f59e0b" },
      canceled:   { label: "CANCELADO", color: "#f87171" },
      failed:     { label: "FALLIDO", color: "#f87171" },
    };
    const s = map[status] ?? { label: status.toUpperCase(), color: "#8888a8" };
    return <span style={{ color: s.color, fontSize: "0.7rem", fontWeight: 700 }}>{s.label}</span>;
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "2rem 1rem", overflowY: "auto",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "960px",
        background: "#0d0d17", borderRadius: "1.25rem",
        border: "1px solid #2a2a3e", overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #2a2a3e" }}>
          <p style={{ fontWeight: 700, fontSize: "1rem" }}>Detalle de usuario</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8888a8", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555570" }}>Cargando...</div>
        ) : detail ? (
          <div style={{ padding: "1.5rem" }}>
            {/* User info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Email",    value: detail.user.email },
                { label: "Créditos", value: detail.user.credits.toLocaleString("es-ES") },
                { label: "Rol",      value: detail.user.role },
                { label: "Registro", value: new Date(detail.user.createdAt).toLocaleDateString("es-ES") },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "0.75rem", padding: "0.75rem 1rem" }}>
                  <p style={{ color: "#555570", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>{label}</p>
                  <p style={{ color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 600, wordBreak: "break-all" }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Estado Stripe */}
            <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", background: "#0a0a0f", border: "1px solid #2a2a3e" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555570", marginBottom: "0.75rem" }}>Estado Stripe</p>
              {stripeSubLoading ? (
                <p style={{ color: "#555570", fontSize: "0.8rem" }}>Consultando Stripe...</p>
              ) : stripeSub?.noSubscription ? (
                <p style={{ color: "#555570", fontSize: "0.8rem" }}>Sin suscripción en Stripe</p>
              ) : stripeSub?.error ? (
                <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{stripeSub.error}</p>
              ) : stripeSub ? (() => {
                const statusColors: Record<string, string> = {
                  active: "#4ade80", canceled: "#f87171", past_due: "#f59e0b",
                  trialing: "#93c5fd", incomplete: "#f59e0b", unpaid: "#f87171",
                };
                const statusLabels: Record<string, string> = {
                  active: "ACTIVO", canceled: "CANCELADO", past_due: "PAGO PENDIENTE",
                  trialing: "TRIAL", incomplete: "INCOMPLETO", unpaid: "IMPAGADO",
                };
                const col = statusColors[stripeSub.status ?? ""] ?? "#8888a8";
                const lbl = statusLabels[stripeSub.status ?? ""] ?? (stripeSub.status ?? "").toUpperCase();
                const periodDate = stripeSub.currentPeriodEnd
                  ? new Date(stripeSub.currentPeriodEnd).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
                  : null;
                const cancelDate = stripeSub.cancelAt
                  ? new Date(stripeSub.cancelAt).toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
                  : null;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", color: col, background: `${col}22`, border: `1px solid ${col}55` }}>
                      {lbl}
                    </span>
                    {stripeSub.cancelAtPeriodEnd && periodDate && (
                      <span style={{ fontSize: "0.78rem", color: "#f59e0b", fontWeight: 600 }}>
                        ⚠ Cancela el {periodDate}
                      </span>
                    )}
                    {!stripeSub.cancelAtPeriodEnd && stripeSub.status === "active" && periodDate && (
                      <span style={{ fontSize: "0.78rem", color: "#4ade80" }}>
                        ↻ Renueva el {periodDate}
                      </span>
                    )}
                    {stripeSub.status === "past_due" && (
                      <span style={{ fontSize: "0.78rem", color: "#f87171", fontWeight: 600 }}>
                        ✕ Pago pendiente — requiere acción
                      </span>
                    )}
                    {stripeSub.status === "canceled" && cancelDate && (
                      <span style={{ fontSize: "0.78rem", color: "#f87171" }}>
                        Cancelado el {cancelDate}
                      </span>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "#6b7280", padding: "1px 8px", borderRadius: "999px", border: "1px solid #2a2a3e" }}>
                      {stripeSub.interval === "year" ? "Anual" : "Mensual"}
                    </span>
                    {stripeSub.customerId && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${stripeSub.customerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.75rem", color: "#93c5fd", textDecoration: "none", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)" }}
                      >
                        Ver en Stripe ↗
                      </a>
                    )}
                  </div>
                );
              })() : null}
            </div>

            {/* Cambiar plan */}
            <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", background: "#0a0a0f", border: "1px solid #2a2a3e" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555570", marginBottom: "0.75rem" }}>
                Plan actual: <span style={{ color: "#e5e7eb" }}>{detail.user.plan}</span>
              </p>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <CustomSelect
                  options={["free", "starter", "pro", "elite", "enterprise"].map((p) => ({ value: p, label: p }))}
                  value={planValue}
                  onChange={setPlanValue}
                  style={{ minWidth: "160px" }}
                />
                <button
                  onClick={handleAssignPlan}
                  disabled={planLoading || !planValue || planValue === detail.user.plan}
                  style={btn("#3b82f6", { opacity: planLoading || planValue === detail.user.plan ? 0.5 : 1 })}
                >
                  {planLoading ? "Asignando..." : "Asignar plan"}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #2a2a3e", marginBottom: "1rem" }}>
              {(["generaciones", "pagos"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setModalTab(t)}
                  style={{
                    padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: 600,
                    background: "none", border: "none", cursor: "pointer",
                    color: modalTab === t ? "#fff" : "#555570",
                    borderBottom: modalTab === t ? "2px solid #3b82f6" : "2px solid transparent",
                    textTransform: "capitalize",
                  }}
                >
                  {t === "generaciones" ? `Generaciones (${detail.generations.length})` : "Pagos"}
                </button>
              ))}
            </div>

            {/* ── Generaciones tab ── */}
            {modalTab === "generaciones" && (
              detail.generations.length === 0 ? (
                <p style={{ color: "#555570", fontSize: "0.85rem", padding: "1rem 0" }}>Sin generaciones.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                        {["Fecha", "Texto", "Duración", "Créditos", "Estado", "Audio", "Acción"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555570", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.generations.map((g) => (
                        <tr key={g.id} style={{ borderBottom: "1px solid #1e1e2e", opacity: g.refunded ? 0.5 : 1 }}>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#555570", whiteSpace: "nowrap" }}>
                            {new Date(g.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", maxWidth: "220px" }}>
                            <span title={g.text}>{g.text.slice(0, 50)}{g.text.length > 50 ? "…" : ""}</span>
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {g.durationSeconds.toFixed(1)}s
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#93c5fd", fontWeight: 600 }}>
                            {g.creditsUsed.toLocaleString("es-ES")}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>
                            {g.refunded
                              ? <span style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: 700 }}>REEMBOLSADO</span>
                              : <span style={{ color: "#4ade80", fontSize: "0.7rem", fontWeight: 700 }}>COMPLETADO</span>}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>
                            <AudioCell url={g.audioUrl} />
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>
                            {!g.refunded && (
                              <button
                                onClick={() => handleRefund(g)}
                                disabled={refunding === g.id}
                                style={btn("#6b7280", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", opacity: refunding === g.id ? 0.6 : 1 })}
                              >
                                {refunding === g.id ? "..." : "Devolver créditos"}
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

            {/* ── Pagos tab ── */}
            {modalTab === "pagos" && (
              paymentsLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#555570" }}>Consultando Stripe...</div>
              ) : payments === null ? null : payments.length === 0 ? (
                <p style={{ color: "#555570", fontSize: "0.85rem", padding: "1rem 0" }}>Sin pagos registrados.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                        {["Fecha", "Importe", "Reembolsado", "Caracteres", "Tarjeta", "Estado", "Acción"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555570", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1e1e2e", opacity: p.status === "refunded" ? 0.55 : 1 }}>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#555570", whiteSpace: "nowrap" }}>
                            {new Date(p.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#4ade80", fontWeight: 600 }}>
                            ${p.amount.toFixed(2)}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: p.amountRefunded > 0 ? "#f59e0b" : "#555570" }}>
                            {p.amountRefunded > 0 ? `$${p.amountRefunded.toFixed(2)}` : "—"}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#93c5fd", fontWeight: 600 }}>
                            {p.creditsPurchased.toLocaleString("es-ES")}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>
                            {p.last4 ? `•••• ${p.last4}` : "—"}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>
                            {statusBadge(p.status)}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem" }}>
                            {p.status === "succeeded" && p.paymentIntentId && (
                              <button
                                onClick={() => handleRefundPayment(p)}
                                disabled={refundingPayment === p.id}
                                style={btn("#ef4444", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", opacity: refundingPayment === p.id ? 0.6 : 1 })}
                              >
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
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────── */
/* ─── Affiliate Detail Modal ──────────────────────────────── */
function AffiliateDetailModal({
  app,
  onClose,
  onUpdate,
  toast,
}: {
  app: AffiliateApplication;
  onClose: () => void;
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
    } catch {
      toast("Error al actualizar", false);
    } finally {
      setLoading(null);
    }
  }

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #1e1e2e" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#555570", width: 140, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: "0.875rem", color: "#e5e7eb", wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  const statusColor = app.status === "approved" ? "#4ade80" : app.status === "rejected" ? "#f87171" : "#fbbf24";
  const statusBg = app.status === "approved" ? "rgba(74,222,128,0.12)" : app.status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)";
  const statusBorder = app.status === "approved" ? "rgba(74,222,128,0.3)" : app.status === "rejected" ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)";
  const statusLabel = app.status === "approved" ? "Aprobado" : app.status === "rejected" ? "Rechazado" : "Pendiente";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "16px", width: "100%", maxWidth: "520px", padding: "28px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#fff", margin: 0 }}>Solicitud de afiliado</p>
            <p style={{ fontSize: "0.75rem", color: "#555570", margin: "4px 0 0" }}>{app.id}</p>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
            {statusLabel}
          </span>
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
            <button
              onClick={() => handle("approved")}
              disabled={loading !== null}
              style={{ ...btn("#16a34a"), flex: 1, opacity: loading ? 0.6 : 1 }}
            >
              {loading === "approved" ? "Aprobando..." : "✓ Aprobar"}
            </button>
            <button
              onClick={() => handle("rejected")}
              disabled={loading !== null}
              style={{ ...btn("#dc2626"), flex: 1, opacity: loading ? 0.6 : 1 }}
            >
              {loading === "rejected" ? "Rechazando..." : "✕ Rechazar"}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{ ...btn("#1e1e2e", { border: "1px solid #2a2a3e", color: "#8888a8" }), width: "100%", marginTop: app.status === "pending" ? "8px" : "20px" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

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

  // Credits form
  const [creditUserId, setCreditUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditOp, setCreditOp] = useState<"add" | "subtract">("add");
  const [creditLoading, setCreditLoading] = useState(false);

  // Role form
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState<"admin" | "user">("admin");
  const [roleLoading, setRoleLoading] = useState(false);

  const toast = useCallback((msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }, []);

  const fetchAll = useCallback(async () => {
    const [uRes, sRes, tRes, aRes, wRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/stats"),
      fetch("/api/admin/support"),
      fetch("/api/admin/affiliate-applications"),
      fetch("/api/admin/withdrawal-requests"),
    ]);
    if (uRes.status === 403 || uRes.status === 401) { setAuthorized(false); return; }
    setAuthorized(true);
    const uData = await uRes.json();
    setUsers(Array.isArray(uData) ? uData : []);
    const sData = await sRes.json();
    setStats(sData && !sData.error ? sData : null);
    const tData = await tRes.json();
    setTickets(Array.isArray(tData) ? tData : []);
    const aData = await aRes.json();
    setAffiliateApps(Array.isArray(aData) ? aData : []);
    const wData = await wRes.json();
    setWithdrawalRequests(Array.isArray(wData) ? wData : []);
  }, []);

  async function handleWithdrawal(id: string, status: "paid" | "rejected") {
    setWithdrawalLoading(id);
    try {
      const res = await fetch(`/api/admin/withdrawal-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error");
      }
      setWithdrawalRequests((prev) => prev.map((w) => w.id === id ? { ...w, status, paidAt: status === "paid" ? new Date().toISOString() : null } : w));
      toast(status === "paid" ? "Marcado como pagado" : "Solicitud rechazada y saldo devuelto", status === "paid");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", false);
    } finally {
      setWithdrawalLoading(null);
    }
  }

  async function updateAffiliateStatus(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/admin/affiliate-applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al actualizar");
    }
    setAffiliateApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    // update detail if open
    setAffiliateDetailApp((prev) => (prev?.id === id ? { ...prev, status } : prev));
  }

  useEffect(() => { if (isLoaded && user) fetchAll(); }, [isLoaded, user, fetchAll]);
  useEffect(() => { if (isLoaded && !user) router.push("/sign-in"); }, [isLoaded, user, router]);

  async function handleCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!creditUserId || !creditAmount) return;
    setCreditLoading(true);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: creditUserId, amount: Number(creditAmount), operation: creditOp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Créditos actualizados. Nuevo saldo: ${data.credits.toLocaleString("es-ES")}`);
      setCreditUserId(""); setCreditAmount("");
      fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", false);
    } finally { setCreditLoading(false); }
  }

  async function handleRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleUserId) return;
    setRoleLoading(true);
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: roleUserId, role: roleValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Rol actualizado a "${data.role}"`);
      setRoleUserId("");
      fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", false);
    } finally { setRoleLoading(false); }
  }

  async function handleReply(ticketId: string, close: boolean) {
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText, close }),
      });
      if (!res.ok) throw new Error("Error al responder");
      toast(close ? "Ticket cerrado" : "Respuesta enviada");
      setReplyTicketId(null);
      setReplyText("");
      fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", false);
    } finally { setReplyLoading(false); }
  }

  if (!isLoaded || authorized === null)
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8888a8" }}>Cargando...</p>
      </div>
    );

  if (authorized === false)
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "#f87171", fontSize: "1.25rem", fontWeight: 700 }}>Acceso denegado</p>
        <p style={{ color: "#8888a8" }}>Necesitas permisos de administrador.</p>
        <button style={btn()} onClick={() => router.push("/dashboard")}>Volver al dashboard</button>
      </div>
    );

  const filtered = users.filter(
    (u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #2a2a3e", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: "1.1rem" }}>Panel de Administración</p>
          <p style={{ color: "#555570", fontSize: "0.75rem" }}>Elite Labs — acceso restringido</p>
        </div>
        <button style={{ ...btn(), background: "#1a1a2e", border: "1px solid #2a2a3e" }} onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </button>
      </div>

      {/* Toast */}
      {feedback && (
        <div style={{
          position: "fixed", top: "5rem", right: "2rem", zIndex: 200,
          padding: "0.75rem 1.25rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.875rem",
          background: feedback.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
          color: feedback.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${feedback.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {feedback.msg}
        </div>
      )}

      {/* User detail modal */}
      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          toast={toast}
        />
      )}

      {/* Affiliate detail modal */}
      {affiliateDetailApp && (
        <AffiliateDetailModal
          app={affiliateDetailApp}
          onClose={() => setAffiliateDetailApp(null)}
          onUpdate={updateAffiliateStatus}
          toast={toast}
        />
      )}

      {/* Quick-nav strip */}
      {(() => {
        const pendingAff = affiliateApps.filter(a => a.status === "pending").length;
        const openTickets = tickets.filter(t => t.status === "open").length;
        const pendingWithdrawals = withdrawalRequests.filter(w => w.status === "pending").length;
        return (
          <div style={{ borderBottom: "1px solid #1e1e2e", padding: "0 2rem", display: "flex", gap: "4px", overflowX: "auto" }}>
            {[
              { label: "Usuarios", anchor: "#section-users", badge: 0 },
              { label: "Tickets soporte", anchor: "#section-tickets", badge: openTickets },
              { label: "Solicitudes Afiliados", anchor: "#section-affiliates", badge: pendingAff },
              { label: "Solicitudes de Retiro", anchor: "#section-withdrawals", badge: pendingWithdrawals },
            ].map(({ label, anchor, badge }) => (
              <a
                key={anchor}
                href={anchor}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 14px", fontSize: "13px", fontWeight: 500, color: "#8888a8", textDecoration: "none", whiteSpace: "nowrap", borderBottom: "2px solid transparent" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#e5e7eb")}
                onMouseLeave={e => (e.currentTarget.style.color = "#8888a8")}
              >
                {label}
                {badge > 0 && (
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "999px", background: "rgba(239,68,68,0.85)", color: "#fff", lineHeight: 1.6 }}>
                    {badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        );
      })()}

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Usuarios totales",     value: stats.totalUsers.toLocaleString("es-ES") },
              { label: "Generaciones totales",  value: stats.totalGenerations.toLocaleString("es-ES") },
              { label: "Créditos consumidos",   value: stats.totalCreditsConsumed.toLocaleString("es-ES") },
              { label: "MRR estimado",           value: `$${stats.totalRevenueDollars}/mes` },
            ].map(({ label, value }) => (
              <div key={label} style={card}>
                <p style={{ color: "#555570", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>{label}</p>
                <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Management row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>

          {/* Credits */}
          <div style={card}>
            <p style={{ fontWeight: 700, marginBottom: "1rem" }}>Gestión de créditos</p>
            <form onSubmit={handleCredits} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>ID de usuario</label>
                <input style={input} placeholder="cuid del usuario" value={creditUserId} onChange={(e) => setCreditUserId(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>Cantidad</label>
                  <input style={input} type="number" min="1" placeholder="0" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>Operación</label>
                  <CustomSelect
                    options={[{ value: "add", label: "Añadir" }, { value: "subtract", label: "Quitar" }]}
                    value={creditOp}
                    onChange={(v) => setCreditOp(v as "add" | "subtract")}
                    className="w-full"
                  />
                </div>
              </div>
              <button type="submit" disabled={creditLoading} style={{ ...btn(creditOp === "add" ? "#3b82f6" : "#ef4444"), opacity: creditLoading ? 0.6 : 1 }}>
                {creditLoading ? "Procesando..." : creditOp === "add" ? "Añadir créditos" : "Quitar créditos"}
              </button>
            </form>
          </div>

          {/* Role */}
          <div style={card}>
            <p style={{ fontWeight: 700, marginBottom: "1rem" }}>Gestión de roles</p>
            <form onSubmit={handleRole} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>ID de usuario</label>
                <input style={input} placeholder="cuid del usuario" value={roleUserId} onChange={(e) => setRoleUserId(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>Nuevo rol</label>
                <CustomSelect
                  options={[{ value: "user", label: "user" }, { value: "admin", label: "admin" }]}
                  value={roleValue}
                  onChange={(v) => setRoleValue(v as "admin" | "user")}
                  className="w-full"
                />
              </div>
              <button type="submit" disabled={roleLoading} style={{ ...btn(), opacity: roleLoading ? 0.6 : 1 }}>
                {roleLoading ? "Actualizando..." : "Cambiar rol"}
              </button>
            </form>
          </div>
        </div>

        {/* Users table */}
        <div id="section-users" style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <p style={{ fontWeight: 700 }}>Usuarios ({filtered.length})</p>
            <input style={{ ...input, width: "260px" }} placeholder="Buscar por email o ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                  {["ID", "Email", "Créditos", "Generaciones", "Ingresos", "Suscripción", "Rol", "Registro", ""].map((h) => (
                    <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555570", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const planPrice = PLAN_PRICE[u.plan] ?? 0;
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#555570", fontFamily: "monospace", fontSize: "0.7rem" }}>
                        <button
                          onClick={() => { navigator.clipboard.writeText(u.id); toast("ID copiado"); }}
                          title="Copiar ID"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#555570", fontFamily: "monospace" }}
                        >
                          {u.id.slice(0, 10)}…
                        </button>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#e5e7eb" }}>{u.email}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#93c5fd", fontWeight: 600 }}>{u.credits.toLocaleString("es-ES")}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{u._count.generations}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <span style={{ color: planPrice > 0 ? "#4ade80" : "#555570", fontWeight: 600 }}>
                          {planPrice > 0 ? `$${planPrice}/mes` : "—"}
                        </span>
                        <span style={{ marginLeft: "6px", fontSize: "0.65rem", color: "#555570", textTransform: "uppercase" }}>
                          {u.plan}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {(() => {
                          const now = new Date();
                          const expires = u.planExpiresAt ? new Date(u.planExpiresAt) : null;
                          const expired = expires && expires < now;
                          if (expired) {
                            return <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: "#f87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", whiteSpace: "nowrap" }}>Expirado</span>;
                          }
                          if (!u.stripeSubscriptionId || u.plan === "free") {
                            return <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: "#6b7280", background: "rgba(107,114,128,0.1)", border: "1px solid #2a2a3e", whiteSpace: "nowrap" }}>Sin plan</span>;
                          }
                          const dateStr = expires ? expires.toLocaleDateString("es-ES", { timeZone: "UTC", day: "numeric", month: "short" }) : null;
                          if (u.billingInterval === "annual") {
                            return <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: "#93c5fd", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", whiteSpace: "nowrap" }}>Anual{dateStr ? ` · ${dateStr}` : ""}</span>;
                          }
                          return <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", whiteSpace: "nowrap" }}>Mensual{dateStr ? ` · ${dateStr}` : ""}</span>;
                        })()}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}><Tag role={u.role} /></td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#555570", whiteSpace: "nowrap" }}>
                        {new Date(u.createdAt).toLocaleDateString("es-ES")}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <button
                          onClick={() => setDetailUserId(u.id)}
                          style={btn("#1e1e2e", { border: "1px solid #2a2a3e", color: "#93c5fd", padding: "0.3rem 0.7rem", fontSize: "0.75rem" })}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#555570" }}>
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support tickets */}
        <div id="section-tickets" style={{ ...card, marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 700 }}>Tickets de soporte</p>
            {tickets.filter(t => t.status === "open").length > 0 && (
              <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
                {tickets.filter(t => t.status === "open").length} abiertos
              </span>
            )}
          </div>
          {tickets.length === 0 ? (
            <p style={{ color: "#555570", fontSize: "0.85rem" }}>No hay tickets.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tickets.map(ticket => (
                <div key={ticket.id} style={{ borderRadius: "12px", border: `1px solid ${ticket.status === "closed" ? "#1e1e2e" : "#2a2a3e"}`, background: "#0a0a0f", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af" }}>{TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}</span>
                        <span style={{ fontSize: "0.65rem", color: "#555570" }}>·</span>
                        <span style={{ fontSize: "0.7rem", color: "#555570" }}>{ticket.user.email}</span>
                        <span style={{ fontSize: "0.65rem", padding: "1px 7px", borderRadius: "999px", background: ticket.status === "closed" ? "rgba(107,114,128,0.12)" : "rgba(59,130,246,0.12)", color: ticket.status === "closed" ? "#6b7280" : "#93c5fd", border: `1px solid ${ticket.status === "closed" ? "#2a2a3e" : "rgba(59,130,246,0.25)"}`, fontWeight: 700 }}>
                          {ticket.status === "closed" ? "CERRADO" : "ABIERTO"}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "#2e2e48", marginLeft: "auto" }}>
                          {new Date(ticket.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5 }}>{ticket.description}</p>
                      {ticket.adminReply && (
                        <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
                          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3b82f6", marginBottom: "3px" }}>TU RESPUESTA</p>
                          <p style={{ fontSize: "0.78rem", color: "#93c5fd" }}>{ticket.adminReply}</p>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {ticket.status === "open" && (
                        <>
                          <button
                            onClick={() => { setReplyTicketId(replyTicketId === ticket.id ? null : ticket.id); setReplyText(ticket.adminReply ?? ""); }}
                            style={btn("#1e3a5f", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", border: "1px solid rgba(59,130,246,0.3)" })}
                          >
                            Responder
                          </button>
                          <button
                            onClick={() => handleReply(ticket.id, true)}
                            style={btn("#1e1e2e", { padding: "0.3rem 0.7rem", fontSize: "0.75rem", border: "1px solid #2a2a3e", color: "#6b7280" })}
                          >
                            Cerrar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {replyTicketId === ticket.id && (
                    <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e2e", background: "#0d0d17" }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={3}
                        style={{ ...input, resize: "vertical", marginBottom: "8px" }}
                      />
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleReply(ticket.id, false)}
                          disabled={replyLoading || !replyText.trim()}
                          style={btn("#3b82f6", { padding: "0.4rem 1rem", fontSize: "0.8rem", opacity: replyLoading || !replyText.trim() ? 0.6 : 1 })}
                        >
                          {replyLoading ? "Enviando..." : "Enviar respuesta"}
                        </button>
                        <button
                          onClick={() => handleReply(ticket.id, true)}
                          disabled={replyLoading}
                          style={btn("#1e3a5f", { padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid rgba(59,130,246,0.3)" })}
                        >
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

        {/* Affiliate applications */}
        {(() => {
          const pendingCount = affiliateApps.filter(a => a.status === "pending").length;
          return (
            <div id="section-affiliates" style={{ ...card, marginTop: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                <p style={{ fontWeight: 700 }}>Solicitudes Afiliados ({affiliateApps.length})</p>
                {pendingCount > 0 && (
                  <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                    {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {affiliateApps.length === 0 ? (
                <p style={{ color: "#555570", fontSize: "0.85rem" }}>No hay solicitudes de afiliado aún.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                        {["Nombre", "Email", "Canal / Plataforma", "Audiencia", "Pago", "Fecha", "Estado", "Acciones"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555570", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {affiliateApps.map((app) => {
                        const statusColor = app.status === "approved" ? "#4ade80" : app.status === "rejected" ? "#f87171" : "#fbbf24";
                        const statusBg = app.status === "approved" ? "rgba(74,222,128,0.12)" : app.status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)";
                        const statusBorder = app.status === "approved" ? "rgba(74,222,128,0.3)" : app.status === "rejected" ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)";
                        const statusLabel = app.status === "approved" ? "Aprobado" : app.status === "rejected" ? "Rechazado" : "Pendiente";
                        return (
                          <tr key={app.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#e5e7eb", whiteSpace: "nowrap" }}>{app.name}</td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{app.email}</td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", maxWidth: 160 }}>
                              <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.platform}</span>
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", maxWidth: 140 }}>
                              <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.audience}</span>
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                              {app.paymentMethod === "paypal" ? "PayPal" : "Transferencia"}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#555570", whiteSpace: "nowrap" }}>
                              {new Date(app.createdAt).toLocaleDateString("es-ES")}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, whiteSpace: "nowrap" }}>
                                {statusLabel}
                              </span>
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                <button
                                  onClick={() => setAffiliateDetailApp(app)}
                                  style={btn("#1e1e2e", { border: "1px solid #2a2a3e", color: "#93c5fd", padding: "0.25rem 0.6rem", fontSize: "0.7rem" })}
                                >
                                  Ver
                                </button>
                                {app.status === "pending" && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await updateAffiliateStatus(app.id, "approved");
                                          toast("Solicitud aprobada");
                                        } catch { toast("Error al aprobar", false); }
                                      }}
                                      style={btn("#16a34a", { padding: "0.25rem 0.6rem", fontSize: "0.7rem" })}
                                    >
                                      Aprobar
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await updateAffiliateStatus(app.id, "rejected");
                                          toast("Solicitud rechazada", false);
                                        } catch { toast("Error al rechazar", false); }
                                      }}
                                      style={btn("#dc2626", { padding: "0.25rem 0.6rem", fontSize: "0.7rem" })}
                                    >
                                      Rechazar
                                    </button>
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
              )}
            </div>
          );
        })()}

        {/* Withdrawal requests */}
        {(() => {
          const pendingCount = withdrawalRequests.filter(w => w.status === "pending").length;
          return (
            <div id="section-withdrawals" style={{ ...card, marginTop: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                <p style={{ fontWeight: 700 }}>Solicitudes de Retiro ({withdrawalRequests.length})</p>
                {pendingCount > 0 && (
                  <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                    {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {withdrawalRequests.length === 0 ? (
                <p style={{ color: "#555570", fontSize: "0.85rem" }}>No hay solicitudes de retiro aún.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                        {["Usuario", "Importe", "Método", "Detalles", "Fecha", "Estado", "Acciones"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555570", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalRequests.map((w) => {
                        const statusColor = w.status === "paid" ? "#4ade80" : w.status === "rejected" ? "#f87171" : "#fbbf24";
                        const statusBg = w.status === "paid" ? "rgba(74,222,128,0.12)" : w.status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)";
                        const statusBorder = w.status === "paid" ? "rgba(74,222,128,0.3)" : w.status === "rejected" ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)";
                        const statusLabel = w.status === "paid" ? "Pagado" : w.status === "rejected" ? "Rechazado" : "Pendiente";
                        const detailStr = w.method === "paypal"
                          ? `PayPal: ${w.details?.email ?? "—"}`
                          : `${w.details?.bankName ?? "—"} · ${w.details?.iban ?? "—"}`;
                        return (
                          <tr key={w.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{w.user.email}</td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#4ade80", fontWeight: 700 }}>${w.amount.toFixed(2)}</td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                              {w.method === "paypal" ? "PayPal" : "Transferencia"}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#6b7280", maxWidth: 200 }}>
                              <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detailStr}</span>
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "#555570", whiteSpace: "nowrap" }}>
                              {new Date(w.createdAt).toLocaleDateString("es-ES")}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, whiteSpace: "nowrap" }}>
                                {statusLabel}
                              </span>
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                              {w.status === "pending" && (
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button
                                    onClick={() => handleWithdrawal(w.id, "paid")}
                                    disabled={withdrawalLoading === w.id}
                                    style={btn("#16a34a", { padding: "0.25rem 0.6rem", fontSize: "0.7rem", opacity: withdrawalLoading === w.id ? 0.6 : 1 })}
                                  >
                                    {withdrawalLoading === w.id ? "..." : "Marcar pagado"}
                                  </button>
                                  <button
                                    onClick={() => handleWithdrawal(w.id, "rejected")}
                                    disabled={withdrawalLoading === w.id}
                                    style={btn("#dc2626", { padding: "0.25rem 0.6rem", fontSize: "0.7rem", opacity: withdrawalLoading === w.id ? 0.6 : 1 })}
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              )}
                              {w.status === "paid" && w.paidAt && (
                                <span style={{ fontSize: "0.7rem", color: "#4ade80" }}>
                                  {new Date(w.paidAt).toLocaleDateString("es-ES")}
                                </span>
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
          );
        })()}

      </div>
    </div>
  );
}
