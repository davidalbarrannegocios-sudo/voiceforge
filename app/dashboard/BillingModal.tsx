"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ChevronLeft, Download, ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import { useLang } from "./LanguageContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CardBrandLogo({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  const wrapper: React.CSSProperties = {
    background: "#fff", borderRadius: "4px",
    padding: "4px 8px", height: "32px", width: "56px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  if (b === "visa") return (
    <div style={wrapper}>
      <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/visa.svg" alt="Visa" style={{ height: "20px", width: "auto", filter: "invert(13%) sepia(80%) saturate(1500%) hue-rotate(210deg)" }} />
    </div>
  );
  if (b === "mastercard") return (
    <div style={wrapper}>
      <svg viewBox="0 0 38 24" style={{ height: "24px", width: "auto" }}>
        <circle cx="15" cy="12" r="11" fill="#EB001B" />
        <circle cx="23" cy="12" r="11" fill="#F79E1B" />
        <path d="M19 4.5a11 11 0 0 1 0 15A11 11 0 0 1 19 4.5z" fill="#FF5F00" />
      </svg>
    </div>
  );
  if (b === "amex") return (
    <div style={wrapper}>
      <svg viewBox="0 0 48 16" style={{ height: "16px", width: "auto" }}>
        <rect width="48" height="16" rx="2" fill="#2E77BC" />
        <text x="4" y="12" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif" letterSpacing="0.5">AMEX</text>
      </svg>
    </div>
  );
  return (
    <div style={{ ...wrapper, background: "rgba(255,255,255,0.08)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    </div>
  );
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  date: number;
  amount: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface Subscription {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  paymentMethod: { brand: string; last4: string } | null;
}

type Tab = "suscripcion" | "metodos" | "facturas";

function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { t } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/setup-intent", { method: "POST" });
      if (!res.ok) throw new Error(t.billing.errorPrepare);
      const { clientSecret } = await res.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Elemento de tarjeta no encontrado");

      const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        setError(stripeError.message ?? "Error al guardar la tarjeta");
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.billing.errorUnknown);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: "#111111", border: "1px solid #2a2a2a", borderRadius: "10px",
        padding: "14px 16px", marginBottom: "14px",
      }}>
        <CardElement
          options={{
            style: {
              base: {
                color: "#ffffff", fontSize: "14px", fontFamily: "system-ui, sans-serif",
                "::placeholder": { color: "#555555" },
              },
              invalid: { color: "#ef4444" },
            },
          }}
        />
      </div>
      {error && (
        <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "12px" }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="submit"
          disabled={saving || !stripe}
          style={{
            padding: "9px 18px", borderRadius: "8px", border: "none",
            background: "#ffffff", color: "#000000",
            fontSize: "13px", fontWeight: 700,
            cursor: saving || !stripe ? "not-allowed" : "pointer",
            opacity: saving || !stripe ? 0.7 : 1,
          }}
        >
          {saving ? t.billing.savingCard : t.billing.saveCard}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "9px 16px", borderRadius: "8px",
            border: "1px solid #222222", background: "transparent",
            color: "#9ca3af", fontSize: "13px", cursor: "pointer",
          }}
        >
          {t.billing.back}
        </button>
      </div>
    </form>
  );
}

