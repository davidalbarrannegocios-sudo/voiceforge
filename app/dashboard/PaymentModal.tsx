"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { useLang } from "./LanguageContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface BillingPlan {
  key: string;
  name: string;
  price: number;
  characters: number;
  features?: string[];
}

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "#111111",
    colorText: "#e5e7eb",
    colorDanger: "#f87171",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
    colorTextPlaceholder: "#555555",
  },
  rules: {
    ".Input": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
    ".Input:focus": { border: "1px solid #ffffff", boxShadow: "0 0 0 2px rgba(255,255,255,0.08)" },
    ".Label": { color: "#6b7280", fontSize: "12px", fontWeight: "500" },
    ".Tab": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
    ".Tab--selected": { border: "1px solid #ffffff", backgroundColor: "rgba(255,255,255,0.05)" },
    ".Tab:hover": { backgroundColor: "#1a1a1a" },
  },
};

function FeatureTick() {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: "50%",
      background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: "2px",
    }}>
      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ─── Inner form (inside <Elements>) ─────────────────────── */
function SubscriptionForm({
  plan,
  customerId,
  planKey,
  billing,
  onSuccess,
}: {
  plan: BillingPlan;
  customerId: string;
  planKey: string;
  billing: "monthly" | "annual";
  onSuccess: () => void;
}) {
  const { t } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  const monthlyPrice = billing === "annual"
    ? Math.round(plan.price * 0.83 * 10) / 10
    : plan.price;
  const annualTotal = Math.round(monthlyPrice * 12);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError(null);
    setLoading(true);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Error al validar el formulario");
      setLoading(false);
      return;
    }

    const { error: setupErr, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${baseUrl}/dashboard?success=true&plan=${plan.key}`,
        payment_method_data: {
          billing_details: { name: name.trim() || undefined },
        },
      },
    });

    if (setupErr) {
      setError(setupErr.message ?? "Error al guardar el método de pago");
      setLoading(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;

    if (!paymentMethodId) {
      setError("No se pudo obtener el método de pago. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/activate-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, planKey, paymentMethodId, billing }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error ?? "Error al activar la suscripción");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  const features = plan.features ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", minHeight: "0" }}>

      {/* ── Left column: payment form ── */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          padding: "28px 28px 28px 28px",
          borderRight: "1px solid #1a1a1a",
          display: "flex", flexDirection: "column", gap: "18px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
            Suscripción {plan.name}
          </h2>
          <p style={{ fontSize: "13px", color: "#555555" }}>
            {plan.characters.toLocaleString("es-ES")} caracteres/mes ·{" "}
            {billing === "annual" ? `$${monthlyPrice}/mes` : `$${plan.price}/mes`}
            {billing === "annual" && (
              <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                Anual −17%
              </span>
            )}
          </p>
        </div>

        {/* Name field */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>
            {t.billing.fullName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: "10px",
              background: "#0a0a0a", border: "1px solid #222222",
              color: "#e5e7eb", fontSize: "14px", outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid #ffffff"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid #222222"; }}
          />
        </div>

        {/* Stripe PaymentElement */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>
            {t.billing.paymentMethodLabel}
          </label>
          <PaymentElement options={{ layout: "tabs" }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <p style={{ fontSize: "11px", color: "#333333", marginTop: "auto" }}>
          Cancela en cualquier momento · Renovación automática
        </p>
      </form>

      {/* ── Right column: plan summary ── */}
      <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column" }}>

        <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
          Funciones incluidas
        </p>

        {/* Feature list */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
          {features.map((f, i) => (
            <li
              key={f}
              style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
                paddingTop: "9px", paddingBottom: "9px",
                borderBottom: i < features.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <FeatureTick />
              {f}
            </li>
          ))}
        </ul>

        {/* Price breakdown */}
        <div style={{ marginTop: "20px", borderTop: "1px solid #1a1a1a", paddingTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555555", marginBottom: "6px" }}>
            <span>Subtotal</span>
            <span>{billing === "annual" ? `$${monthlyPrice}/mes` : `$${plan.price}/mes`}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555555", marginBottom: "14px" }}>
            <span>Impuestos</span>
            <span>$0.00</span>
          </div>
          <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
            <span>Total hoy</span>
            <span>{billing === "annual" ? `$${annualTotal}/año` : `$${plan.price}/mes`}</span>
          </div>

          {/* Submit button lives here in right column */}
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={loading || !stripe}
            style={{
              width: "100%", padding: "12px", borderRadius: "10px", border: "none",
              background: loading ? "#333333" : "#ffffff",
              color: "#000000", fontSize: "14px", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !stripe ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "background 0.15s, opacity 0.15s",
            }}
            onMouseEnter={(e) => { if (!loading && stripe) (e.currentTarget as HTMLElement).style.background = "#e5e5e5"; }}
            onMouseLeave={(e) => { if (!loading && stripe) (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
          >
            {loading ? (
              <>
                <svg style={{ color: "#666666", flexShrink: 0 }} className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.billing.processing}
              </>
            ) : billing === "annual" ? (
              `Suscribirse — $${annualTotal}/año`
            ) : (
              `Suscribirse — $${plan.price}/mes`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Outer modal ─────────────────────────────────────────── */
export function PaymentModal({
  plan,
  billing = "monthly",
  onClose,
  onSuccess,
}: {
  plan: BillingPlan;
  billing?: "monthly" | "annual";
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useLang();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const planKey = plan.key as PlanKey;

  useEffect(() => {
    if (!(planKey in PLANS)) {
      setFetchError("Plan inválido. Contacta con soporte.");
      return;
    }

    let cancelled = false;
    fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setCustomerId(data.customerId);
        } else {
          setFetchError(data.error ?? "No se pudo iniciar el proceso de pago");
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError("Error de conexión. Inténtalo de nuevo.");
      });

    return () => { cancelled = true; };
  }, [planKey]);

  function handleSuccess() {
    onSuccess();
    onClose();
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: "relative", width: "100%", maxWidth: "820px",
        borderRadius: "18px", background: "#111111", border: "1px solid #1a1a1a",
        overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "14px", right: "16px", zIndex: 10, background: "none", border: "none", cursor: "pointer", color: "#444444", padding: "4px", lineHeight: 0 }}
        >
          <X size={18} />
        </button>

        {/* Body */}
        {fetchError ? (
          <div style={{ padding: "40px 32px", textAlign: "center" }}>
            <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
              {fetchError}
            </div>
          </div>
        ) : !clientSecret || !customerId ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "72px 0" }}>
            <svg style={{ color: "#555555" }} className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p style={{ fontSize: "13px", color: "#555555" }}>{t.billing.preparingPayment}</p>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}
          >
            <SubscriptionForm
              plan={plan}
              customerId={customerId}
              planKey={planKey}
              billing={billing}
              onSuccess={handleSuccess}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
