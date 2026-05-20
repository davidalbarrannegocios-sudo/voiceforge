"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { X, Check } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CARD_STYLE = {
  style: {
    base: {
      color: "#e5e7eb",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#6b7280" },
      iconColor: "#93c5fd",
    },
    invalid: { color: "#f87171", iconColor: "#f87171" },
  },
  hidePostalCode: true,
};

export interface BillingPlan {
  key: string;
  name: string;
  price: number;
  characters: number;
}

/* ─── Inner form (must live inside <Elements>) ─────────────── */
function PaymentForm({
  plan,
  clientSecret,
  userEmail,
  onSuccess,
}: {
  plan: BillingPlan;
  clientSecret: string;
  userEmail?: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setError(null);
    setLoading(true);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card, billing_details: { name, email } } }
    );

    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar el pago");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "#0a0a0f",
    border: "1px solid #2a2a3e",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Nombre completo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
          className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Datos de tarjeta
        </label>
        <div className="rounded-lg px-3 py-3" style={inputStyle}>
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-xs"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg,#3b82f6,#2563eb)",
          boxShadow: loading ? "none" : "0 4px 15px rgba(59,130,246,0.3)",
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Procesando...
          </>
        ) : (
          `Pagar ${plan.price}€`
        )}
      </button>
    </form>
  );
}

/* ─── Outer modal ──────────────────────────────────────────── */
export function PaymentModal({
  plan,
  userEmail,
  onClose,
  onSuccess,
}: {
  plan: BillingPlan;
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    fetch("/api/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan.key }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setFetchError(data.error ?? "No se pudo iniciar el pago");
      })
      .catch(() => setFetchError("Error de conexión. Inténtalo de nuevo."));
  }, [plan.key]);

  function handleSuccess() {
    setSucceeded(true);
    // Wait 2 s for the webhook to land before refreshing the balance
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "#12121a", border: "1px solid #2a2a3e" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Plan {plan.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {plan.characters.toLocaleString("es-ES")} caracteres &middot; {plan.price}€ pago único
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* States */}
        {succeeded ? (
          <div className="text-center py-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(34,197,94,0.15)" }}
            >
              <Check size={28} className="text-green-400" />
            </div>
            <p className="font-semibold text-white mb-1">¡Pago completado!</p>
            <p className="text-sm text-gray-400">
              Se añadirán{" "}
              <span className="text-blue-400 font-medium">
                {plan.characters.toLocaleString("es-ES")} caracteres
              </span>{" "}
              a tu cuenta en breve.
            </p>
          </div>
        ) : fetchError ? (
          <div
            className="p-4 rounded-lg text-sm text-center"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
            }}
          >
            {fetchError}
          </div>
        ) : !clientSecret ? (
          <div className="flex items-center justify-center py-14">
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24" style={{ color: "#93c5fd" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              plan={plan}
              clientSecret={clientSecret}
              userEmail={userEmail}
              onSuccess={handleSuccess}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
