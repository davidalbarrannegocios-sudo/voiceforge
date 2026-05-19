"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const plans = [
  {
    key: "basico",
    name: "Básico",
    price: 6,
    characters: 250000,
    popular: false,
    features: [
      "250.000 caracteres",
      "Explorar voces públicas",
      "Clonación de voz",
      "Historial 30 días",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 12,
    characters: 600000,
    popular: true,
    features: [
      "600.000 caracteres",
      "Explorar voces públicas",
      "Clonación de voz ilimitada",
      "Historial completo",
      "Generación prioritaria",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: 24,
    characters: 1400000,
    popular: false,
    features: [
      "1.400.000 caracteres",
      "Explorar voces públicas",
      "Clonación de voz ilimitada",
      "Historial completo",
      "Prioridad máxima",
      "Soporte preferente",
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-400 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(planKey: string) {
    if (!isSignedIn) {
      router.push(`/sign-up?redirect=/pricing?plan=${planKey}`);
      return;
    }

    setLoading(planKey);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      alert("Error al crear la sesión de pago. Inténtalo de nuevo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <header
        className="border-b px-4 h-16 flex items-center"
        style={{ borderColor: "#2a2a3e" }}
      >
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-lg text-white">Elite Labs</span>
          </Link>
          <Link
            href={isSignedIn ? "/dashboard" : "/"}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isSignedIn ? "← Dashboard" : "← Inicio"}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Elige tu plan
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Pago único, sin suscripciones. Los caracteres nunca caducan.
            <br />
            <span className="text-sm text-gray-500">
              Se descuenta un 10% extra por overhead de procesamiento
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className="relative p-6 rounded-2xl border flex flex-col"
              style={{
                background: plan.popular ? "rgba(59,130,246,0.08)" : "#12121a",
                borderColor: plan.popular ? "#3b82f6" : "#2a2a3e",
              }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-4 py-1 rounded-full whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  }}
                >
                  MÁS POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">{plan.price}€</span>
                  <span className="text-gray-400 text-sm">pago único</span>
                </div>
                <p className="text-sm text-gray-500">
                  {plan.characters.toLocaleString("es-ES")} caracteres
                </p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(plan.key)}
                disabled={loading === plan.key}
                className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={
                  plan.popular
                    ? {
                        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                        color: "white",
                        boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
                      }
                    : {
                        background: "#1a1a2e",
                        color: "#d1d5db",
                        border: "1px solid #2a2a3e",
                      }
                }
              >
                {loading === plan.key && (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {loading === plan.key ? "Redirigiendo..." : `Comprar ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 space-y-4 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            Preguntas frecuentes
          </h2>
          {[
            {
              q: "¿Los caracteres caducan?",
              a: "No. Una vez comprados, los caracteres son tuyos para siempre.",
            },
            {
              q: "¿Puedo comprar más caracteres después?",
              a: "Sí, puedes comprar cualquier plan en cualquier momento y los caracteres se acumulan.",
            },
            {
              q: "¿Cuánto tarda en generarse el audio?",
              a: "Normalmente entre 2 y 10 segundos dependiendo de la longitud del texto.",
            },
            {
              q: "¿Qué formatos de audio acepta la clonación?",
              a: "WAV, MP3 y M4A. Recomendamos entre 10 y 30 segundos de audio limpio sin ruido de fondo.",
            },
          ].map((faq) => (
            <div
              key={faq.q}
              className="p-4 rounded-xl border"
              style={{ background: "#12121a", borderColor: "#2a2a3e" }}
            >
              <p className="font-medium text-white mb-1">{faq.q}</p>
              <p className="text-sm text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
