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
      "200.000 caracteres/mes (x2 con EliteLabs 2)",
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
      "500.000 caracteres/mes (x2 con EliteLabs 2)",
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
      "1.000.000 caracteres/mes (x2 con EliteLabs 2)",
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
      "5.000.000 caracteres/mes (x2 con EliteLabs 2)",
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
          <Link href={isSignedIn ? "/dashboard" : "/"} style={{ fontSize: "13px", color: "#555555", textDecoration: "none" }}>
            {isSignedIn ? "← Dashboard" : "← Inicio"}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "56px 24px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "40px", fontWeight: 800, color: "#fff", marginBottom: "10px", lineHeight: 1.1 }}>
            Elige tu plan
          </h1>
          <p style={{ fontSize: "15px", color: "#555555" }}>
            Cancela cuando quieras · Los caracteres se renuevan cada período
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
          <div style={{ position: "relative", display: "inline-grid", gridTemplateColumns: "1fr 1fr", background: "#111111", border: "1px solid #222222", borderRadius: "10px", padding: "3px" }}>
            {/* Sliding pill */}
            <div style={{ position: "absolute", top: "3px", left: "3px", width: "calc(50% - 3px)", height: "calc(100% - 6px)", background: "#ffffff", borderRadius: "7px", pointerEvents: "none", transition: "transform 0.2s ease", transform: `translateX(${billing === "annual" ? "100%" : "0%"})` }} />
            <button
              onClick={() => setBilling("monthly")}
              style={{ position: "relative", zIndex: 1, padding: "8px 24px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, background: "transparent", color: billing === "monthly" ? "#000000" : "#888888", transition: "color 0.2s ease" }}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling("annual")}
              style={{ position: "relative", zIndex: 1, padding: "8px 24px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, background: "transparent", color: billing === "annual" ? "#000000" : "#888888", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "color 0.2s ease" }}
            >
              Anual
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>−17%</span>
            </button>
          </div>
        </div>

        {/* Plans — 5 col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "60px" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              style={{
                borderRadius: "14px",
                padding: "22px 16px",
                border: "1px solid #222222",
                background: "#111111",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Name + badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{plan.name}</span>
                {plan.popular && (
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "999px", border: "1px solid rgba(59,130,246,0.45)", color: "#93c5fd", background: "transparent", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Popular
                  </span>
                )}
                {plan.key === "enterprise" && (
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.45)", color: "#6ee7b7", background: "transparent", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Equipos
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "14px", lineHeight: 1.4 }}>
                {plan.description}
              </p>

              {/* Price */}
              <div style={{ marginBottom: "16px" }}>
                {plan.free ? (
                  <div>
                    <span style={{ fontSize: "38px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>Gratis</span>
                    <p style={{ fontSize: "11px", color: "transparent", marginTop: "3px", userSelect: "none" }}>·</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                      <span style={{ fontSize: "38px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                        ${billing === "annual" ? annualMonthly(plan.price) : plan.price}
                      </span>
                      <span style={{ fontSize: "12px", color: "#444444", marginLeft: "2px" }}>/mes</span>
                    </div>
                    {billing === "annual" ? (
                      <p style={{ fontSize: "11px", color: "#444444", marginTop: "3px" }}>
                        ${annualTotal(plan.price)} facturado anualmente
                      </p>
                    ) : (
                      <p style={{ fontSize: "11px", color: "transparent", marginTop: "3px", userSelect: "none" }}>·</p>
                    )}
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelect(plan)}
                style={
                  plan.free
                    ? { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #222222", cursor: "pointer", background: "transparent", color: "#6b7280", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
                    : plan.popular
                    ? { width: "100%", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", background: "#ffffff", color: "#000000", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
                    : { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #222222", cursor: "pointer", background: "#1a1a1a", color: "#e5e7eb", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }
                }
              >
                {plan.cta}
              </button>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "7px", flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "12px", color: "#6b6b88" }}>
                    <Check size={11} style={{ color: "#444444", flexShrink: 0, marginTop: "2px" }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Enterprise seats */}
              {plan.key === "enterprise" && (
                <div style={{ marginTop: "14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                      <Users size={12} style={{ color: "#fff", flexShrink: 0 }} /> Seats
                    </span>
                    <span style={{ fontSize: "11px", color: "#555570", textDecoration: "line-through" }}>$5/seat/mes</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: 700, color: "#4ade80" }}>
                      EliteLabs lo patrocina · GRATIS
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Competitor comparison */}
        <div style={{ marginBottom: "56px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "4px", textAlign: "center" }}>
            Comparativa con la competencia
          </h2>
          <p style={{ fontSize: "13px", color: "#2e2e48", textAlign: "center", marginBottom: "20px" }}>
            Caracteres incluidos por precio mensual similar
          </p>
          <div style={{ borderRadius: "14px", border: "1px solid #1a1a28", overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#111111", borderBottom: "1px solid #1a1a28" }}>
                  <th style={{ textAlign: "left", padding: "11px 16px", fontWeight: 600, color: "#444444" }}>Plataforma</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#444444", textAlign: "center" }}>~$7/mes</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#444444", textAlign: "center" }}>~$13/mes</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#444444", textAlign: "center" }}>~$25/mes</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#444444", textAlign: "center" }}>~$110/mes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "ElevenLabs", cols: ["30.000 chars",   "121.000 chars",  "~200.000 chars",  "~2.200.000 chars"] },
                  { name: "Minimax",    cols: ["100.000 chars",  "330.000 chars",  "~540.000 chars",  "~1.800.000 chars"] },
                  { name: "Fish Audio", cols: ["~117.000 chars", "~217.000 chars", "~417.000 chars",  "~1.800.000 chars"] },
                ].map((row) => (
                  <tr key={row.name} style={{ borderBottom: "1px solid #1a1a28" }}>
                    <td style={{ padding: "11px 16px", color: "#555555", fontWeight: 500 }}>{row.name}</td>
                    {row.cols.map((c, i) => (
                      <td key={i} style={{ padding: "11px 10px", textAlign: "center", color: "#2e2e48" }}>{c}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background: "rgba(59,130,246,0.08)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 700, color: "#93c5fd" }}>⭐ Elite Labs</td>
                  {["200.000 chars", "500.000 chars", "1.000.000 chars", "5.000.000 chars"].map((c) => (
                    <td key={c} style={{ padding: "11px 10px", textAlign: "center", fontWeight: 600, color: "#93c5fd" }}>{c}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: "12px", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#93c5fd" }}>
            Hasta 6× más caracteres que la competencia al mismo precio.{" "}
            <span style={{ color: "#444444", fontWeight: 400 }}>Sin límite por generación.</span>
          </p>
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "20px", textAlign: "center" }}>
            Preguntas frecuentes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Puedes cancelar desde el portal de facturación. Seguirás teniendo acceso hasta el final del período pagado." },
              { q: "¿Qué pasa con mis caracteres al final del mes?", a: "Los caracteres no utilizados no se acumulan. Cada mes se renuevan al total de tu plan." },
              { q: "¿Puedo cambiar de plan?", a: "Sí, puedes hacer upgrade o downgrade en cualquier momento desde el portal de facturación." },
              { q: "¿Qué formatos acepta la clonación?", a: "WAV, MP3 y M4A. Recomendamos entre 10 y 30 segundos de audio limpio sin ruido." },
            ].map((faq) => (
              <div key={faq.q} style={{ padding: "14px 18px", borderRadius: "10px", border: "1px solid #1a1a28", background: "#111111" }}>
                <p style={{ fontWeight: 600, color: "#e5e7eb", marginBottom: "3px", fontSize: "13px" }}>{faq.q}</p>
                <p style={{ fontSize: "12px", color: "#444444" }}>{faq.a}</p>
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
