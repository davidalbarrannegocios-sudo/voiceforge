import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Blog — Elite Labs" };

export default function BlogPage() {
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

      <main className="max-w-4xl mx-auto px-6 py-32 flex flex-col items-center justify-center text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
          </svg>
        </div>

        <div
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border"
          style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)", color: "#93c5fd" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Próximamente
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
          El blog de Elite Labs
        </h1>

        <p className="text-lg max-w-xl mx-auto leading-relaxed mb-10" style={{ color: "#9ca3af" }}>
          Pronto publicaremos guías, casos de uso, novedades del producto y todo lo que necesitas saber sobre síntesis de voz con IA.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 w-full max-w-2xl mb-12">
          {[
            { icon: "📖", title: "Tutoriales", desc: "Guías paso a paso para sacar el máximo partido a Elite Labs" },
            { icon: "🚀", title: "Novedades", desc: "Actualizaciones del producto, nuevas funciones y mejoras" },
            { icon: "💡", title: "Casos de uso", desc: "Cómo usan Elite Labs youtubers, podcasters y escritores" },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border p-5 text-left"
              style={{ background: "#12121a", borderColor: "#2a2a3e" }}
            >
              <span className="text-2xl mb-3 block">{icon}</span>
              <p className="font-semibold text-white text-sm mb-1">{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "#8888a8" }}>{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-sm mb-6" style={{ color: "#8888a8" }}>
          ¿Quieres que te avisemos cuando publiquemos el primer artículo?
        </p>
        <a
          href="mailto:support@elitelabs.es?subject=Avísame%20cuando%20abra%20el%20blog"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
        >
          Avísame cuando esté listo
        </a>
      </main>

      <footer className="border-t py-6 px-6" style={{ borderColor: "#2a2a3e" }}>
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
