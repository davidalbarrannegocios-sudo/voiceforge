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

  const freePlan = PLANS[0];
  const paidPlans = PLANS.slice(1);

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

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "56px 24px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "40px", fontWeight: 800, color: "#fff", marginBottom: "10px", lineHeight: 1.1 }}>
            Elige tu plan
          </h1>
          <p style={{ fontSize: "15px", color: "#4a4a65" }}>
            Cancela cuando quieras · Los caracteres se renuevan cada período
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
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
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>−17%</span>
            </button>
          </div>
        </div>

        {/* Plans — free card left + paid plans right */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "60px", alignItems: "start" }}>

          {/* Free / Nivel gratuito — narrower card */}
          <div style={{
            width: "196px",
            flexShrink: 0,
            borderRadius: "16px",
            padding: "22px 18px",
            border: "1px solid #2a2a3e",
            background: "#0d0d17",
            display: "flex",
            flexDirection: "column",
          }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#555570", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px" }}>
              Nivel gratuito
            </p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#9ca3af", marginBottom: "6px" }}>Gratis</p>
            <p style={{ fontSize: "12px", color: "#3a3a52", marginBottom: "18px", lineHeight: 1.45 }}>
              {freePlan.description}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {freePlan.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "12px", color: "#4a4a65" }}>
                  <Check size={11} style={{ color: "#3a3a52", flexShrink: 0, marginTop: "2px" }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelect(freePlan)}
              style={{ width: "100%", padding: "10px", borderRadius: "9px", border: "1px solid #2a2a3e", background: "transparent", color: "#6b7280", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              Empezar gratis
            </button>
          </div>

          {/* Paid plans — equal columns, same height */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", flex: 1, alignItems: "stretch" }}>
            {paidPlans.map((plan) => (
              <div
                key={plan.key}
                style={{
                  borderRadius: "16px",
                  padding: "24px 20px",
                  border: "1px solid #1e1e2e",
                  background: "#0d0d17",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Name + inline badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>{plan.name}</span>
                  {plan.popular && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>
                      Popular
                    </span>
                  )}
                  {plan.key === "enterprise" && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: "rgba(16,185,129,0.2)", color: "#4ade80" }}>
                      Equipos
                    </span>
                  )}
                </div>

                {/* Price block */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                    <span style={{ fontSize: "52px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                      ${billing === "annual" ? annualMonthly(plan.price) : plan.price}
                    </span>
                    <span style={{ fontSize: "12px", color: "#3a3a52", marginLeft: "2px" }}>/mes</span>
                  </div>
                  {billing === "annual" && (
                    <p style={{ fontSize: "11px", color: "#22c55e", marginTop: "3px" }}>
                      ${annualTotal(plan.price)} facturado anualmente
                    </p>
                  )}
                  <p style={{ fontSize: "12px", color: "#3a3a52", marginTop: "4px" }}>
                    {plan.characters.toLocaleString("es-ES")} caracteres/mes
                  </p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelect(plan)}
                  style={
                    plan.key === "enterprise"
                      ? { width: "100%", padding: "11px", borderRadius: "9px", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: "13px", fontWeight: 600, marginBottom: "18px" }
                      : { width: "100%", padding: "11px", borderRadius: "9px", border: "1px solid #2a2a3e", cursor: "pointer", background: "#111118", color: "#e5e7eb", fontSize: "13px", fontWeight: 600, marginBottom: "18px" }
                      : { width: "100%", padding: "11px", borderRadius: "9px", border: "1px solid #2a2a3e", cursor: "pointer", background: "#111118", color: "#e5e7eb", fontSize: "13px", fontWeight: 600, marginBottom: "18px" }
                  }
                >
                  {plan.cta}
                </button>

                {/* Features */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "9px", flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#6b6b88" }}>
                      <Check size={12} style={{ color: plan.key === "enterprise" ? "#10b981" : "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Enterprise seats */}
                {plan.key === "enterprise" && (
                  <div style={{ marginTop: "16px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                        <Users size={13} style={{ color: "#fff", flexShrink: 0 }} /> Seats
                      </span>
                      <span style={{ fontSize: "11px", color: "#555570", textDecoration: "line-through" }}>$5/seat/mes</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", borderRadius: "8px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "#4ade80" }}>
                        EliteLabs lo patrocina · GRATIS
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
                <tr style={{ background: "#0d0d17", borderBottom: "1px solid #1a1a28" }}>
                  <th style={{ textAlign: "left", padding: "11px 16px", fontWeight: 600, color: "#3a3a52" }}>Plataforma</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$7/mes</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$13/mes</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$25/mes</th>
                  <th style={{ padding: "11px 10px", fontWeight: 600, color: "#3a3a52", textAlign: "center" }}>~$110/mes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "ElevenLabs", cols: ["30.000 chars",   "121.000 chars",  "~200.000 chars",  "~2.200.000 chars"] },
                  { name: "Minimax",    cols: ["100.000 chars",  "330.000 chars",  "~540.000 chars",  "~1.800.000 chars"] },
                  { name: "Fish Audio", cols: ["~117.000 chars", "~217.000 chars", "~417.000 chars",  "~1.800.000 chars"] },
                ].map((row) => (
                  <tr key={row.name} style={{ borderBottom: "1px solid #1a1a28" }}>
                    <td style={{ padding: "11px 16px", color: "#4a4a65", fontWeight: 500 }}>{row.name}</td>
                    {row.cols.map((c, i) => (
                      <td key={i} style={{ padding: "11px 10px", textAlign: "center", color: "#2e2e48" }}>{c}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ background: "rgba(59,130,246,0.08)", borderTop: "1px solid rgba(59,130,246,0.2)" }}>
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
            <span style={{ color: "#3a3a52", fontWeight: 400 }}>Sin límite por generación.</span>
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
              <div key={faq.q} style={{ padding: "14px 18px", borderRadius: "10px", border: "1px solid #1a1a28", background: "#0d0d17" }}>
                <p style={{ fontWeight: 600, color: "#e5e7eb", marginBottom: "3px", fontSize: "13px" }}>{faq.q}</p>
                <p style={{ fontSize: "12px", color: "#3a3a52" }}>{faq.a}</p>
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
