"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { X, Zap } from "lucide-react";
import { useLang } from "./LanguageContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "#12121a",
    colorText: "#e5e7eb",
    colorDanger: "#f87171",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
    colorTextPlaceholder: "#4a4a65",
  },
  rules: {
    ".Input": { border: "1px solid #2a2a3e", backgroundColor: "#0a0a0f" },
    ".Input:focus": { border: "1px solid #ffffff", boxShadow: "0 0 0 2px rgba(255,255,255,0.1)" },
    ".Label": { color: "#6b7280", fontSize: "12px", fontWeight: "500" },
    ".Tab": { border: "1px solid #2a2a3e", backgroundColor: "#0d0d17" },
    ".Tab--selected": { border: "1px solid #ffffff", backgroundColor: "rgba(255,255,255,0.05)" },
    ".Tab:hover": { backgroundColor: "#12121a" },
  },
};

/* ─── Inner form ─────────────────────────────────────────── */
function CreditPaymentForm({
  price,
  credits,
  paymentIntentId,
  onSuccess,
}: {
  price: number;
  credits: number;
  paymentIntentId: string;
  onSuccess: (credits: number) => void;
}) {
  const { t } = useLang();
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");

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

    const { error: paymentErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${baseUrl}/dashboard?creditsBought=${credits}`,
        payment_method_data: {
          billing_details: { name: name.trim() || undefined },
        },
      },
    });

    if (paymentErr) {
      setError(paymentErr.message ?? "Error al procesar el pago");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError("El pago no se completó. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    // Confirm server-side and credit the account
    const res = await fetch("/api/buy-credits/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error ?? "Error al acreditar los créditos. Contacta con soporte.");
      setLoading(false);
      return;
    }

    onSuccess(credits);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            background: "#0a0a0f", border: "1px solid #2a2a3e",
            color: "#e5e7eb", fontSize: "14px", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>
          {t.billing.paymentMethodLabel}
        </label>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          width: "100%", padding: "12px", borderRadius: "10px", border: "none",
          background: loading ? "#333333" : "#ffffff",
          color: "#fff", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading || !stripe ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? (
          <>
            <svg style={{ color: "#aaaaaa", flexShrink: 0 }} className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.billing.processing}
          </>
        ) : (
          `Pagar $${price}`
        )}
      </button>

      <p style={{ textAlign: "center", fontSize: "11px", color: "#2e2e48" }}>
        {t.billing.extraCreditsDesc}
      </p>
    </form>
  );
}

/* ─── Outer modal ─────────────────────────────────────────── */
export function CreditPackModal({
  packKey,
  onClose,
  onSuccess,
}: {
  packKey: string;
  onClose: () => void;
  onSuccess: (credits: number) => void;
}) {
  const { t } = useLang();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [packInfo, setPackInfo] = useState<{ credits: number; price: number; label: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/buy-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packKey }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          // Extract paymentIntentId from clientSecret (format: pi_xxx_secret_xxx)
          setPaymentIntentId(data.clientSecret.split("_secret_")[0]);
          setPackInfo({ credits: data.credits, price: data.price, label: data.label });
        } else {
          setFetchError(data.error ?? "No se pudo iniciar el proceso de pago");
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError("Error de conexión. Inténtalo de nuevo.");
      });
    return () => { cancelled = true; };
  }, [packKey]);

  function handleSuccess(credits: number) {
    onSuccess(credits);
    onClose();
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.8)" }}
    >
      <div style={{ width: "100%", maxWidth: "440px", borderRadius: "20px", background: "#0d0d17", border: "1px solid #1e1e2e", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={15} style={{ color: "#aaaaaa" }} />
            </div>
            <div>
              <p style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "2px" }}>
                {packInfo ? packInfo.label : "Créditos extra"}
              </p>
              {packInfo && (
                <p style={{ fontSize: "13px", color: "#3a3a52" }}>
                  ${packInfo.price} · pago único · válidos 3 meses
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#3a3a52", padding: "2px", marginLeft: "12px", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ margin: "16px 24px", height: "1px", background: "#1a1a28" }} />

        {/* Body */}
        <div style={{ padding: "0 24px 24px" }}>
          {fetchError ? (
            <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px", textAlign: "center" }}>
              {fetchError}
            </div>
          ) : !clientSecret || !paymentIntentId || !packInfo ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "32px 0" }}>
              <svg style={{ color: "#aaaaaa" }} className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p style={{ fontSize: "13px", color: "#3a3a52" }}>{t.billing.preparingPayment}</p>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}>
              <CreditPaymentForm
                price={packInfo.price}
                credits={packInfo.credits}
                paymentIntentId={paymentIntentId}
                onSuccess={handleSuccess}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