export function ManageBillingPanel({ plan, onBack }: { plan: string; onBack: () => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("suscripcion");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadData() {
    const [inv, sub, pms] = await Promise.all([
      fetch("/api/billing/invoices").then((r) => r.json()),
      fetch("/api/billing/subscription").then((r) => r.json()),
      fetch("/api/billing/payment-methods").then((r) => r.json()),
    ]);
    setInvoices(inv.invoices ?? []);
    setSubscription(sub.subscription ?? null);
    setPaymentMethods(pms.paymentMethods ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCancel() {
    if (!cancelReason) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.cancelAtPeriodEnd) {
        setSubscription((s) => s ? { ...s, cancelAtPeriodEnd: true, currentPeriodEnd: data.currentPeriodEnd } : s);
        setShowCancelForm(false);
        setCancelReason("");
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivate() {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      const data = await res.json();
      if (!data.cancelAtPeriodEnd) {
        setSubscription((s) => s ? { ...s, cancelAtPeriodEnd: false } : s);
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleSetDefault(pmId: string) {
    setActionLoading(pmId);
    try {
      await fetch("/api/billing/set-default-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      setPaymentMethods((prev) => prev.map((pm) => ({ ...pm, isDefault: pm.id === pmId })));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeletePM(pmId: string) {
    setActionLoading(pmId);
    try {
      await fetch(`/api/billing/payment-methods/${pmId}`, { method: "DELETE" });
      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== pmId));
    } finally {
      setActionLoading(null);
    }
  }

  const periodEndLabel = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

  const tabs: { key: Tab; label: string }[] = [
    { key: "suscripcion", label: t.billing.tabSubscription },
    { key: "metodos",     label: t.billing.tabPaymentMethods },
    { key: "facturas",    label: t.billing.tabInvoices },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", color: "#6b7280",
          cursor: "pointer", fontSize: "13px", fontWeight: 600,
          padding: "0", marginBottom: "18px",
        }}
      >
        <ChevronLeft size={15} />
        {t.billing.backBtn}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: 0 }}>
          {t.billing.manageTitle}
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", marginBottom: "28px" }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 18px", border: "none", background: "none",
              cursor: "pointer", fontSize: "13px", fontWeight: 600,
              color: tab === key ? "#ffffff" : "#555555",
              borderBottom: tab === key ? "2px solid #ffffff" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "#555555", padding: "40px 0", textAlign: "center" }}>{t.billing.loadingLabel}</div>
      ) : (
        <>
          {/* ── Suscripción ── */}
          {tab === "suscripcion" && (
            <div style={{ width: "100%" }}>
              <div style={{
                background: "#0a0a0a", border: "1px solid #1a1a1a",
                borderRadius: "14px", padding: "20px 24px", marginBottom: "20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: periodEndLabel ? "16px" : "0" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "#555555", marginBottom: "4px" }}>{t.billing.currentPlan}</p>
                    <p style={{ fontSize: "20px", fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>
                      {plan}
                    </p>
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px",
                    background: subscription?.cancelAtPeriodEnd
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(34,197,94,0.12)",
                    color: subscription?.cancelAtPeriodEnd ? "#ef4444" : "#22c55e",
                    marginTop: "2px",
                  }}>
                    {subscription?.cancelAtPeriodEnd ? t.billing.soonToCancel : t.billing.activeStatus}
                  </span>
                </div>
                {periodEndLabel && (
                  <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "14px" }}>
                    <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                      {subscription?.cancelAtPeriodEnd ? t.billing.accessUntil : t.billing.nextRenewal}
                      {": "}
                      <strong style={{ color: "#d1d5db" }}>{periodEndLabel}</strong>
                    </p>
                  </div>
                )}
              </div>

              {subscription?.cancelAtPeriodEnd ? (
                <div style={{
                  background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)",
                  borderRadius: "12px", padding: "18px 20px",
                }}>
                  <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "14px", lineHeight: 1.6 }}>
                    {t.billing.cancelSoonMsg.replace("{date}", periodEndLabel)}
                  </p>
                  <button
                    onClick={handleReactivate}
                    disabled={cancelling}
                    style={{
                      padding: "9px 20px", borderRadius: "8px",
                      border: "1px solid rgba(34,197,94,0.4)",
                      background: "rgba(34,197,94,0.08)", color: "#22c55e",
                      fontSize: "13px", fontWeight: 700,
                      cursor: cancelling ? "not-allowed" : "pointer",
                      opacity: cancelling ? 0.7 : 1,
                    }}
                  >
                    {cancelling ? t.billing.processing : t.billing.reactivateSub}
                  </button>
                </div>
              ) : !showCancelForm ? (
                <button
                  onClick={() => setShowCancelForm(true)}
                  style={{
                    background: "none", border: "none", color: "#555555",
                    fontSize: "12px", cursor: "pointer", padding: "0",
                    textDecoration: "underline", textUnderlineOffset: "3px",
                  }}
                >
                  {t.billing.cancelSub}
                </button>
              ) : (
                <div style={{
                  background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: "12px", padding: "20px",
                }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#fca5a5", marginBottom: "4px" }}>
                    {t.billing.cancelWhyTitle}
                  </p>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.5 }}>
                    {t.billing.cancelAccessUntil.replace("{date}", periodEndLabel)}
                  </p>
                  <CustomSelect
                    value={cancelReason}
                    onChange={setCancelReason}
                    placeholder={t.billing.cancelReasonSelect}
                    style={{ marginBottom: "14px" }}
                    options={[
                      { value: "price",     label: t.billing.cancelReasonPrice },
                      { value: "features",  label: t.billing.cancelReasonFeatures },
                      { value: "usage",     label: t.billing.cancelReasonUsage },
                      { value: "switching", label: t.billing.cancelReasonSwitching },
                      { value: "other",     label: t.billing.cancelReasonOther },
                    ]}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleCancel}
                      disabled={!cancelReason || cancelling}
                      style={{
                        padding: "9px 18px", borderRadius: "8px", border: "none",
                        background: cancelReason ? "#ef4444" : "#1a1a1a",
                        color: cancelReason ? "#fff" : "#555555",
                        fontSize: "13px", fontWeight: 700,
                        cursor: !cancelReason || cancelling ? "not-allowed" : "pointer",
                        opacity: cancelling ? 0.7 : 1,
                        transition: "background 0.2s, color 0.2s",
                      }}
                    >
                      {cancelling ? t.billing.processing : t.billing.confirmCancel}
                    </button>
                    <button
                      onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                      style={{
                        padding: "9px 16px", borderRadius: "8px",
                        border: "1px solid #222222", background: "transparent",
                        color: "#9ca3af", fontSize: "13px", cursor: "pointer",
                      }}
                    >
                      {t.billing.back}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Métodos de pago ── */}
          {tab === "metodos" && (
            <div style={{ width: "100%" }}>
              {paymentMethods.length === 0 && !showAddCard && (
                <p style={{ color: "#555555", fontSize: "13px", marginBottom: "20px" }}>
                  {t.billing.noPaymentMethods}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    style={{
                      background: "#0a0a0a",
                      border: `1px solid ${pm.isDefault ? "rgba(255,255,255,0.14)" : "#1a1a1a"}`,
                      borderRadius: "12px", padding: "14px 18px",
                      display: "flex", alignItems: "center", gap: "14px",
                    }}
                  >
                    <CardBrandLogo brand={pm.brand} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>
                        {pm.brand} ···· {pm.last4}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#555555" }}>
                        {t.billing.cardExpires} {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                        {pm.isDefault && (
                          <span style={{ marginLeft: "8px", color: "#22c55e", fontWeight: 600 }}>
                            · {t.billing.cardDefault}
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {!pm.isDefault && (
                        <button
                          onClick={() => handleSetDefault(pm.id)}
                          disabled={actionLoading === pm.id}
                          title={t.billing.setDefault}
                          style={{
                            padding: "6px 8px", borderRadius: "6px",
                            border: "1px solid #222222", background: "transparent",
                            color: "#9ca3af", cursor: "pointer",
                            opacity: actionLoading === pm.id ? 0.4 : 1,
                            display: "flex", alignItems: "center",
                          }}
                        >
                          <Star size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePM(pm.id)}
                        disabled={actionLoading === pm.id}
                        title={t.billing.deleteCard}
                        style={{
                          padding: "6px 8px", borderRadius: "6px",
                          border: "1px solid rgba(239,68,68,0.2)", background: "transparent",
                          color: "#ef4444", cursor: "pointer",
                          opacity: actionLoading === pm.id ? 0.4 : 1,
                          display: "flex", alignItems: "center",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {!showAddCard ? (
                <button
                  onClick={() => setShowAddCard(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "7px",
                    padding: "9px 16px", borderRadius: "8px",
                    border: "1px solid #222222", background: "transparent",
                    color: "#d1d5db", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                  {t.billing.addCard}
                </button>
              ) : (
                <div style={{
                  background: "#0a0a0a", border: "1px solid #1a1a1a",
                  borderRadius: "12px", padding: "20px",
                }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
                    {t.billing.newCard}
                  </p>
                  <Elements stripe={stripePromise}>
                    <AddCardForm
                      onSuccess={() => {
                        setShowAddCard(false);
                        setLoading(true);
                        loadData();
                      }}
                      onCancel={() => setShowAddCard(false)}
                    />
                  </Elements>
                </div>
              )}
            </div>
          )}

          {/* ── Facturas ── */}
          {tab === "facturas" && (
            <div>
              {invoices.length === 0 ? (
                <p style={{ color: "#555555", fontSize: "13px", textAlign: "center", padding: "32px 0" }}>
                  {t.billing.noInvoices}
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "380px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {[t.billing.invDate, t.billing.invAmount, t.billing.invStatus, ""].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left", padding: "6px 10px 10px",
                              fontSize: "11px", fontWeight: 600, color: "#444444",
                              textTransform: "uppercase", letterSpacing: "0.06em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: "1px solid #111111" }}>
                          <td style={{ padding: "12px 10px", fontSize: "13px", color: "#d1d5db" }}>
                            {new Date(inv.date).toLocaleDateString("es-ES", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </td>
                          <td style={{ padding: "12px 10px", fontSize: "13px", color: "#fff", fontWeight: 600 }}>
                            {inv.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}{" "}
                            {inv.currency.toUpperCase()}
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <span style={{
                              fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px",
                              background: inv.status === "paid" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                              color: inv.status === "paid" ? "#22c55e" : "#ef4444",
                            }}>
                              {inv.status === "paid" ? t.billing.invPaid : inv.status ?? "—"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                              {inv.pdfUrl && (
                                <a
                                  href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ color: "#6b7280", display: "flex", alignItems: "center" }}
                                  title="Descargar PDF"
                                >
                                  <Download size={14} />
                                </a>
                              )}
                              {inv.hostedUrl && (
                                <a
                                  href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ color: "#6b7280", display: "flex", alignItems: "center" }}
                                  title="Ver factura"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
