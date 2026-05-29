"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, Lock } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const RECHARGE_OPTIONS: Record<string, {
  label: string; euros: number; bytes: number;
}> = {
  r18:  { label: "1M bytes",  euros: 18,  bytes: 1_000_000  },
  r54:  { label: "3M bytes",  euros: 54,  bytes: 3_000_000  },
  r180: { label: "10M bytes", euros: 180, bytes: 10_000_000 },
  r540: { label: "30M bytes", euros: 540, bytes: 30_000_000 },
};

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "#0a0a0a",
    colorText: "#e5e7eb",
    colorDanger: "#f87171",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
    colorTextPlaceholder: "#555555",
  },
  rules: {
    ".Input": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
    ".Input:focus": { border: "1px solid #ffffff", boxShadow: "0 0 0 2px rgba(255,255,255,0.08)" },
    ".Label": { color: "#666666", fontSize: "12px", fontWeight: "500" },
    ".Tab": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
    ".Tab--selected": { border: "1px solid #ffffff", backgroundColor: "rgba(255,255,255,0.05)" },
    ".Tab:hover": { backgroundColor: "#111111" },
    ".TabLabel": { color: "#e5e7eb" },
    ".Block": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
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

function ApiRechargeForm({
  option,
  paymentIntentId,
}: {
  option: { label: string; euros: number; bytes: number };
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
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

    const { error: payErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${baseUrl}/dashboard/developers?recharge=success`,
      },
    });

    if (payErr) {
      setError(payErr.message ?? "Error al procesar el pago");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError("El pago no se completó. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/dashboard/developers?recharge=success");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex" }}>

      {/* ── LEFT COLUMN ── */}
      <div style={{
        flex: "0 0 55%", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "60px 48px", minHeight: "100vh",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Back */}
          <button
            type="button"
            onClick={() => router.push("/dashboard/developers")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "none", border: "none", cursor: "pointer",
              color: "#555555", fontSize: "13px", padding: 0, marginBottom: "32px",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555555"; }}
          >
            <ArrowLeft size={14} />
            Volver
          </button>

          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Lock size={14} style={{ color: "#444444" }} />
            <span style={{ fontSize: "12px", color: "#444444" }}>Pago seguro con Stripe</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
            Recarga de API
          </h1>
          <p style={{ fontSize: "14px", color: "#555555", marginBottom: "32px" }}>
            {option.label} · Pago único · Sin renovación automática
          </p>

          {/* Payment form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666666", marginBottom: "8px", fontWeight: 500 }}>
                Método de pago
              </label>
              <PaymentElement options={{ layout: "tabs" }} />
            </div>

            {error && (
              <div style={{
                padding: "12px", borderRadius: "8px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#f87171", fontSize: "13px",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !stripe}
              style={{
                width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                background: loading ? "#333333" : "#ffffff",
                color: "#000000", fontSize: "15px", fontWeight: 700,
                cursor: loading || !stripe ? "not-allowed" : "pointer",
                opacity: loading || !stripe ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? (
                <>
                  <svg style={{ color: "#888888" }} className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </>
              ) : `Pagar ${option.euros}€`}
            </button>

            <p style={{ fontSize: "11px", color: "#333333", textAlign: "center" }}>
              Pago único · No se renueva automáticamente
            </p>
          </form>
        </div>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div style={{
        flex: "0 0 45%", background: "#0a0a0a",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 48px", minHeight: "100vh",
      }}>
        <div style={{ maxWidth: "340px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>
            Resumen del pedido
          </p>

          {/* Summary card */}
          <div style={{
            borderRadius: "14px", background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)", padding: "20px", marginBottom: "24px",
          }}>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginBottom: "2px" }}>
              Recarga API — {option.label}
            </p>
            <p style={{ fontSize: "13px", color: "#555555", marginBottom: "16px" }}>
              {option.bytes.toLocaleString("es-ES")} bytes · pago único
            </p>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888888" }}>
                {option.label} de bytes API
              </span>
              <span style={{ fontSize: "13px", color: "#888888" }}>{option.euros}€</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888888" }}>Impuesto estimado</span>
              <span style={{ fontSize: "13px", color: "#888888" }}>0.00€</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#888888" }}>Total</span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff" }}>{option.euros}€</span>
            </div>
          </div>

          {/* Features */}
          {[
            "Bytes acreditados al instante",
            "Válidos indefinidamente",
            "Compatibles con todos los modelos",
            "No se renuevan automáticamente",
          ].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
              <FeatureTick />
              <span style={{ fontSize: "13px", color: "#888888", lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiRechargeContent() {
  const params = useParams<{ option: string }>();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const option = RECHARGE_OPTIONS[params.option];

  useEffect(() => {
    if (!option) { router.replace("/dashboard/developers"); return; }
    let cancelled = false;

    fetch("/api/checkout/api-recharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: params.option }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setFetchError(data.error ?? "No se pudo iniciar el proceso de pago");
      })
      .catch(() => { if (!cancelled) setFetchError("Error de conexión. Inténtalo de nuevo."); });

    return () => { cancelled = true; };
  }, [params.option, option, router]);

  if (!option) return null;

  if (fetchError) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "400px", padding: "24px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "14px", textAlign: "center" }}>
          {fetchError}
          <button
            type="button"
            onClick={() => router.push("/dashboard/developers")}
            style={{ display: "block", margin: "16px auto 0", padding: "8px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#ffffff", cursor: "pointer", fontSize: "13px" }}
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <svg style={{ color: "#444444" }} className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p style={{ fontSize: "14px", color: "#444444" }}>Preparando formulario de pago...</p>
      </div>
    );
  }

  const paymentIntentId = clientSecret.split("_secret_")[0];

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}>
      <ApiRechargeForm option={option} paymentIntentId={paymentIntentId} />
    </Elements>
  );
}

export default function ApiRechargePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg style={{ color: "#444444" }} className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      }
    >
      <ApiRechargeContent />
    </Suspense>
  );
}
