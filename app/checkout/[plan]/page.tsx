"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { EliteLoader } from "@/components/ui/EliteLoader";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, Lock } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/stripe";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CREDIT_PACKS: Record<string, { label: string; credits: number; price: number }> = {
  "credits-100k": { label: "100.000 créditos", credits: 100_000,   price: 5  },
  "credits-300k": { label: "300.000 créditos", credits: 300_000,   price: 12 },
  "credits-600k": { label: "600.000 créditos", credits: 600_000,   price: 19 },
  "credits-1m":   { label: "1.000.000 créditos", credits: 1_000_000, price: 30 },
};

const PLAN_FEATURES: Record<string, string[]> = {
  creator: [
    "250.000 caracteres/mes (x2 con EliteLabs Turbo)",
    "Selección de voz completa",
    "Transcripciones y traducciones ilimitadas",
    "3 voces clonadas",
    "Audios disponibles 14 días",
  ],
  plus: [
    "1.000.000 caracteres/mes (x2 con EliteLabs Turbo)",
    "Selección de voz completa",
    "Transcripciones y traducciones ilimitadas",
    "10 voces clonadas",
    "Audios disponibles 14 días",
  ],
  pro: [
    "2.000.000 caracteres/mes (x2 con EliteLabs Turbo)",
    "Selección de voz completa",
    "Transcripciones y traducciones ilimitadas",
    "15 voces clonadas",
    "Generación prioritaria",
    "Audios disponibles 30 días",
  ],
  elite: [
    "15.000.000 caracteres/mes (x2 con EliteLabs Turbo)",
    "Selección de voz completa",
    "Transcripciones y traducciones ilimitadas",
    "20 voces clonadas",
    "Prioridad máxima",
    "Soporte preferente",
    "Audios disponibles 90 días",
  ],
  // legacy — kept for existing subscribers who access checkout
  starter: [
    "200.000 caracteres/mes (x2 con EliteLabs Turbo)",
    "Selección de voz completa",
    "Transcripciones y traducciones ilimitadas",
    "3 voces clonadas",
    "Audios disponibles 14 días",
  ],
  enterprise: [
    "5.000.000 caracteres/mes (x2 con EliteLabs Turbo)",
    "Voces clonadas ilimitadas",
    "Transcripciones y traducciones ilimitadas",
    "Traducción de audio +10%",
    "Generación prioritaria",
    "Soporte preferente",
    "Audios disponibles 90 días",
  ],
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

/* ─── Inner form (must be inside <Elements>) ──────────────── */
function CheckoutForm({
  planKey,
  billing,
  setBilling,
  customerId,
  discount,
}: {
  planKey: PlanKey;
  billing: "monthly" | "annual";
  setBilling: (b: "monthly" | "annual") => void;
  customerId: string;
  discount: Discount;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS[planKey];
  const features = PLAN_FEATURES[planKey] ?? [];

  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  const monthlyPrice = billing === "annual"
    ? Math.round(plan.price * 0.85 * 10) / 10
    : plan.price;
  const annualTotal = Math.round(monthlyPrice * 12);

  // Discount calculations
  const discountFactor = discount.active ? (1 - discount.percent / 100) : 1;
  const discountedMonthly = Math.round(monthlyPrice * discountFactor * 10) / 10;
  const discountedAnnual = Math.round(annualTotal * discountFactor);
  const displayPrice = billing === "annual"
    ? `$${discount.active ? discountedAnnual : annualTotal}/año`
    : `$${discount.active ? discountedMonthly : plan.price}/mes`;

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
        return_url: `${baseUrl}/dashboard?success=true&plan=${planKey}`,
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

    router.push("/dashboard?success=true");
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000000", overflow: "hidden" }}>

      {/* ── LEFT COLUMN ── */}
      <div style={{ flex: "0 0 55%", height: "100vh", overflowY: "auto", padding: "48px 56px", display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Discount banner */}
        {discount.active && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>🎉</span>
            <p style={{ fontSize: "13px", color: "#4ade80", fontWeight: 600, margin: 0 }}>
              Tienes un {discount.percent}% de descuento aplicado gracias a tu enlace de afiliado
            </p>
          </div>
        )}

        {/* Back + title */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/pricing")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#555555", fontSize: "13px", padding: 0, marginBottom: "28px" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555555"; }}
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", margin: 0, lineHeight: 1.1 }}>
            Configura tu plan
          </h1>
          <p style={{ fontSize: "14px", color: "#555555", marginTop: "6px" }}>
            {plan.characters.toLocaleString("es-ES")} caracteres/mes
          </p>
        </div>

        {/* Billing toggle — two cards */}
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Detalles del plan
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {/* Monthly card */}
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              style={{
                padding: "14px 16px", borderRadius: "12px", border: billing === "monthly" ? "2px solid #ffffff" : "1px solid #222222",
                background: billing === "monthly" ? "rgba(255,255,255,0.04)" : "#0a0a0a",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
            >
              <p style={{ fontSize: "12px", color: billing === "monthly" ? "#cccccc" : "#555555", margin: "0 0 4px", fontWeight: 500 }}>
                Facturación mensual
              </p>
              <p style={{ fontSize: "20px", fontWeight: 800, color: billing === "monthly" ? "#ffffff" : "#666666", margin: 0 }}>
                ${plan.price}<span style={{ fontSize: "12px", fontWeight: 400, color: "#555555" }}>/mes</span>
              </p>
            </button>

            {/* Annual card */}
            <button
              type="button"
              onClick={() => setBilling("annual")}
              style={{
                padding: "14px 16px", borderRadius: "12px", border: billing === "annual" ? "2px solid #ffffff" : "1px solid #222222",
                background: billing === "annual" ? "rgba(255,255,255,0.04)" : "#0a0a0a",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                AHORRA 15%
              </div>
              <p style={{ fontSize: "12px", color: billing === "annual" ? "#cccccc" : "#555555", margin: "0 0 4px", fontWeight: 500 }}>
                Facturación anual
              </p>
              <p style={{ fontSize: "20px", fontWeight: 800, color: billing === "annual" ? "#ffffff" : "#666666", margin: 0 }}>
                ${Math.round(plan.price * 0.85 * 10) / 10}<span style={{ fontSize: "12px", fontWeight: 400, color: "#555555" }}>/mes</span>
              </p>
            </button>
          </div>
        </div>

        {/* Payment form */}
        <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Lock size={12} style={{ color: "#555555" }} />
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              Método de pago
            </p>
          </div>
          <PaymentElement options={{ layout: "tabs" }} />

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px", marginTop: "8px" }}>
              {error}
            </div>
          )}
        </form>

        <p style={{ fontSize: "11px", color: "#333333", marginTop: "auto" }}>
          Pago seguro cifrado con SSL · Cancela en cualquier momento
        </p>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div style={{ flex: "0 0 45%", height: "100vh", overflowY: "auto", background: "#0a0a0a", borderLeft: "1px solid #1a1a1a", padding: "48px 40px", display: "flex", flexDirection: "column" }}>

        {/* Plan header */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            Plan seleccionado
          </p>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", margin: "0 0 2px" }}>
            {plan.name}
          </h2>
          <p style={{ fontSize: "13px", color: "#555555" }}>
            {plan.characters.toLocaleString("es-ES")} caracteres/mes
          </p>
        </div>

        {/* Features */}
        <div style={{ marginBottom: "28px", flex: 1 }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
            Funciones destacadas
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {features.map((f, i) => (
              <li
                key={f}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
                  paddingTop: "10px", paddingBottom: "10px",
                  borderBottom: i < features.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <FeatureTick />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Price breakdown */}
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "20px", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555555", marginBottom: "8px" }}>
            <span>Suscripción {billing === "annual" ? "anual" : "mensual"}</span>
            <span>${billing === "annual" ? `${monthlyPrice}/mes` : `${plan.price}/mes`}</span>
          </div>
          {discount.active && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#4ade80", marginBottom: "8px" }}>
              <span>Descuento afiliado ({discount.percent}%)</span>
              <span>
                −${billing === "annual"
                  ? (annualTotal - discountedAnnual).toFixed(2)
                  : (monthlyPrice - discountedMonthly).toFixed(2)}
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555555", marginBottom: "16px" }}>
            <span>Impuesto estimado</span>
            <span>$0.00</span>
          </div>
          <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, color: "#ffffff", marginBottom: "20px" }}>
            <span>Importe a pagar hoy</span>
            <div style={{ textAlign: "right" }}>
              {discount.active && (
                <span style={{ fontSize: "12px", color: "#555555", textDecoration: "line-through", marginRight: "8px" }}>
                  ${billing === "annual" ? `${annualTotal}/año` : `${plan.price}/mes`}
                </span>
              )}
              <span style={{ color: discount.active ? "#4ade80" : "#ffffff" }}>{displayPrice}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={loading || !stripe}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              background: loading ? "#333333" : "#ffffff",
              color: "#000000", fontSize: "15px", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !stripe ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "background 0.15s, opacity 0.15s",
              marginBottom: "12px",
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
                Procesando...
              </>
            ) : (
              `Suscribirme — ${displayPrice}`
            )}
          </button>

          <p style={{ fontSize: "11px", color: "#333333", textAlign: "center" }}>
            Se renueva {billing === "annual" ? "anualmente" : "mensualmente"} · Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Credit pack checkout form (PaymentIntent flow) ──────── */
function CreditCheckoutForm({
  pack,
  packKey,
  paymentIntentId,
  discount,
}: {
  pack: PackWithDiscount;
  packKey: string;
  paymentIntentId: string;
  discount: Discount;
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
    if (submitErr) { setError(submitErr.message ?? "Error al validar el formulario"); setLoading(false); return; }

    const { error: payErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${baseUrl}/dashboard?creditsBought=${pack.credits}` },
    });

    if (payErr) { setError(payErr.message ?? "Error al procesar el pago"); setLoading(false); return; }
    if (paymentIntent?.status !== "succeeded") { setError("El pago no se completó. Inténtalo de nuevo."); setLoading(false); return; }

    const res = await fetch("/api/buy-credits/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) { setError(data.error ?? "Error al acreditar los créditos. Contacta con soporte."); setLoading(false); return; }

    router.push(`/dashboard?creditsBought=${pack.credits}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex" }}>
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard?tab=billing")}
        style={{ position: "fixed", top: "20px", left: "20px", display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#666666", cursor: "pointer", fontSize: "13px", zIndex: 10 }}
      >
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Left — form */}
      <div style={{ flex: "0 0 55%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 48px", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {discount.active && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
              <span style={{ fontSize: "18px" }}>🎉</span>
              <p style={{ fontSize: "13px", color: "#4ade80", fontWeight: 600, margin: 0 }}>
                Tienes un {discount.percent}% de descuento aplicado gracias a tu enlace de afiliado
              </p>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}>
            <Lock size={14} style={{ color: "#444444" }} />
            <span style={{ fontSize: "12px", color: "#444444" }}>Pago seguro con Stripe</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>
            {pack.label}
          </h1>
          <p style={{ fontSize: "14px", color: "#555555", marginBottom: "32px" }}>
            Pago único · Créditos válidos 3 meses
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#666666", marginBottom: "8px", fontWeight: 500 }}>Método de pago</label>
              <PaymentElement options={{ layout: "tabs" }} />
            </div>

            {error && (
              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !stripe}
              style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: loading ? "#333333" : "#ffffff", color: "#000000", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading || !stripe ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "opacity 0.15s" }}
            >
              {loading ? (
                <><svg style={{ color: "#888888" }} className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Procesando...</>
              ) : `Pagar $${pack.finalPrice}`}
            </button>

            <p style={{ fontSize: "11px", color: "#333333", textAlign: "center" }}>
              Pago único · No se renueva automáticamente
            </p>
          </form>
        </div>
      </div>

      {/* Right — summary */}
      <div style={{ flex: "0 0 45%", background: "#0a0a0a", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px", borderLeft: "1px solid rgba(255,255,255,0.06)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "340px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>Resumen del pedido</p>
          <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px", marginBottom: "24px" }}>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>{pack.label}</p>
            <p style={{ fontSize: "13px", color: "#555555", marginBottom: "16px" }}>Créditos extra · pago único</p>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "16px" }} />
            {discount.active && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#888888" }}>Precio original</span>
                <span style={{ fontSize: "15px", color: "#555555", textDecoration: "line-through" }}>${pack.originalPrice}</span>
              </div>
            )}
            {discount.active && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#4ade80" }}>Descuento ({discount.percent}%)</span>
                <span style={{ fontSize: "13px", color: "#4ade80" }}>−${(pack.originalPrice - pack.finalPrice).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#888888" }}>Total</span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: discount.active ? "#4ade80" : "#ffffff" }}>${pack.finalPrice}</span>
            </div>
          </div>
          {[
            "Créditos acreditados al instante",
            "Válidos 3 meses desde la compra",
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

/* ─── Change plan confirmation (no payment form needed) ────── */
function ChangePlanConfirm({
  planKey,
  currentPlan,
  billing,
  setBilling,
}: {
  planKey: PlanKey;
  currentPlan: string;
  billing: "monthly" | "annual";
  setBilling: (b: "monthly" | "annual") => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS[planKey];
  const features = PLAN_FEATURES[planKey] ?? [];
  const monthlyPrice = billing === "annual" ? Math.round(plan.price * 0.85 * 10) / 10 : plan.price;
  const annualTotal = Math.round(monthlyPrice * 12);
  const displayPrice = billing === "annual" ? `$${annualTotal}/año` : `$${plan.price}/mes`;

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, billing }),
      });
      const data = await res.json();
      if (data.redirect) { router.push(data.redirect); return; }
      if (!res.ok || !data.success) { setError(data.error ?? "Error al cambiar el plan"); setLoading(false); return; }
      router.push(`/dashboard?planChanged=1&plan=${planKey}`);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000000", overflow: "hidden" }}>
      {/* LEFT */}
      <div style={{ flex: "0 0 55%", height: "100vh", overflowY: "auto", padding: "48px 56px", display: "flex", flexDirection: "column", gap: "32px" }}>
        <div>
          <button
            type="button"
            onClick={() => router.push("/dashboard?tab=billing")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#555555", fontSize: "13px", padding: 0, marginBottom: "28px" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555555"; }}
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", margin: 0, lineHeight: 1.1 }}>
            Cambiar de plan
          </h1>
          <p style={{ fontSize: "14px", color: "#555555", marginTop: "6px" }}>
            De <span style={{ color: "#aaaaaa", textTransform: "capitalize" }}>{currentPlan}</span> a <span style={{ color: "#ffffff", textTransform: "capitalize" }}>{plan.name}</span> · El prorrateo se calculará automáticamente
          </p>
        </div>

        {/* Billing toggle */}
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Facturación
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              style={{ padding: "14px 16px", borderRadius: "12px", border: billing === "monthly" ? "2px solid #ffffff" : "1px solid #222222", background: billing === "monthly" ? "rgba(255,255,255,0.04)" : "#0a0a0a", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
            >
              <p style={{ fontSize: "12px", color: billing === "monthly" ? "#cccccc" : "#555555", margin: "0 0 4px", fontWeight: 500 }}>Facturación mensual</p>
              <p style={{ fontSize: "20px", fontWeight: 800, color: billing === "monthly" ? "#ffffff" : "#666666", margin: 0 }}>
                ${plan.price}<span style={{ fontSize: "12px", fontWeight: 400, color: "#555555" }}>/mes</span>
              </p>
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              style={{ padding: "14px 16px", borderRadius: "12px", border: billing === "annual" ? "2px solid #ffffff" : "1px solid #222222", background: billing === "annual" ? "rgba(255,255,255,0.04)" : "#0a0a0a", cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative" }}
            >
              <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>AHORRA 15%</div>
              <p style={{ fontSize: "12px", color: billing === "annual" ? "#cccccc" : "#555555", margin: "0 0 4px", fontWeight: 500 }}>Facturación anual</p>
              <p style={{ fontSize: "20px", fontWeight: 800, color: billing === "annual" ? "#ffffff" : "#666666", margin: 0 }}>
                ${Math.round(plan.price * 0.85 * 10) / 10}<span style={{ fontSize: "12px", fontWeight: 400, color: "#555555" }}>/mes</span>
              </p>
            </button>
          </div>
        </div>

        {/* Info box */}
        <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#888888", lineHeight: 1.6 }}>
          Tu plan cambiará de inmediato. Se calculará un prorrateo basado en los días restantes de tu ciclo actual. No se requiere una nueva tarjeta de crédito.
        </div>

        {error && (
          <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <p style={{ fontSize: "11px", color: "#333333", marginTop: "auto" }}>
          Pago seguro cifrado con SSL · Cancela en cualquier momento
        </p>
      </div>

      {/* RIGHT */}
      <div style={{ flex: "0 0 45%", height: "100vh", overflowY: "auto", background: "#0a0a0a", borderLeft: "1px solid #1a1a1a", padding: "48px 40px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Plan seleccionado</p>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", margin: "0 0 2px" }}>{plan.name}</h2>
          <p style={{ fontSize: "13px", color: "#555555" }}>{plan.characters.toLocaleString("es-ES")} caracteres/mes</p>
        </div>
        <div style={{ marginBottom: "28px", flex: 1 }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#555555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Funciones destacadas</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {features.map((f, i) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5, paddingTop: "10px", paddingBottom: "10px", borderBottom: i < features.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <FeatureTick />{f}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "20px", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555555", marginBottom: "8px" }}>
            <span>Suscripción {billing === "annual" ? "anual" : "mensual"}</span>
            <span>${billing === "annual" ? `${monthlyPrice}/mes` : `${plan.price}/mes`}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555555", marginBottom: "16px" }}>
            <span>Prorrateo</span>
            <span>Calculado al cambiar</span>
          </div>
          <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, color: "#ffffff", marginBottom: "20px" }}>
            <span>Nuevo precio</span>
            <span>{displayPrice}</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: loading ? "#333333" : "#ffffff", color: "#000000", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.15s, opacity 0.15s", marginBottom: "12px" }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e5e5e5"; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
          >
            {loading ? (
              <><svg style={{ color: "#666666", flexShrink: 0 }} className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Procesando...</>
            ) : `Cambiar a ${plan.name} — ${displayPrice}`}
          </button>
          <p style={{ fontSize: "11px", color: "#333333", textAlign: "center" }}>
            Se renueva {billing === "annual" ? "anualmente" : "mensualmente"} · Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
}

type Discount = { active: boolean; percent: number; refCode: string | null };
type PackWithDiscount = { label: string; credits: number; originalPrice: number; finalPrice: number };

/* ─── Data loader — fetches intent then renders form ─────── */
function CheckoutContent() {
  const params = useParams<{ plan: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawKey = params.plan;
  const isCreditPack = rawKey in CREDIT_PACKS;
  const isPlan = rawKey in PLANS;

  const initialBilling = (searchParams.get("billing") ?? "monthly") as "monthly" | "annual";
  const [billing, setBilling] = useState<"monthly" | "annual">(initialBilling);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState<boolean | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [discount, setDiscount] = useState<Discount>({ active: false, percent: 0, refCode: null });
  const [packData, setPackData] = useState<PackWithDiscount | null>(null);

  useEffect(() => {
    if (!isCreditPack && !isPlan) { router.replace("/pricing"); return; }
    let cancelled = false;

    // Always fetch discount info first (cookie is httpOnly, must be read server-side)
    fetch("/api/discount")
      .then(r => r.json())
      .then(d => { if (!cancelled) setDiscount({ active: !!d.active, percent: d.percent ?? 10, refCode: d.refCode ?? null }); })
      .catch(() => {});

    if (isCreditPack) {
      fetch("/api/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packKey: rawKey.replace(/^credits-/, "") }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPackData({
              label: data.label,
              credits: data.credits,
              originalPrice: data.originalPrice,
              finalPrice: data.finalPrice,
            });
            if (data.discount?.active) setDiscount(data.discount);
          } else { setFetchError(data.error ?? "No se pudo iniciar el proceso de pago"); }
        })
        .catch(() => { if (!cancelled) setFetchError("Error de conexión. Inténtalo de nuevo."); });
    } else {
      // Check if user already has an active subscription
      fetch("/api/change-plan")
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setHasActiveSub(data.hasActiveSub ?? false);
          setCurrentPlan(data.currentPlan ?? "free");
          if (data.billingInterval) setBilling(data.billingInterval);

          if (!data.hasActiveSub) {
            fetch("/api/create-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planKey: rawKey }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (cancelled) return;
                if (d.clientSecret) { setClientSecret(d.clientSecret); setCustomerId(d.customerId); }
                else { setFetchError(d.error ?? "No se pudo iniciar el proceso de pago"); }
              })
              .catch(() => { if (!cancelled) setFetchError("Error de conexión. Inténtalo de nuevo."); });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHasActiveSub(false);
            fetch("/api/create-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planKey: rawKey }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (cancelled) return;
                if (d.clientSecret) { setClientSecret(d.clientSecret); setCustomerId(d.customerId); }
                else { setFetchError(d.error ?? "No se pudo iniciar el proceso de pago"); }
              })
              .catch(() => { if (!cancelled) setFetchError("Error de conexión. Inténtalo de nuevo."); });
          }
        });
    }

    return () => { cancelled = true; };
  }, [rawKey, isCreditPack, isPlan, router]);

  if (!isCreditPack && !isPlan) return null;

  if (fetchError) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "400px", padding: "24px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "14px", textAlign: "center" }}>
          {fetchError}
          <button type="button" onClick={() => router.push(isCreditPack ? "/dashboard?tab=billing" : "/pricing")} style={{ display: "block", margin: "16px auto 0", padding: "8px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#ffffff", cursor: "pointer", fontSize: "13px" }}>
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Show change-plan confirmation for users with active subscriptions
  if (isPlan && hasActiveSub) {
    return <ChangePlanConfirm planKey={rawKey as PlanKey} currentPlan={currentPlan} billing={billing} setBilling={setBilling} />;
  }

  if (!clientSecret || (!isCreditPack && !customerId)) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <EliteLoader />
        <p style={{ fontSize: "14px", color: "#555555" }}>Preparando formulario de pago...</p>
      </div>
    );
  }

  if (isCreditPack) {
    const paymentIntentId = clientSecret.split("_secret_")[0];
    const pack = packData ?? { ...CREDIT_PACKS[rawKey], originalPrice: CREDIT_PACKS[rawKey].price, finalPrice: CREDIT_PACKS[rawKey].price };
    return (
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}>
        <CreditCheckoutForm pack={pack} packKey={rawKey} paymentIntentId={paymentIntentId} discount={discount} />
      </Elements>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}>
      <CheckoutForm planKey={rawKey as PlanKey} billing={billing} setBilling={setBilling} customerId={customerId!} discount={discount} />
    </Elements>
  );
}

/* ─── Page export ─────────────────────────────────────────── */
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EliteLoader />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
