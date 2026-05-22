"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Check } from "lucide-react";

type Plan = {
  key: string;
  name: string;
  description: string;
  price: number;
  characters: number;
  popular: boolean;
  free: boolean;
  cta: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    key: "free",
    name: "Gratis",
    description: "Para explorar la plataforma",
    price: 0,
    characters: 10_000,
    popular: false,
    free: true,
    cta: "Empezar gratis",
    features: [
      "10.000 caracteres al registrarte",
      "Voz aleatoria (sin selección)",
      "2 transcripciones/traducciones",
      "Sin clonación de voz",
      "Audios disponibles 72 horas",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    description: "Para creadores que están empezando",
    price: 7,
    characters: 200_000,
    popular: false,
    free: false,
    cta: "Suscribirse",
    features: [
      "200.000 caracteres/mes",
      "Selección de voz completa",
      "Transcripciones y traducciones ilimitadas",
      "3 voces clonadas",
      "Audios disponibles 14 días",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    description: "La mejor opción para creadores activos",
    price: 13,
    characters: 500_000,
    popular: true,
    free: false,
    cta: "Suscribirse",
    features: [
      "500.000 caracteres/mes",
      "Selección de voz completa",
      "Transcripciones y traducciones ilimitadas",
      "10 voces clonadas",
      "Generación prioritaria",
      "Audios disponibles 30 días",
    ],
  },
  {
    key: "elite",
    name: "Elite",
    description: "Máximo rendimiento sin límites",
    price: 25,
    characters: 1_000_000,
    popular: false,
    free: false,
    cta: "Suscribirse",
    features: [
      "1.000.000 caracteres/mes",
      "Selección de voz completa",
      "Transcripciones y traducciones ilimitadas",
      "20 voces clonadas",
      "Prioridad máxima",
      "Soporte preferente",
      "Audios disponibles 30 días",
    ],
  },
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSelect(plan: Plan) {
    if (plan.free) {
      router.push("/sign-up");
      return;
    }
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=/pricing`);
      return;
    }
    setLoadingPlan(plan.key);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.key }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <header style={{ borderBottom: "1px solid #1a1a28", padding: "0 24px", height: "60px", display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: "1100px", width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} className="rounded-lg" />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Elite Labs</span>
          </Link>
          <Link href={isSignedIn ? "/dashboard" : "/"} style={{ fontSize: "13px", color: "#4a4a65", textDecoration: "none" }}>
            {isSignedIn ? "← Dashboard" : "← Inicio"}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 24px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h1 style={{ fontSize: "42px", fontWeight: 800, color: "#fff", marginBottom: "12px", lineHeight: 1.1 }}>
            Elige tu plan
          </h1>
          <p style={{ fontSize: "16px", color: "#4a4a65", marginBottom: "6px" }}>
            Suscripción mensual. Cancela cuando quieras. Los caracteres se renuevan cada mes.
          </p>
          <p style={{ fontSize: "13px", color: "#2e2e48" }}>
            Los caracteres se descuentan exactamente según el texto generado
          </p>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "72px" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              style={{
                position: "relative",
                borderRadius: "16px",
                padding: "28px 22px",
                display: "flex",
                flexDirection: "column",
                border: plan.popular ? "1px solid #3b82f6" : plan.free ? "1px solid #2a2a3e" : "1px solid #1e1e2e",
                background: plan.popular ? "rgba(30,58,138,0.18)" : plan.free ? "#111118" : "#0d0d17",
              }}
            >
              {plan.popular && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                  MÁS POPULAR
                </div>
              )}

              <p style={{ fontSize: "17px", fontWeight: 700, color: plan.free ? "#9ca3af" : "#fff", marginBottom: "4px" }}>
                {plan.name}
              </p>
              <p style={{ fontSize: "12px", color: "#2e2e48", marginBottom: "20px" }}>{plan.description}</p>

              {plan.free ? (
                <>
                  <p style={{ fontSize: "36px", fontWeight: 800, color: "#6b7280", lineHeight: 1, marginBottom: "6px" }}>Gratis</p>
                  <p style={{ fontSize: "13px", color: "#3a3a52", marginBottom: "22px" }}>
                    {plan.characters.toLocaleString("es-ES")} caracteres al registrarte
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "36px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>${plan.price}</span>
                    <span style={{ fontSize: "13px", color: "#3a3a52" }}>/mes</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#3a3a52", marginBottom: "22px" }}>
                    {plan.characters.toLocaleString("es-ES")} caracteres/mes
                  </p>
                </>
              )}

              <button
                onClick={() => handleSelect(plan)}
                disabled={loadingPlan === plan.key}
                style={
                  plan.popular
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "22px", boxShadow: "0 4px 14px rgba(59,130,246,0.35)", opacity: loadingPlan === plan.key ? 0.7 : 1 }
                    : plan.free
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #2a2a3e", cursor: "pointer", background: "transparent", color: "#6b7280", fontSize: "14px", fontWeight: 600, marginBottom: "22px" }
                    : { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #2a2a3e", cursor: "pointer", background: "transparent", color: "#d1d5db", fontSize: "14px", fontWeight: 600, marginBottom: "22px", opacity: loadingPlan === plan.key ? 0.7 : 1 }
                }
              >
                {loadingPlan === plan.key ? "Cargando..." : plan.cta}
              </button>

              <div style={{ height: "1px", background: plan.popular ? "rgba(59,130,246,0.2)" : "#1a1a28", marginBottom: "18px" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: plan.free ? "#4a4a65" : "#6b6b88" }}>
                    <Check size={13} style={{ color: plan.free ? "#4a4a65" : "#3b82f6", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Competitor comparison */}
        <div style={{ maxWidth: "740px", margin: "0 auto 64px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "6px", textAlign: "center" }}>
            Comparativa con la competencia
          </h2>
          <p style={{ fontSize: "13px", color: "#2e2e48", textAlign: "center", marginBottom: "28px" }}>
            Caracteres incluidos por precio mensual similar
          </p>
          <div style={{ borderRadius: "16px", border: "1px solid #1a1a28", overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0d0d17", borderBottom: "1px solid #1a1a28" }}>
                  <th style={{ textAlign: "left", padding: "12px 20px", fontWeight: 600, color: "#3a3a52" }}>Plataforma</th>
                  <th style={{ padding: "12px 20px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$7/mes</th>
                  <th style={{ padding: "12px 20px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$13/mes</th>
                  <th style={{ padding: "12px 20px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$25/mes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "ElevenLabs",  cols: ["30.000 chars", "121.000 chars", "~200.000 chars"] },
                  { name: "Minimax",     cols: ["100.000 chars", "330.000 chars", "~540.000 chars"] },
                  { name: "Fish Audio",  cols: ["~117.000 chars", "~217.000 chars", "~417.000 chars"] },
                ].map((row) => (
                  <tr key={row.name} style={{ borderBottom: "1px solid #1a1a28" }}>
                    <td style={{ padding: "12px 20px", color: "#4a4a65", fontWeight: 500 }}>{row.name}</td>
                    {row.cols.map((c, i) => (
                      <td key={i} style={{ padding: "12px 20px", textAlign: "center", color: "#2e2e48" }}>{c}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background: "rgba(59,130,246,0.08)", borderTop: "1px solid rgba(59,130,246,0.2)" }}>
                  <td style={{ padding: "12px 20px", fontWeight: 700, color: "#93c5fd" }}>⭐ Elite Labs</td>
                  {["200.000 chars", "500.000 chars", "1.000.000 chars"].map((c) => (
                    <td key={c} style={{ padding: "12px 20px", textAlign: "center", fontWeight: 600, color: "#93c5fd" }}>{c}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#93c5fd" }}>
            Hasta 6× más caracteres que la competencia al mismo precio.{" "}
            <span style={{ color: "#3a3a52", fontWeight: 400 }}>Sin límite por generación.</span>
          </p>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "24px", textAlign: "center" }}>
            Preguntas frecuentes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Puedes cancelar desde el portal de facturación. Seguirás teniendo acceso hasta el final del período pagado." },
              { q: "¿Qué pasa con mis caracteres al final del mes?", a: "Los caracteres no utilizados no se acumulan. Cada mes se renuevan al total de tu plan." },
              { q: "¿Puedo cambiar de plan?", a: "Sí, puedes hacer upgrade o downgrade en cualquier momento desde el portal de facturación." },
              { q: "¿Qué formatos acepta la clonación?", a: "WAV, MP3 y M4A. Recomendamos entre 10 y 30 segundos de audio limpio sin ruido." },
            ].map((faq) => (
              <div key={faq.q} style={{ padding: "16px 20px", borderRadius: "12px", border: "1px solid #1a1a28", background: "#0d0d17" }}>
                <p style={{ fontWeight: 600, color: "#e5e7eb", marginBottom: "4px", fontSize: "14px" }}>{faq.q}</p>
                <p style={{ fontSize: "13px", color: "#3a3a52" }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
