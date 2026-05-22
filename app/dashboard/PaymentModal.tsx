"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/stripe";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface BillingPlan {
  key: string;
  name: string;
  price: number;
  characters: number;
}

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#12121a",
    colorText: "#e5e7eb",
    colorDanger: "#f87171",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
    colorTextPlaceholder: "#4a4a65",
  },
  rules: {
    ".Input": { border: "1px solid #2a2a3e", backgroundColor: "#0a0a0f" },
    ".Input:focus": { border: "1px solid #3b82f6", boxShadow: "0 0 0 2px rgba(59,130,246,0.15)" },
    ".Label": { color: "#6b7280", fontSize: "12px", fontWeight: "500" },
    ".Tab": { border: "1px solid #2a2a3e", backgroundColor: "#0d0d17" },
    ".Tab--selected": { border: "1px solid #3b82f6", backgroundColor: "rgba(59,130,246,0.08)" },
    ".Tab:hover": { backgroundColor: "#12121a" },
  },
};

/* ─── Inner form (inside <Elements>) ─────────────────────── */
function SubscriptionForm({
  plan,
  customerId,
  planKey,
  onClose,
  onSuccess,
}: {
  plan: BillingPlan;
  customerId: string;
  planKey: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");

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

    // Step 1: confirm the SetupIntent to register the card
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

    // setupIntent is undefined only if a redirect happened (handled by return_url)
    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;

    if (!paymentMethodId) {
      setError("No se pudo obtener el método de pago. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    // Step 2: create the subscription with the saved payment method
    const res = await fetch("/api/activate-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, planKey, paymentMethodId }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error ?? "Error al activar la suscripción");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Name */}
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>
          Nombre completo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          style={{
            width: "100%", padding: "10px 12px", borderRadius: "10px",
            background: "#0a0a0f", border: "1px solid #2a2a3e",
            color: "#e5e7eb", fontSize: "14px", outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Stripe PaymentElement */}
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>
          Método de pago
        </label>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          width: "100%", padding: "12px", borderRadius: "10px", border: "none",
          background: loading ? "#1e3a5f" : "linear-gradient(135deg,#3b82f6,#2563eb)",
          color: "#fff", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading || !stripe ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? (
          <>
            <svg style={{ color: "#93c5fd", flexShrink: 0 }} className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Procesando...
          </>
        ) : (
          `Suscribirse por $${plan.price}/mes`
        )}
      </button>

      <p style={{ textAlign: "center", fontSize: "11px", color: "#2e2e48" }}>
        Cancela en cualquier momento · Renovación automática mensual
      </p>
    </form>
  );
}

/* ─── Outer modal ─────────────────────────────────────────── */
export function PaymentModal({
  plan,
  onClose,
  onSuccess,
  userEmail: _userEmail,
}: {
  plan: BillingPlan;
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.8)" }}>
      <div style={{ width: "100%", maxWidth: "440px", borderRadius: "20px", background: "#0d0d17", border: "1px solid #1e1e2e", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "3px" }}>
              Suscripción {plan.name}
            </p>
            <p style={{ fontSize: "13px", color: "#3a3a52" }}>
              {plan.characters.toLocaleString("es-ES")} caracteres/mes · ${plan.price}/mes
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#3a3a52", padding: "2px", marginLeft: "12px", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ margin: "16px 24px", height: "1px", background: "#1a1a28" }} />

        {/* Body */}
        <div style={{ padding: "0 24px 24px" }}>
          {fetchError ? (
            <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px", textAlign: "center" }}>
              {fetchError}
            </div>
          ) : !clientSecret || !customerId ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "32px 0" }}>
              <svg style={{ color: "#3b82f6" }} className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p style={{ fontSize: "13px", color: "#3a3a52" }}>Preparando formulario de pago...</p>
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
                onClose={onClose}
                onSuccess={handleSuccess}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
