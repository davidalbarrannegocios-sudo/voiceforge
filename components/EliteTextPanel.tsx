"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Loader, Check, ChevronRight, ArrowUp } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ELITE_TEXT_PLANS, type EliteTextPlanKey } from "@/lib/elite-text";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#8b5cf6",
    colorBackground: "#0d0d0d",
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
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  done: boolean;
  tokensUsed?: number;
}

/* ─── Payment form ───────────────────────────────────────────── */
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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p style={{ fontSize: "12px", color: "#ef4444", margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: "8px" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: "10px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.45)",
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
            background: submitting ? "rgba(139,92,246,0.55)" : "#8b5cf6",
            color: "#fff", fontSize: "13px", fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}
        >
          {submitting
            ? <><Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Activando...</>
            : <>Suscribirse · ${ELITE_TEXT_PLANS[planKey].priceMonthly}/mes</>}
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
  onSelect: (k: EliteTextPlanKey) => void;
}) {
  const plan = ELITE_TEXT_PLANS[planKey];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "14px", padding: "18px",
        background: hovered ? "rgba(139,92,246,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{plan.name}</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.38)", margin: 0 }}>
            {plan.tokens.toLocaleString("es-ES")} tokens/mes
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#8b5cf6", lineHeight: 1 }}>${plan.priceMonthly}</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", display: "block" }}>/mes</span>
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
        {[
          `~${plan.scripts20min} guiones de 20 min`,
          `~${plan.minutes.toLocaleString("es-ES")} min de audio`,
          "Claude Sonnet · máxima calidad",
          "Envío directo a narración TTS",
        ].map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
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
        Activar {plan.name} <ChevronRight size={13} />
      </button>
    </div>
  );
}

/* ─── Assistant avatar ───────────────────────────────────────── */
function AiAvatar() {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: "7px",
      background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: 2, overflow: "hidden",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/elitelabs.png" alt="Elite Labs" style={{ width: 16, height: 16, objectFit: "contain" }} />
    </div>
  );
}

