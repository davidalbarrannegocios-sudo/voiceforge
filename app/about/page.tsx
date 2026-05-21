import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Sobre nosotros — Elite Labs" };

const VALUES = [
  {
    title: "Accesibilidad",
    desc: "Creemos que la síntesis de voz profesional no debe estar reservada a grandes estudios. Cualquier creador, independientemente de su presupuesto, merece acceso a voces de calidad.",
  },
  {
    title: "Calidad sin concesiones",
    desc: "Usamos los modelos de síntesis más avanzados del mercado para garantizar que cada audio suene natural, expresivo y profesional.",
  },
  {
    title: "Transparencia",
    desc: "Sin suscripciones ocultas, sin caducidad de créditos, sin sorpresas. Pagas lo que usas y los créditos son tuyos para siempre.",
  },
  {
    title: "Privacidad primero",
    desc: "Tu voz y tus textos son tuyos. No vendemos datos, no entrenamos modelos con tus audios sin consentimiento y aplicamos cifrado de extremo a extremo.",
  },
];

const STATS = [
  { value: "2.000.000+", label: "Voces disponibles" },
  { value: "80+", label: "Idiomas soportados" },
  { value: "99.9%", label: "Uptime del servicio" },
  { value: "< 10 seg", label: "Clonación de voz" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "white" }}>
      <header className="border-b sticky top-0 z-10" style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderColor: "#2a2a3e" }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} style={{ height: "28px", width: "auto", objectFit: "contain" }} className="rounded-lg" />
            <span className="font-bold text-white">Elite Labs</span>
          </Link>
          <Link href="/" className="text-sm transition-colors hover:text-white" style={{ color: "#8888a8" }}>
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">

        {/* Hero */}
        <div className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border"
            style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)", color: "#93c5fd" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Elite Tube LLC · nombre comercial Elite Labs
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Democratizando la síntesis de voz para{" "}
            <span style={{ background: "linear-gradient(135deg,#3b82f6,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              creadores hispanohablantes
            </span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#9ca3af" }}>
            Nuestro objetivo es sencillo: que cualquier youtuber, podcaster, escritor o empresario pueda generar audio de calidad profesional en segundos, sin estudios de grabación ni equipos costosos.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl border p-5 text-center"
              style={{ background: "#12121a", borderColor: "#2a2a3e" }}
            >
              <p className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</p>
              <p className="text-xs" style={{ color: "#8888a8" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="grid md:grid-cols-2 gap-10 mb-20 items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Nuestra misión</h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#9ca3af" }}>
              El mercado de herramientas de IA para creadores de contenido ha estado dominado por plataformas en inglés pensadas para audiencias anglófonas. Los creadores hispanohablantes merecen herramientas de primera clase en su idioma, con soporte real y precios justos.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
              Desde Elite Labs, construimos la plataforma que nos habría gustado tener: simple, potente y sin fricciones. Sin suscripciones que se olvidan activas, sin créditos que caducan, sin interfaces confusas.
            </p>
          </div>
          <div
            className="rounded-2xl border p-8 flex flex-col items-center text-center"
            style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.08),rgba(59,130,246,0.03))", borderColor: "rgba(59,130,246,0.2)" }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.15)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-white mb-2">Voz. Sin límites.</p>
            <p className="text-sm" style={{ color: "#8888a8" }}>Tu creatividad, amplificada por IA.</p>
          </div>
        </div>

        {/* Technology */}
        <div className="rounded-2xl border p-8 mb-20" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
          <h2 className="text-2xl font-bold text-white mb-3">Tecnología</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "#9ca3af" }}>
            Elite Labs está impulsado por <span className="text-white font-medium">Fish Audio</span>, uno de los motores de síntesis de voz más avanzados del mundo. Fish Audio ofrece más de 2 millones de voces públicas en más de 80 idiomas y una tecnología de clonación de voz que necesita tan solo 10 segundos de audio de referencia para crear un clon fiel de cualquier voz.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Motor TTS", value: "Fish Audio API" },
              { label: "Infraestructura", value: "Cloudflare R2 + Railway" },
              { label: "Autenticación", value: "Clerk" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: "#0d0d17", border: "1px solid #2a2a3e" }}>
                <p className="text-xs mb-1" style={{ color: "#555570" }}>{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Nuestros valores</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map(({ title, desc }) => (
              <div key={title} className="rounded-2xl border p-6" style={{ background: "#12121a", borderColor: "#2a2a3e" }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#3b82f6" }} />
                  <h3 className="font-semibold text-white">{title}</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">¿Listo para empezar?</h2>
          <p className="text-sm mb-6" style={{ color: "#8888a8" }}>Sin tarjeta de crédito. Explora las voces gratis.</p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
          >
            Ir al Dashboard →
          </Link>
        </div>
      </main>

      <footer className="border-t mt-16 py-6 px-6" style={{ borderColor: "#2a2a3e" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "#555570" }}>© 2026 Elite Tube LLC. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Política de privacidad</Link>
            <Link href="/terms" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Términos de uso</Link>
            <Link href="/support" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
