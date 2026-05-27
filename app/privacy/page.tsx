import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Política de Privacidad — Elite Labs" };

const SECTIONS = [
  {
    title: "1. Quiénes somos",
    body: `Elite Tube LLC es la empresa responsable de Elite Labs, una plataforma de síntesis de voz con inteligencia artificial. Domicilio social: Estado de Wyoming, Estados Unidos. Puede contactarnos en soporte@elitelabs.es.`,
  },
  {
    title: "2. Datos que recopilamos",
    items: [
      "Datos de cuenta: nombre, dirección de correo electrónico y foto de perfil, facilitados durante el registro mediante Clerk.",
      "Datos de uso: textos introducidos para generar audio, historial de generaciones, créditos consumidos y configuración de prosodía.",
      "Datos de pago: procesados exclusivamente por Stripe. Elite Labs no almacena números de tarjeta ni datos bancarios.",
      "Datos técnicos: dirección IP, tipo de navegador, sistema operativo y páginas visitadas, recogidos de forma automática.",
      "Cookies: cookies de sesión necesarias para la autenticación (Clerk) y cookies analíticas para medir el uso del servicio.",
    ],
  },
  {
    title: "3. Cómo usamos tus datos",
    items: [
      "Prestar el servicio de generación y clonación de voz.",
      "Gestionar tu cuenta, créditos y transacciones.",
      "Enviarte comunicaciones transaccionales (confirmaciones de compra, notificaciones de cuenta).",
      "Mejorar nuestros modelos de IA y la calidad del servicio mediante datos anonimizados.",
      "Cumplir con obligaciones legales y prevenir fraudes.",
    ],
  },
  {
    title: "4. Base legal del tratamiento",
    body: `El tratamiento de tus datos se basa en: (a) la ejecución del contrato de servicio aceptado al registrarte; (b) tu consentimiento explícito cuando corresponda; (c) nuestro interés legítimo en mejorar el servicio y garantizar la seguridad; y (d) el cumplimiento de obligaciones legales.`,
  },
  {
    title: "5. Cookies",
    body: `Usamos cookies estrictamente necesarias para mantener tu sesión autenticada y cookies analíticas (sin información personal identificable) para entender cómo se usa la plataforma. Puedes desactivar las cookies analíticas desde la configuración de tu navegador sin afectar a la funcionalidad del servicio.`,
  },
  {
    title: "6. Compartición de datos",
    body: `No vendemos tus datos a terceros. Compartimos información exclusivamente con proveedores de servicios esenciales: Clerk (autenticación), Stripe (pagos), Cloudflare R2 (almacenamiento de audio) y Fish Audio (síntesis de voz). Todos los proveedores están sujetos a acuerdos de protección de datos adecuados.`,
  },
  {
    title: "7. Retención de datos",
    body: `Conservamos tus datos mientras tu cuenta esté activa. Los audios generados se almacenan durante 90 días y después se eliminan automáticamente. Puedes solicitar la eliminación de tu cuenta en cualquier momento escribiendo a soporte@elitelabs.es.`,
  },
  {
    title: "8. Tus derechos",
    items: [
      "Acceso: solicitar una copia de los datos que tenemos sobre ti.",
      "Rectificación: corregir datos inexactos o incompletos.",
      "Supresión: pedir la eliminación de tus datos personales.",
      "Portabilidad: recibir tus datos en formato estructurado y legible por máquina.",
      "Oposición: oponerte al tratamiento basado en interés legítimo.",
      "Limitación: solicitar que restrinjamos el tratamiento de tus datos.",
    ],
  },
  {
    title: "9. Seguridad",
    body: `Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado TLS en tránsito, almacenamiento cifrado en reposo, acceso restringido por roles y auditorías periódicas de seguridad.`,
  },
  {
    title: "10. Cambios en esta política",
    body: `Podemos actualizar esta política ocasionalmente. Te notificaremos por email ante cambios relevantes. La fecha de "Última actualización" al pie de esta página indica la versión vigente.`,
  },
  {
    title: "11. Contacto",
    body: `Para cualquier consulta sobre privacidad, escríbenos a soporte@elitelabs.es. Nos comprometemos a responder en un plazo de 30 días.`,
  },
];

export default function PrivacyPage() {
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
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>Legal</p>
          <h1 className="text-4xl font-bold text-white mb-4">Política de Privacidad</h1>
          <p className="text-sm" style={{ color: "#888888" }}>Última actualización: 1 de enero de 2026</p>
        </div>

        <div
          className="p-5 rounded-xl border mb-10 text-sm leading-relaxed"
          style={{ background: "#1a1a1a", borderLeft: "3px solid rgba(255,255,255,0.3)", borderColor: "#222222", color: "#cccccc" }}
        >
          En Elite Labs nos tomamos tu privacidad en serio. Esta política explica qué datos recopilamos, por qué y cómo los protegemos.
        </div>

        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-white mb-3">{s.title}</h2>
              {s.body && (
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{s.body}</p>
              )}
              {s.items && (
                <ul className="space-y-2 mt-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm" style={{ color: "#9ca3af" }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ffffff" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t" style={{ borderColor: "#222222" }}>
          <p className="text-sm" style={{ color: "#888888" }}>
            ¿Preguntas? Escríbenos a{" "}
            <a href="mailto:soporte@elitelabs.es" className="text-gray-300 hover:text-gray-300 transition-colors">
              soporte@elitelabs.es
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t mt-16 py-6 px-6" style={{ borderColor: "#222222" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "#555570" }}>© 2026 Elite Tube LLC. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Términos de uso</Link>
            <Link href="/support" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
