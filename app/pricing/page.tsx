"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Check, Users } from "lucide-react";
import { PaymentModal, type BillingPlan } from "@/app/dashboard/PaymentModal";

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
    characters: 5_000,
    popular: false,
    free: true,
    cta: "Empezar gratis",
    features: [
      "5.000 caracteres al registrarte",
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
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Para profesionales y equipos",
    price: 110,
    characters: 5_000_000,
    popular: false,
    free: false,
    cta: "Suscribirse",
    features: [
      "5.000.000 caracteres/mes",
      "Voces clonadas ilimitadas",
      "Transcripciones y traducciones ilimitadas",
      "Traducción de audio +10%",
      "Generación prioritaria",
      "Soporte preferente",
      "Audios disponibles 90 días",
    ],
  },
];

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [activePlan, setActivePlan] = useState<BillingPlan | null>(null);

  useEffect(() => {
    const planKey = searchParams.get("plan");
    if (planKey && isSignedIn) {
      const found = PLANS.find((p) => p.key === planKey);
      if (found && !found.free) setActivePlan(found);
    }
  }, [isSignedIn, searchParams]);

  function handleSelect(plan: Plan) {
    if (plan.free) {
      router.push("/sign-up");
      return;
    }
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/pricing?plan=${plan.key}`);
      return;
    }
    setActivePlan(plan);
  }

  function annualMonthly(price: number) {
    return Math.round(price * 0.83 * 10) / 10;
  }
  function annualTotal(price: number) {
    return Math.round(annualMonthly(price) * 12);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <header style={{ borderBottom: "1px solid #1a1a28", padding: "0 16px", height: "60px", display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: "1536px", width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} className="rounded-lg" />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Elite Labs</span>
          </Link>
          <Link href={isSignedIn ? "/dashboard" : "/"} style={{ fontSize: "13px", color: "#4a4a65", textDecoration: "none" }}>
            {isSignedIn ? "← Dashboard" : "← Inicio"}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "1536px", margin: "0 auto", padding: "64px 16px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "42px", fontWeight: 800, color: "#fff", marginBottom: "12px", lineHeight: 1.1 }}>
            Elige tu plan
          </h1>
          <p style={{ fontSize: "16px", color: "#4a4a65", marginBottom: "6px" }}>
            Cancela cuando quieras. Los caracteres se renuevan cada período.
          </p>
          <p style={{ fontSize: "13px", color: "#2e2e48" }}>
            Los caracteres se descuentan exactamente según el texto generado
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "40px" }}>
          <div style={{ display: "inline-flex", background: "#0d0d17", border: "1px solid #1e1e2e", borderRadius: "10px", padding: "3px", gap: "2px" }}>
            <button
              onClick={() => setBilling("monthly")}
              style={{ padding: "8px 24px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, background: billing === "monthly" ? "#1a1a2e" : "transparent", color: billing === "monthly" ? "#e5e7eb" : "#4a4a65", transition: "all 0.15s" }}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling("annual")}
              style={{ padding: "8px 24px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, background: billing === "annual" ? "#1a1a2e" : "transparent", color: billing === "annual" ? "#e5e7eb" : "#4a4a65", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s" }}
            >
              Anual
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e", letterSpacing: "0.03em" }}>
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px", marginBottom: "72px" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              style={{
                position: "relative",
                borderRadius: "16px",
                padding: "28px 22px",
                display: "flex",
                flexDirection: "column",
                border: plan.key === "enterprise" ? "1px solid #10b981" : plan.popular ? "1px solid #3b82f6" : plan.free ? "1px solid #2a2a3e" : "1px solid #1e1e2e",
                background: plan.key === "enterprise" ? "rgba(16,185,129,0.07)" : plan.popular ? "rgba(30,58,138,0.18)" : plan.free ? "#111118" : "#0d0d17",
              }}
            >
              {plan.popular && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                  MÁS POPULAR
                </div>
              )}
              {plan.key === "enterprise" && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                  PROFESIONAL
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
                    <span style={{ fontSize: "36px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                      ${billing === "annual" ? annualMonthly(plan.price) : plan.price}
                    </span>
                    <span style={{ fontSize: "13px", color: "#3a3a52" }}>/mes</span>
                  </div>
                  {billing === "annual" ? (
                    <p style={{ fontSize: "12px", color: "#22c55e", marginBottom: "4px" }}>
                      Facturado ${annualTotal(plan.price)}/año
                    </p>
                  ) : null}
                  <p style={{ fontSize: "13px", color: "#3a3a52", marginBottom: "22px" }}>
                    {plan.characters.toLocaleString("es-ES")} caracteres/mes
                  </p>
                </>
              )}

              <button
                onClick={() => handleSelect(plan)}
                style={
                  plan.key === "enterprise"
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "22px", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }
                    : plan.popular
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "22px", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }
                    : plan.free
                    ? { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #2a2a3e", cursor: "pointer", background: "transparent", color: "#6b7280", fontSize: "14px", fontWeight: 600, marginBottom: "22px" }
                    : { width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #2a2a3e", cursor: "pointer", background: "transparent", color: "#d1d5db", fontSize: "14px", fontWeight: 600, marginBottom: "22px" }
                }
              >
                {plan.cta}
              </button>

              <div style={{ height: "1px", background: plan.key === "enterprise" ? "rgba(16,185,129,0.2)" : plan.popular ? "rgba(59,130,246,0.2)" : "#1a1a28", marginBottom: "18px" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: plan.free ? "#4a4a65" : "#6b6b88" }}>
                    <Check size={13} style={{ color: plan.key === "enterprise" ? "#10b981" : plan.free ? "#4a4a65" : "#3b82f6", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.key === "enterprise" && (
                <div style={{ marginTop: "16px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                      <Users size={14} style={{ color: "#fff", flexShrink: 0 }} /> Seats
                    </span>
                    <span style={{ fontSize: "12px", color: "#555570", textDecoration: "line-through" }}>$5/seat/mes</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>
                      EliteLabs lo patrocina · GRATIS
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Competitor comparison */}
        <div style={{ maxWidth: "1536px", margin: "0 auto 64px" }}>
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
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#3a3a52" }}>Plataforma</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$7/mes</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$13/mes</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$25/mes</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$110/mes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "ElevenLabs", cols: ["30.000 chars",    "121.000 chars",  "~200.000 chars",   "~2.200.000 chars"] },
                  { name: "Minimax",    cols: ["100.000 chars",   "330.000 chars",  "~540.000 chars",   "~1.800.000 chars"] },
                  { name: "Fish Audio", cols: ["~117.000 chars",  "~217.000 chars", "~417.000 chars",   "~1.800.000 chars"] },
                ].map((row) => (
                  <tr key={row.name} style={{ borderBottom: "1px solid #1a1a28" }}>
                    <td style={{ padding: "12px 16px", color: "#4a4a65", fontWeight: 500 }}>{row.name}</td>
                    {row.cols.map((c, i) => (
                      <td key={i} style={{ padding: "12px 10px", textAlign: "center", color: "#2e2e48" }}>{c}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background: "rgba(59,130,246,0.08)", borderTop: "1px solid rgba(59,130,246,0.2)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#93c5fd" }}>⭐ Elite Labs</td>
                  {["200.000 chars", "500.000 chars", "1.000.000 chars", "5.000.000 chars"].map((c) => (
                    <td key={c} style={{ padding: "12px 10px", textAlign: "center", fontWeight: 600, color: "#93c5fd" }}>{c}</td>
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
        <div style={{ maxWidth: "1536px", margin: "0 auto" }}>
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

      {activePlan && (
        <PaymentModal
          plan={activePlan}
          billing={billing}
          onClose={() => setActivePlan(null)}
          onSuccess={() => {
            setActivePlan(null);
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}
