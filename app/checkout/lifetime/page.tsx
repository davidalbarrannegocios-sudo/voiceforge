"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, Lock, Infinity, Zap, Mic, Globe } from "lucide-react";
import Image from "next/image";

const LIFETIME_CLERK_ID = "cmpveay6i000syjqiz4xy6izg";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#f59e0b",
    colorBackground: "#0a0a0a",
    colorText: "#e5e7eb",
    colorDanger: "#f87171",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
    colorTextPlaceholder: "#555555",
  },
  rules: {
    ".Input": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
    ".Input:focus": { border: "1px solid #f59e0b", boxShadow: "0 0 0 2px rgba(245,158,11,0.15)" },
    ".Label": { color: "#666666", fontSize: "12px", fontWeight: "500" },
    ".Tab": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
    ".Tab--selected": { border: "1px solid #f59e0b", backgroundColor: "rgba(245,158,11,0.08)" },
    ".Tab:hover": { backgroundColor: "#111111" },
    ".TabLabel": { color: "#e5e7eb" },
    ".Block": { border: "1px solid #222222", backgroundColor: "#0a0a0a" },
  },
};

const FEATURES = [
  "20.000.000 créditos · pago único",
  "Voces clonadas ilimitadas",
  "Todas las funciones desbloqueadas",
  "Texto a Voz, Diálogo, Traducción, Transcripción",
  "Imagen y Vídeo con IA",
  "Sin caducidad — los créditos no expiran",
  "Soporte prioritario de por vida",
];

function Tick() {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: "2px",
      background: "linear-gradient(135deg, #d97706, #f59e0b)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function LifetimeForm({ isRenewal }: { isRenewal: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

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
        return_url: `${baseUrl}/dashboard?tab=billing&lifetime=success`,
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

    router.push("/dashboard?tab=billing&lifetime=success");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p style={{ fontSize: "13px", color: "#f87171", margin: 0 }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !stripe || !elements}
        style={{
          width: "100%", padding: "14px", borderRadius: "10px", border: "none", cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#333" : "linear-gradient(135deg, #d97706, #f59e0b)",
          color: "#000", fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px", transition: "opacity 0.2s", opacity: loading ? 0.6 : 1,
        }}
      >
        <Lock size={15} />
        {loading ? "Procesando..." : isRenewal ? "Renovar 20M créditos · $340" : "Comprar Elite Vitalicio · $340"}
      </button>
      <p style={{ fontSize: "11px", color: "#555", textAlign: "center", margin: 0 }}>
        Pago único · Sin suscripción · Los créditos no caducan · Seguro con Stripe
      </p>
    </form>
  );
}

function LifetimeCheckout() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isRenewal, setIsRenewal] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user || user.id !== LIFETIME_CLERK_ID) {
      router.replace("/dashboard");
      return;
    }

    fetch("/api/checkout/lifetime", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setFetchError(data.error); return; }
        setClientSecret(data.clientSecret);
        setIsRenewal(data.isRenewal ?? false);
      })
      .catch(() => setFetchError("Error al conectar con el servidor"));
  }, [isLoaded, user, router]);

  if (!isLoaded || (!clientSecret && !fetchError)) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #f59e0b", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#f87171", fontSize: 14 }}>{fetchError}</p>
        <button onClick={() => router.push("/dashboard")} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>← Volver al dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex" }}>

      {/* ── LEFT — Product info ── */}
      <div style={{
        flex: "0 0 52%", display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "56px 64px", borderRight: "1px solid #111",
      }}>
        <a href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#555", fontSize: 13, textDecoration: "none", marginBottom: 40 }}>
          <ArrowLeft size={14} /> Volver al dashboard
        </a>

        {/* Logo + plan name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Image src="/elitelabs.png" alt="Elite Labs" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <p style={{ fontSize: 12, color: "#555", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>Elite Labs</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
              {isRenewal ? "Renovar Elite Vitalicio" : "Elite Vitalicio"}
            </p>
          </div>
        </div>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", marginBottom: 32, width: "fit-content" }}>
          <Infinity size={14} style={{ color: "#f59e0b" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.05em" }}>PAGO ÚNICO · SIN CADUCIDAD</span>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1 }}>$340</span>
            <span style={{ fontSize: 14, color: "#555" }}>pago único</span>
          </div>
          {isRenewal && (
            <p style={{ fontSize: 13, color: "#f59e0b", marginTop: 6, fontWeight: 600 }}>
              +20.000.000 créditos se añadirán a tu saldo actual
            </p>
          )}
        </div>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Tick />
              <span style={{ fontSize: 14, color: "#d1d5db", lineHeight: "1.4" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — Payment form ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "56px 64px", background: "#050505",
      }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
            <Lock size={13} style={{ color: "#555" }} />
            <span style={{ fontSize: 12, color: "#555" }}>Pago seguro con Stripe</span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 24, marginTop: 0 }}>
            Información de pago
          </h2>

          <Elements stripe={stripePromise} options={{ clientSecret: clientSecret!, appearance: ELEMENTS_APPEARANCE }}>
            <LifetimeForm isRenewal={isRenewal} />
          </Elements>
        </div>
      </div>
    </div>
  );
}

export default function LifetimeCheckoutPage() {
  return (
    <Suspense>
      <LifetimeCheckout />
    </Suspense>
  );
}
