"use client";

import { useState, useEffect, useRef } from "react";
import { X, FileText, Sparkles, Send, Loader, Check, ChevronRight, Zap } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ELITE_TEXT_PLANS, type EliteTextPlanKey, getTokenPercentage } from "@/lib/elite-text";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#8b5cf6",
    colorBackground: "#0f0f14",
    colorText: "#e5e7eb",
    colorDanger: "#ef4444",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "10px",
  },
};

/* ─── Types ─────────────────────────────────────────────────── */
interface EliteTextStatus {
  hasPlan: boolean;
  plan?: string;
  tokensUsed?: number;
  tokensTotal?: number;
  percentage?: number;
  status?: string;
  renewsAt?: string | null;
}

/* ─── Payment form (embedded in panel) ──────────────────────── */
function PaymentForm({
  customerId,
  planKey,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  planKey: EliteTextPlanKey;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Error al procesar el pago");
      setSubmitting(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;

    if (!paymentMethodId) {
      setError("No se pudo obtener el método de pago");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/elite-text/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, planKey, paymentMethodId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al activar el plan");
      setSubmitting(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p style={{ fontSize: "12px", color: "#ef4444", margin: 0 }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: "10px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent", color: "rgba(255,255,255,0.5)",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          style={{
            flex: 2, padding: "10px", borderRadius: "8px", border: "none",
            background: submitting ? "rgba(139,92,246,0.6)" : "#8b5cf6",
            color: "#fff", fontSize: "13px", fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}
        >
          {submitting ? (
            <><Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Activando...</>
          ) : (
            <>Suscribirse · ${ELITE_TEXT_PLANS[planKey].priceMonthly}/mes</>
          )}
        </button>
      </div>
    </form>
  );
}

/* ─── Upsell plan card ───────────────────────────────────────── */
function PlanCard({
  planKey,
  onSelect,
}: {
  planKey: EliteTextPlanKey;
  onSelect: (key: EliteTextPlanKey) => void;
}) {
  const plan = ELITE_TEXT_PLANS[planKey];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "14px",
        padding: "18px",
        background: hovered ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)"}`,
        transition: "all 0.15s",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{plan.name}</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
            {plan.tokens.toLocaleString("es-ES")} tokens/mes
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8b5cf6" }}>${plan.priceMonthly}</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>/mes</span>
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {[
          `~${plan.scripts20min} guiones de 20 min`,
          `~${plan.minutes.toLocaleString("es-ES")} min de audio`,
          "Claude Sonnet · máxima calidad",
          "Envío directo a narración TTS",
        ].map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
            <Check size={11} style={{ color: "#8b5cf6", flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(planKey)}
        style={{
          width: "100%", padding: "9px", borderRadius: "8px", border: "none",
          background: "#8b5cf6", color: "#fff",
          fontSize: "13px", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#7c3aed"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#8b5cf6"; }}
      >
        Activar {plan.name} <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ─── Main panel ─────────────────────────────────────────────── */
export function EliteTextPanel({
  open,
  onClose,
  onSendToNarrate,
}: {
  open: boolean;
  onClose: () => void;
  onSendToNarrate: (text: string) => void;
}) {
  const [status, setStatus] = useState<EliteTextStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Subscribe flow
  const [subscribingPlan, setSubscribingPlan] = useState<EliteTextPlanKey | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  // Generate flow
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [tokensUsedThisGen, setTokensUsedThisGen] = useState<number | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);

  function fetchStatus() {
    setLoadingStatus(true);
    fetch("/api/elite-text/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus({ hasPlan: false }))
      .finally(() => setLoadingStatus(false));
  }

  useEffect(() => {
    if (open) fetchStatus();
  }, [open]);

  useEffect(() => {
    if (outputRef.current && generatedText) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [generatedText]);

  async function handleSubscribe(planKey: EliteTextPlanKey) {
    setSubscribeLoading(true);
    setSubscribeError(null);
    try {
      const res = await fetch("/api/elite-text/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar suscripción");
      setClientSecret(data.clientSecret);
      setCustomerId(data.customerId);
      setSubscribingPlan(planKey);
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubscribeLoading(false);
    }
  }

  function handlePaymentSuccess() {
    setSubscribeSuccess(true);
    setClientSecret(null);
    setSubscribingPlan(null);
    setTimeout(() => {
      setSubscribeSuccess(false);
      fetchStatus();
    }, 2000);
  }

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGeneratedText("");
    setGenerateError(null);
    setTokensUsedThisGen(null);

    try {
      const res = await fetch("/api/elite-text/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        setGenerateError(data.error ?? "Error al generar");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              setGeneratedText((prev) => prev + event.text);
            } else if (event.type === "done") {
              setTokensUsedThisGen(event.tokensUsed);
              fetchStatus();
            } else if (event.type === "error") {
              setGenerateError(event.error);
            }
          } catch {}
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleSendToNarrate() {
    if (!generatedText.trim()) return;
    onSendToNarrate(generatedText);
    onClose();
  }

  const ACCENT = "#8b5cf6";

  return (
    <div
      style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "420px",
        zIndex: 60, display: "flex", flexDirection: "column",
        background: "#09090f",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.7)",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: "56px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/elitelabs.png" alt="Elite Labs" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Elite Text</span>
          <span style={{
            fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px",
            background: "rgba(139,92,246,0.18)", color: ACCENT, border: "1px solid rgba(139,92,246,0.3)",
          }}>
            IA
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px", borderRadius: "6px", display: "flex" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loadingStatus ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "40px" }}>
            <Loader size={20} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
          </div>
        ) : subscribeSuccess ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "60px", gap: "12px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: `1px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={22} style={{ color: ACCENT }} />
            </div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>¡Plan activado!</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0, textAlign: "center" }}>Tu plan Elite Text ya está activo.</p>
          </div>
        ) : clientSecret && subscribingPlan ? (
          /* Embedded payment form */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>
                {ELITE_TEXT_PLANS[subscribingPlan].name} · ${ELITE_TEXT_PLANS[subscribingPlan].priceMonthly}/mes
              </p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                {ELITE_TEXT_PLANS[subscribingPlan].tokens.toLocaleString("es-ES")} tokens mensuales
              </p>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}>
              <PaymentForm
                customerId={customerId!}
                planKey={subscribingPlan}
                onSuccess={handlePaymentSuccess}
                onCancel={() => { setClientSecret(null); setSubscribingPlan(null); }}
              />
            </Elements>
          </div>
        ) : !status?.hasPlan ? (
          /* Upsell view */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ marginBottom: "4px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Genera guiones con IA</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
                Crea guiones de podcast, YouTube o vídeo con Claude Sonnet y envíalos directamente a narración TTS.
              </p>
            </div>

            {subscribeError && (
              <p style={{ fontSize: "12px", color: "#ef4444", margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: "8px" }}>
                {subscribeError}
              </p>
            )}

            {(["text_pro", "text_elite"] as EliteTextPlanKey[]).map((key) => (
              <PlanCard
                key={key}
                planKey={key}
                onSelect={subscribeLoading ? () => {} : handleSubscribe}
              />
            ))}

            {subscribeLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px" }}>
                <Loader size={16} style={{ color: ACCENT, animation: "spin 1s linear infinite" }} />
              </div>
            )}
          </div>
        ) : (
          /* Generate view */
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Usage bar */}
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={12} style={{ color: ACCENT }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                    {status.plan === "text_elite" ? "Text Elite" : "Text Pro"}
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                  {status.tokensUsed?.toLocaleString("es-ES")} / {status.tokensTotal?.toLocaleString("es-ES")} tokens
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${status.percentage ?? 0}%`,
                  background: (status.percentage ?? 0) > 85 ? "#ef4444" : (status.percentage ?? 0) > 60 ? "#f59e0b" : ACCENT,
                  transition: "width 0.4s ease",
                }} />
              </div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", margin: "6px 0 0", textAlign: "right" }}>
                {status.percentage}% usado
              </p>
            </div>

            {/* Prompt textarea */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                Describe tu guion
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: Crea un guion de 5 minutos sobre los beneficios de la meditación diaria, en tono cercano y motivador..."
                rows={5}
                disabled={generating}
                style={{
                  width: "100%", borderRadius: "10px", resize: "vertical",
                  padding: "10px 12px", fontSize: "13px", lineHeight: 1.5,
                  background: "rgba(255,255,255,0.04)", color: "#e5e7eb",
                  border: "1px solid rgba(255,255,255,0.09)",
                  outline: "none", fontFamily: "inherit",
                  opacity: generating ? 0.6 : 1,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              style={{
                width: "100%", padding: "11px", borderRadius: "10px", border: "none",
                background: (!prompt.trim() || generating) ? "rgba(139,92,246,0.35)" : ACCENT,
                color: "#fff", fontSize: "13px", fontWeight: 700,
                cursor: (!prompt.trim() || generating) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                transition: "background 0.15s",
              }}
            >
              {generating ? (
                <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Generando guion...</>
              ) : (
                <><Sparkles size={14} /> Generar guion</>
              )}
            </button>

            {/* Generate error */}
            {generateError && (
              <p style={{ fontSize: "12px", color: "#ef4444", margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: "8px" }}>
                {generateError}
              </p>
            )}

            {/* Generated output */}
            {generatedText && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Guion generado
                  </span>
                  {tokensUsedThisGen !== null && (
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                      {tokensUsedThisGen.toLocaleString("es-ES")} tokens
                    </span>
                  )}
                </div>
                <div
                  ref={outputRef}
                  style={{
                    maxHeight: "280px", overflowY: "auto",
                    padding: "12px 14px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.65,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}
                >
                  {generatedText}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { setGeneratedText(""); setTokensUsedThisGen(null); }}
                    style={{
                      flex: 1, padding: "9px", borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent", color: "rgba(255,255,255,0.5)",
                      fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleSendToNarrate}
                    style={{
                      flex: 2, padding: "9px", borderRadius: "8px", border: "none",
                      background: "#ffffff", color: "#000",
                      fontSize: "12px", fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                  >
                    <Send size={12} /> Enviar a narrar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