/* ─── Streaming cursor ───────────────────────────────────────── */
function StreamCursor() {
  return (
    <span style={{
      display: "inline-block", width: "2px", height: "14px",
      background: "#8b5cf6", borderRadius: "1px", marginLeft: "2px",
      verticalAlign: "text-bottom",
      animation: "eliteCursor 0.9s ease-in-out infinite",
    }}>
      <style>{`
        @keyframes eliteCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

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
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

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

  async function handleSend() {
    const text = input.trim();
    if (!text || generating) return;

    // Build prompt with conversation context
    const historyContext = messages
      .filter((m) => m.done)
      .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
      .join("\n\n");
    const prompt = historyContext
      ? `${historyContext}\n\nUsuario: ${text}`
      : text;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      done: true,
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      done: false,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setGenerating(true);

    try {
      const res = await fetch("/api/elite-text/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.error ?? "Error al generar el guion", done: true }
              : m
          )
        );
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let tokensUsed: number | undefined;

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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.text } : m
                )
              );
            } else if (event.type === "done") {
              tokensUsed = event.tokensUsed;
              fetchStatus();
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: event.error, done: true } : m
                )
              );
            }
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, done: true, tokensUsed } : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: msg, done: true } : m
        )
      );
    } finally {
      setGenerating(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const pct = status?.percentage ?? 0;
  const barColor = pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#8b5cf6";

  return (
    <div
      style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "400px",
        zIndex: 60, display: "flex", flexDirection: "column",
        background: "#000000",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.8)",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "#000",
      }}>
        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 14px", height: "52px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/elitelabs.png" alt="Elite Labs" style={{ width: 20, height: 20, borderRadius: 5, objectFit: "contain" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Elite Text</span>
            {status?.hasPlan && (
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "5px",
                background: "rgba(139,92,246,0.15)", color: "#8b5cf6",
                border: "1px solid rgba(139,92,246,0.25)",
              }}>
                {status.plan === "text_elite" ? "Elite" : "Pro"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", borderRadius: "6px", display: "flex", lineHeight: 1 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Token progress row (only when has plan) */}
        {status?.hasPlan && (
          <div style={{ padding: "0 14px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                {status.tokensUsed?.toLocaleString("es-ES")} / {status.tokensTotal?.toLocaleString("es-ES")} tokens
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{pct}%</span>
            </div>
            <div style={{ height: "3px", borderRadius: "999px", background: "rgba(139,92,246,0.15)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "999px",
                width: `${Math.max(pct, 2)}%`,
                background: barColor,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      {loadingStatus ? (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader size={20} style={{ color: "#8b5cf6", animation: "spin 1s linear infinite" }} />
        </div>
      ) : subscribeSuccess ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1px solid #8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} style={{ color: "#8b5cf6" }} />
          </div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>¡Plan activado!</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0, textAlign: "center" }}>Tu plan Elite Text ya está activo.</p>
        </div>
      ) : clientSecret && subscribingPlan ? (
        /* Payment form */
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
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
        /* Upsell */
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ marginBottom: "4px" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Genera guiones con IA</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.55 }}>
              Crea guiones de podcast, YouTube o vídeo con Claude Sonnet y envíalos directamente a narración TTS.
            </p>
          </div>

          {subscribeError && (
            <p style={{ fontSize: "12px", color: "#ef4444", margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: "8px" }}>
              {subscribeError}
            </p>
          )}

          {(["text_pro", "text_elite"] as EliteTextPlanKey[]).map((key) => (
            <PlanCard key={key} planKey={key} onSelect={subscribeLoading ? () => {} : handleSubscribe} />
          ))}

          {subscribeLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px" }}>
              <Loader size={16} style={{ color: "#8b5cf6", animation: "spin 1s linear infinite" }} />
            </div>
          )}
        </div>
      ) : (
        /* ── Chat view ─────────────────────────────────────────── */
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", opacity: 0.45, paddingTop: "40px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/elitelabs.png" alt="" style={{ width: 32, height: 32, borderRadius: 8, opacity: 0.6 }} />
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                  Describe el guion que necesitas<br />y lo generaré con IA
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  /* User bubble — right */
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      maxWidth: "82%",
                      padding: "10px 14px",
                      borderRadius: "16px 16px 4px 16px",
                      background: "rgba(255,255,255,0.08)",
                      fontSize: "13px", color: "rgba(255,255,255,0.9)",
                      lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant — left */
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <AiAvatar />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "13px", color: "rgba(255,255,255,0.85)",
                        lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        paddingTop: "2px",
                      }}>
                        {msg.content || (!msg.done && (
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>Generando...</span>
                        ))}
                        {!msg.done && msg.content && <StreamCursor />}
                      </div>

                      {/* Token count + send-to-narrate — shown when done */}
                      {msg.done && msg.content && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                          {msg.tokensUsed !== undefined && (
                            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                              {msg.tokensUsed.toLocaleString("es-ES")} tokens
                            </span>
                          )}
                          <button
                            onClick={() => { onSendToNarrate(msg.content); onClose(); }}
                            style={{
                              display: "flex", alignItems: "center", gap: "5px",
                              padding: "5px 11px", borderRadius: "999px",
                              border: "1px solid rgba(255,255,255,0.15)",
                              background: "rgba(255,255,255,0.05)",
                              color: "rgba(255,255,255,0.75)",
                              fontSize: "11px", fontWeight: 600, cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                          >
                            <Send size={10} />
                            Enviar a narrar →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ───────────────────────────────────────── */}
          <div style={{
            flexShrink: 0,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "12px 14px",
            background: "#000",
          }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: "8px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "12px",
              padding: "8px 8px 8px 14px",
              transition: "border-color 0.15s",
            }}
              onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.45)"; }}
              onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Describe el guion que necesitas..."
                rows={1}
                disabled={generating}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "rgba(255,255,255,0.88)", fontSize: "13px", lineHeight: 1.5,
                  resize: "none", fontFamily: "inherit", minHeight: "20px", maxHeight: "120px",
                  overflowY: "auto", paddingTop: "2px",
                  opacity: generating ? 0.5 : 1,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || generating}
                style={{
                  width: 30, height: 30, borderRadius: "8px", border: "none",
                  background: (!input.trim() || generating) ? "rgba(255,255,255,0.06)" : "#8b5cf6",
                  color: (!input.trim() || generating) ? "rgba(255,255,255,0.25)" : "#fff",
                  cursor: (!input.trim() || generating) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.15s, color 0.15s",
                }}
              >
                {generating
                  ? <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
                  : <ArrowUp size={15} />}
              </button>
            </div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", margin: "6px 0 0", textAlign: "center" }}>
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </>
      )}
    </div>
  );
}
