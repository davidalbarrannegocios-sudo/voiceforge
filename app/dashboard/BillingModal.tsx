"use client";

import { useEffect, useRef, useState } from "react";
import { X, FileText, CreditCard, AlertTriangle, ExternalLink, Download } from "lucide-react";
import Link from "next/link";

function CardBrandLogo({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  const wrapper: React.CSSProperties = {
    background: "#fff", borderRadius: "4px",
    padding: "4px 8px", height: "32px", width: "56px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  if (b === "visa") return (
    <div style={wrapper}>
      <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" style={{ height: "16px", width: "auto", objectFit: "contain" }} />
    </div>
  );
  if (b === "mastercard") return (
    <div style={wrapper}>
      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
    </div>
  );
  if (b === "amex") return (
    <div style={wrapper}>
      <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
    </div>
  );
  return (
    <div style={{ ...wrapper, background: "rgba(255,255,255,0.1)" }}>
      <CreditCard size={20} color="#9ca3af" />
    </div>
  );
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

type Tab = "invoices" | "payment" | "cancel";

export function BillingModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelInput, setCancelInput] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/billing/invoices").then((r) => r.json()),
      fetch("/api/billing/subscription").then((r) => r.json()),
    ]).then(([inv, sub]) => {
      setInvoices(inv.invoices ?? []);
      setSubscription(sub.subscription ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleCancel() {
    if (cancelInput !== "CANCELAR") return;
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
        setCancelDone(true);
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
        setCancelDone(false);
        setCancelInput("");
      }
    } finally {
      setCancelling(false);
    }
  }

  const periodEndLabel = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

  const tabs: { key: Tab; label: string; Icon: typeof FileText }[] = [
    { key: "invoices", label: "Facturas", Icon: FileText },
    { key: "payment", label: "Método de pago", Icon: CreditCard },
    { key: "cancel", label: "Cancelar", Icon: AlertTriangle },
  ];

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div style={{
        background: "#0d0d17", border: "1px solid #1e1e2e", borderRadius: "16px",
        width: "100%", maxWidth: "540px", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1px solid #1e1e2e", flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
            Gestionar suscripción
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "12px 24px 0", gap: "4px", borderBottom: "1px solid #1e1e2e", flexShrink: 0 }}>
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "8px 8px 0 0",
                border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                background: tab === key ? "#1a1a2e" : "transparent",
                color: tab === key ? "#fff" : "#6b7280",
                borderBottom: tab === key ? "2px solid #3b82f6" : "2px solid transparent",
                transition: "color 0.15s ease, background 0.15s ease",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>Cargando...</div>
          ) : (
            <>
              {/* ── Invoices tab ── */}
              {tab === "invoices" && (
                <div>
                  {invoices.length === 0 ? (
                    <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
                      No hay facturas disponibles.
                    </p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                          {["Fecha", "Importe", "Estado", ""].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "6px 8px 10px", fontSize: "11px", fontWeight: 600, color: "#4a4a65", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: "1px solid #13131f" }}>
                            <td style={{ padding: "12px 8px", fontSize: "13px", color: "#d1d5db" }}>
                              {new Date(inv.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px 8px", fontSize: "13px", color: "#fff", fontWeight: 600 }}>
                              {inv.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {inv.currency.toUpperCase()}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <span style={{
                                fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px",
                                background: inv.status === "paid" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                                color: inv.status === "paid" ? "#22c55e" : "#ef4444",
                              }}>
                                {inv.status === "paid" ? "Pagada" : inv.status ?? "—"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 8px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                {inv.pdfUrl && (
                                  <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ color: "#6b7280", display: "flex", alignItems: "center" }}
                                    title="Descargar PDF">
                                    <Download size={14} />
                                  </a>
                                )}
                                {inv.hostedUrl && (
                                  <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ color: "#6b7280", display: "flex", alignItems: "center" }}
                                    title="Ver factura">
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── Payment method tab ── */}
              {tab === "payment" && (
                <div>
                  {subscription?.paymentMethod ? (
                    <div style={{
                      background: "#13131f", border: "1px solid #1e1e2e", borderRadius: "12px",
                      padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px",
                    }}>
                      <CardBrandLogo brand={subscription.paymentMethod.brand.toLowerCase()} />
                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>
                          {subscription.paymentMethod.brand} ···· {subscription.paymentMethod.last4}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6b7280" }}>
                          Método de pago predeterminado
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
                      No hay método de pago registrado.
                    </p>
                  )}
                  <p style={{ fontSize: "12px", color: "#4a4a65", marginTop: "16px", lineHeight: 1.6 }}>
                    Para actualizar tu método de pago, contacta con{" "}
                    <Link href="/dashboard/mi-cuenta" style={{ color: "#60a5fa" }} onClick={onClose}>soporte</Link>
                    {" "}o gestiona tu suscripción directamente desde el{" "}
                    <a
                      href="#"
                      style={{ color: "#60a5fa", textDecoration: "none", cursor: "pointer" }}
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch("/api/billing/portal", { method: "POST" });
                          if (!res.ok) {
                            const err = await res.text();
                            console.error("[portal] error:", err);
                            alert("Error al abrir el portal: " + err);
                            return;
                          }
                          const { url } = await res.json();
                          window.open(url, "_blank");
                        } catch (err) {
                          console.error("[portal] fetch error:", err);
                        }
                      }}
                    >
                      Portal de Stripe
                    </a>.
                  </p>
                </div>
              )}

              {/* ── Cancel tab ── */}
              {tab === "cancel" && (
                <div>
                  {subscription?.cancelAtPeriodEnd ? (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "50%",
                        background: "rgba(34,197,94,0.1)", display: "flex",
                        alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                      }}>
                        <AlertTriangle size={24} color="#22c55e" />
                      </div>
                      <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                        Cancelación programada
                      </h3>
                      <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#9ca3af", lineHeight: 1.6 }}>
                        Tu suscripción se cancelará el <strong style={{ color: "#fff" }}>{periodEndLabel}</strong>.<br />
                        Hasta entonces seguirás teniendo acceso completo.
                      </p>
                      <button
                        onClick={handleReactivate}
                        disabled={cancelling}
                        style={{
                          padding: "10px 24px", borderRadius: "8px", border: "1px solid #22c55e",
                          background: "rgba(34,197,94,0.1)", color: "#22c55e",
                          fontSize: "13px", fontWeight: 700, cursor: "pointer",
                          opacity: cancelling ? 0.6 : 1,
                        }}
                      >
                        {cancelling ? "Procesando..." : "Reactivar suscripción"}
                      </button>
                    </div>
                  ) : cancelDone ? (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "50%",
                        background: "rgba(34,197,94,0.1)", display: "flex",
                        alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                      }}>
                        <AlertTriangle size={24} color="#22c55e" />
                      </div>
                      <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                        Cancelación programada
                      </h3>
                      <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#9ca3af", lineHeight: 1.6 }}>
                        Tu suscripción se cancelará el <strong style={{ color: "#fff" }}>{periodEndLabel}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: "12px", padding: "16px 20px", marginBottom: "24px",
                      }}>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                          <div>
                            <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 700, color: "#fca5a5" }}>
                              Perderás acceso a los beneficios del plan
                            </p>
                            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#9ca3af", lineHeight: 1.8 }}>
                              <li>Tus caracteres mensuales no se renovarán</li>
                              <li>Los créditos extra permanecerán disponibles</li>
                              <li>Acceso hasta <strong style={{ color: "#d1d5db" }}>{periodEndLabel}</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                        Escribe <strong style={{ color: "#d1d5db" }}>CANCELAR</strong> para confirmar:
                      </p>
                      <input
                        type="text"
                        value={cancelInput}
                        onChange={(e) => setCancelInput(e.target.value)}
                        placeholder="CANCELAR"
                        style={{
                          width: "100%", boxSizing: "border-box",
                          padding: "10px 14px", borderRadius: "8px",
                          border: "1px solid #2a2a3e", background: "#13131f",
                          color: "#fff", fontSize: "13px", marginBottom: "16px",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={handleCancel}
                        disabled={cancelInput !== "CANCELAR" || cancelling}
                        style={{
                          width: "100%", padding: "11px", borderRadius: "8px",
                          border: "none", cursor: cancelInput !== "CANCELAR" || cancelling ? "not-allowed" : "pointer",
                          background: cancelInput === "CANCELAR" ? "#ef4444" : "#1a1a2e",
                          color: cancelInput === "CANCELAR" ? "#fff" : "#4a4a65",
                          fontSize: "13px", fontWeight: 700,
                          transition: "background 0.2s ease, color 0.2s ease",
                          opacity: cancelling ? 0.7 : 1,
                        }}
                      >
                        {cancelling ? "Procesando..." : "Cancelar suscripción"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
