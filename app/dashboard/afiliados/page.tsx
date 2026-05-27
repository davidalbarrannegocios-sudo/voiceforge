"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Link2, DollarSign, BarChart2, X } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Solicitar unirse",
    desc: "Envía tu solicitud con información sobre tu audiencia y espera la aprobación del equipo de Elite Labs.",
  },
  {
    n: "02",
    title: "Obtén tu enlace único",
    desc: "Una vez aprobado, recibirás tu enlace de afiliado personalizado listo para compartir.",
  },
  {
    n: "03",
    title: "Gana dinero",
    desc: "Recibe un 5% en efectivo de cada pago realizado por los usuarios que se registren a través de tu enlace.",
  },
];

const BENEFITS = [
  "5% de comisión por cada referido que pague",
  "Pagos mensuales vía PayPal o transferencia",
  "Panel de seguimiento en tiempo real",
  "Soporte dedicado para afiliados",
  "Sin límite de referidos activos",
  "Acceso anticipado a nuevas funciones",
];

function AplicarModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", platform: "", audience: "", paymentMethod: "paypal" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { background: "#0a0a0f", border: "1px solid #2a2a3e", color: "#e5e7eb", borderRadius: "10px", padding: "10px 14px", width: "100%", fontSize: "14px", outline: "none" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 600, color: "#8888a8", marginBottom: "6px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "28px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
          <X size={18} />
        </button>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Check size={24} style={{ color: "#4ade80" }} />
            </div>
            <h3 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>¡Solicitud enviada!</h3>
            <p style={{ color: "#8888a8", fontSize: "14px", margin: "0 0 24px" }}>
              Revisaremos tu solicitud y te contactaremos en los próximos días.
            </p>
            <button onClick={onClose} style={{ padding: "10px 24px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 700, margin: "0 0 6px" }}>Aplicar al programa</h2>
            <p style={{ color: "#8888a8", fontSize: "13px", margin: "0 0 24px" }}>Cuéntanos sobre tu audiencia y cómo promocionarás Elite Labs</p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Tu nombre" />
              </div>
              <div>
                <label style={labelStyle}>Email de contacto</label>
                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="tu@email.com" />
              </div>
              <div>
                <label style={labelStyle}>Canal o web donde promocionarás</label>
                <input style={inputStyle} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} required placeholder="YouTube, TikTok, blog, etc." />
              </div>
              <div>
                <label style={labelStyle}>Audiencia estimada</label>
                <input style={inputStyle} value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} required placeholder="Ej: 50.000 seguidores en YouTube" />
              </div>
              <div>
                <label style={labelStyle}>Método de pago preferido</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ v: "paypal", l: "PayPal" }, { v: "transfer", l: "Transferencia" }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, paymentMethod: v }))}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 150ms",
                        ...(form.paymentMethod === v
                          ? { background: "rgba(255,255,255,0.1)", color: "#aaaaaa", border: "1px solid rgba(255,255,255,0.2)" }
                          : { background: "transparent", color: "#6b7280", border: "1px solid #2a2a3e" }
                        ),
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ padding: "12px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {loading && (
                  <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Enviar solicitud
              </button>
            </form>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AfiliadosPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (isLoaded && !isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e5e7eb" }}>
      {showModal && <AplicarModal onClose={() => setShowModal(false)} />}

      {/* Nav */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8888a8", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}
           onClick={(e) => { e.preventDefault(); router.back(); }}>
          <ArrowLeft size={16} /> Volver al dashboard
        </a>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "9999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
            <DollarSign size={13} style={{ color: "#aaaaaa" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#aaaaaa" }}>Programa de Afiliados</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, color: "#fff", margin: "0 0 16px", lineHeight: 1.15 }}>
            Únete al programa de<br />
            <span style={{ color: "#ffffff" }}>
              afiliados de Elite Labs
            </span>
          </h1>
          <p style={{ fontSize: "18px", color: "#8888a8", margin: "0 0 36px", maxWidth: "540px", marginInline: "auto" }}>
            Gana un <strong style={{ color: "#aaaaaa" }}>5% de comisión en efectivo</strong> por cada usuario que pague a través de tu enlace
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "14px 36px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "9999px", fontWeight: 700, fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,255,255,0.1)" }}
          >
            Aplicar ahora
          </button>
        </div>

        {/* ── Cómo funciona ── */}
        <div style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "40px" }}>Cómo funciona</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "20px", padding: "28px" }}>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#1e3a5f", marginBottom: "16px" }}>{s.n}</div>
                <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 10px" }}>{s.title}</h3>
                <p style={{ color: "#8888a8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ¿Por qué unirse? ── */}
        <div style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "24px", padding: "40px", marginBottom: "64px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "32px", textAlign: "center" }}>¿Por qué unirse?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {BENEFITS.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Check size={12} style={{ color: "#4ade80" }} />
                </div>
                <p style={{ color: "#d1d5db", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats banner ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "64px" }}>
          {[
            { Icon: DollarSign, value: "5%", label: "Comisión en efectivo" },
            { Icon: BarChart2, value: "∞", label: "Sin límite de referidos" },
            { Icon: Link2, value: "30 días", label: "Duración de cookie" },
          ].map(({ Icon, value, label }) => (
            <div key={label} style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <Icon size={24} style={{ color: "#aaaaaa", margin: "0 auto 10px" }} />
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{value}</p>
              <p style={{ fontSize: "12px", color: "#8888a8", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{ textAlign: "center", background: "linear-gradient(135deg, #0f1a2e 0%, #12121a 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "56px 32px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>Comienza a ganar hoy</h2>
          <p style={{ color: "#8888a8", fontSize: "16px", margin: "0 0 32px" }}>
            Únete a nuestro programa y empieza a ganar comisiones por cada usuario que refieras
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "14px 40px", background: "#ffffff", color: "#000000", border: "none", borderRadius: "9999px", fontWeight: 700, fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,255,255,0.1)" }}
          >
            Comienza a ganar →
          </button>
        </div>

      </div>
    </div>
  );
}
