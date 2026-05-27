"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

const FAQ = [
  {
    q: "¿Cómo funcionan los créditos (caracteres)?",
    a: "Cada carácter de texto que introduces para generar audio consume un crédito. Por ejemplo, un texto de 500 caracteres consume 500 créditos. Los créditos no tienen fecha de caducidad: son tuyos para siempre.",
  },
  {
    q: "¿Puedo obtener un reembolso de los créditos que no he usado?",
    a: "Los créditos ya adquiridos no son reembolsables, salvo error técnico imputable a Elite Labs. Si crees que hubo un error, escríbenos a soporte@elitelabs.es y lo revisamos.",
  },
  {
    q: "¿Cómo funciona la clonación de voz?",
    a: "Ve a 'Mis voces' en el dashboard y sube una muestra de audio (WAV, MP3 o M4A) de al menos 10 segundos con buena calidad de grabación. Nuestro sistema crea automáticamente un modelo de voz clonado que puedes usar en todas tus generaciones.",
  },
  {
    q: "¿En qué formato se descarga el audio generado?",
    a: "El audio se genera en formato MP3 a 128 kbps, compatible con todas las plataformas de distribución de contenido.",
  },
  {
    q: "¿Cuánto tiempo tarda en generarse un audio?",
    a: "La mayoría de textos cortos (menos de 500 caracteres) se generan en 5-15 segundos. Textos largos pueden tardar 1-3 minutos dependiendo de la longitud y la carga del servidor.",
  },
  {
    q: "¿Puedo usar el audio generado en proyectos comerciales?",
    a: "Sí. El audio que generates es 100% tuyo. Puedes usarlo en YouTube, podcasts, audiolibros, publicidad y cualquier otro proyecto comercial sin pagar royalties adicionales.",
  },
  {
    q: "¿Cuáles son los idiomas disponibles?",
    a: "A través de nuestra biblioteca de voces públicas, soportamos más de 80 idiomas: español, inglés, francés, alemán, portugués, chino, japonés, árabe y muchos más.",
  },
  {
    q: "¿Cómo cancelo mi cuenta?",
    a: "Puedes eliminar tu cuenta desde la configuración de Clerk (icono de usuario en el dashboard). Todos tus datos y audios se eliminarán en un plazo de 30 días. Los créditos no son reembolsables al cancelar.",
  },
  {
    q: "El audio generado suena robótico, ¿qué hago?",
    a: "Prueba a usar puntuación natural en tu texto (comas, puntos, signos de exclamación) para ayudar al modelo a entonar correctamente. También puedes ajustar la velocidad y el volumen en los controles de audio del panel de ajustes.",
  },
  {
    q: "¿Mis datos y audios son privados?",
    a: "Sí. Tus generaciones son privadas y solo tú tienes acceso a ellas. No compartimos tu contenido con terceros ni lo usamos para entrenar modelos sin tu consentimiento. Consulta nuestra Política de Privacidad para más detalles.",
  },
];

function FaqItem({ item, open, onToggle }: { item: typeof FAQ[0]; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#111111", borderColor: "#222222" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ color: open ? "#93c5fd" : "white" }}
      >
        <span className="font-medium pr-4 text-sm">{item.q}</span>
        <ChevronDown
          size={17}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none", color: "#888888" }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t" style={{ borderColor: "#222222" }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "white" }}>
      <header className="border-b sticky top-0 z-10" style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderColor: "#222222" }}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} style={{ height: "28px", width: "auto", objectFit: "contain" }} className="rounded-lg" />
            <span className="font-bold text-white">Elite Labs</span>
          </Link>
          <Link href="/" className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>Ayuda</p>
          <h1 className="text-4xl font-bold text-white mb-4">Centro de soporte</h1>
          <p className="text-base" style={{ color: "#9ca3af" }}>
            Encuentra respuestas rápidas o contáctanos directamente.
          </p>
        </div>

        {/* Contact card */}
        <div
          className="rounded-2xl border p-7 mb-14 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: "#111111", borderColor: "#222222" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-white mb-1">Contacto por email</p>
            <p className="text-sm mb-3" style={{ color: "#9ca3af" }}>
              Nuestro equipo responde en menos de 24 horas en días laborables.
            </p>
            <a
              href="mailto:soporte@elitelabs.es"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              soporte@elitelabs.es
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-14">
          {[
            { label: "Empezar con Elite Labs", href: "/dashboard", desc: "Accede al dashboard" },
            { label: "Ver planes y precios", href: "/pricing", desc: "Compara los paquetes de créditos" },
            { label: "Política de privacidad", href: "/privacy", desc: "Cómo gestionamos tus datos" },
            { label: "Términos de uso", href: "/terms", desc: "Condiciones del servicio" },
          ].map(({ label, href, desc }) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border p-4 transition-all hover:border-white/30 group"
              style={{ background: "#111111", borderColor: "#222222" }}
            >
              <p className="text-sm font-medium text-white mb-0.5 group-hover:text-white transition-colors">{label}</p>
              <p className="text-xs" style={{ color: "#888888" }}>{desc}</p>
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>

        <div className="mt-12 p-5 rounded-xl border text-center" style={{ background: "#111111", borderColor: "#222222" }}>
          <p className="text-sm text-white font-medium mb-1">¿No encuentras lo que buscas?</p>
          <p className="text-xs mb-4" style={{ color: "#888888" }}>Escríbenos y te ayudamos personalmente.</p>
          <a
            href="mailto:soporte@elitelabs.es"
            className="text-sm font-semibold transition-colors hover:text-blue-300"
            style={{ color: "#93c5fd" }}
          >
            soporte@elitelabs.es →
          </a>
        </div>
      </main>

      <footer className="border-t mt-16 py-6 px-6" style={{ borderColor: "#222222" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "#555570" }}>© 2026 Elite Tube LLC. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Política de privacidad</Link>
            <Link href="/terms" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Términos de uso</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
