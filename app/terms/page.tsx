import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Términos de Uso — Elite Labs" };

const SECTIONS = [
  {
    title: "1. Aceptación de los términos",
    body: `Al acceder o usar Elite Labs (operado por Elite Tube LLC) aceptas estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguna disposición, debes dejar de usar el servicio. Nos reservamos el derecho de actualizar estos términos en cualquier momento, notificándote por email ante cambios relevantes.`,
  },
  {
    title: "2. Descripción del servicio",
    body: `Elite Labs es una plataforma de síntesis de voz con inteligencia artificial que permite generar audio a partir de texto (text-to-speech) y clonar voces a partir de muestras de audio. El servicio opera mediante un sistema de créditos (caracteres).`,
  },
  {
    title: "3. Registro y cuenta",
    body: `Para usar el servicio debes registrarte con una cuenta válida. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades que ocurran bajo tu cuenta. Notifícanos inmediatamente a soporte@elitelabs.es si detectas un uso no autorizado.`,
  },
  {
    title: "4. Uso aceptable",
    items: [
      "Usar el servicio únicamente para fines lícitos y de conformidad con la legislación aplicable.",
      "No generar audio con contenido ilegal, difamatorio, amenazante, de odio, pornográfico o que infrinja derechos de terceros.",
      "No clonar voces de personas sin su consentimiento expreso.",
      "No usar el servicio para suplantar identidades, crear deepfakes con fines fraudulentos o engañar a terceros.",
      "No intentar acceder a partes no autorizadas del sistema, realizar ingeniería inversa o sobrecargar la plataforma.",
      "No revender, sublicenciar ni redistribuir el servicio sin autorización expresa por escrito.",
    ],
  },
  {
    title: "5. Créditos y pagos",
    body: `El servicio se abona mediante la compra de paquetes de caracteres (créditos). Los precios están indicados en la página de precios e incluyen los impuestos aplicables. Los pagos se procesan de forma segura a través de Stripe.`,
  },
  {
    title: "6. Política de reembolsos",
    body: `Los créditos una vez adquiridos no son reembolsables, salvo error técnico imputable a Elite Labs o exigencia legal aplicable. Los créditos no utilizados no tienen fecha de caducidad. Si experimentas un problema técnico que haya consumido créditos indebidamente, contacta con nosotros en soporte@elitelabs.es y lo revisaremos caso a caso.`,
  },
  {
    title: "7. Propiedad intelectual del audio generado",
    body: `El audio generado mediante tu texto y los créditos que has adquirido es de tu propiedad. Puedes usarlo, distribuirlo, monetizarlo y modificarlo sin restricciones, incluyendo proyectos comerciales, siempre que el contenido original cumpla con la sección de uso aceptable. Elite Labs no reclama derechos sobre el audio que generates. Elite Labs sí conserva todos los derechos sobre la plataforma, modelos de IA, interfaz y código fuente.`,
  },
  {
    title: "8. Disponibilidad del servicio",
    body: `Nos esforzamos por mantener el servicio disponible 24/7, pero no garantizamos una disponibilidad ininterrumpida. Podemos realizar mantenimientos programados o afrontar interrupciones no planificadas. No seremos responsables por pérdidas derivadas de la interrupción temporal del servicio.`,
  },
  {
    title: "9. Limitación de responsabilidad",
    body: `En la máxima medida permitida por la ley, Elite Tube LLC no será responsable de daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o la imposibilidad de uso del servicio. Nuestra responsabilidad total no excederá el importe pagado por el usuario en los 3 meses anteriores al evento que generó la reclamación.`,
  },
  {
    title: "10. Privacidad",
    body: `El tratamiento de tus datos personales se rige por nuestra Política de Privacidad, que forma parte integral de estos Términos de Uso.`,
  },
  {
    title: "11. Modificaciones del servicio",
    body: `Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio en cualquier momento. Ante cambios sustanciales que afecten negativamente a usuarios activos, notificaremos con al menos 30 días de antelación por email.`,
  },
  {
    title: "12. Legislación aplicable",
    body: `Estos Términos se rigen por las leyes del Estado de Wyoming (EE. UU.), sin perjuicio de los derechos que la legislación imperativa del país de residencia del usuario pudiera reconocerle. Para cualquier disputa, las partes intentarán resolverla amistosamente antes de acudir a la vía judicial.`,
  },
  {
    title: "13. Contacto",
    body: `Para cualquier consulta sobre estos Términos, escríbenos a soporte@elitelabs.es.`,
  },
];

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-white mb-4">Términos de Uso</h1>
          <p className="text-sm" style={{ color: "#888888" }}>Última actualización: 1 de enero de 2026</p>
        </div>

        <div
          className="p-5 rounded-xl border mb-10 text-sm leading-relaxed"
          style={{ background: "#1a1a1a", borderLeft: "3px solid rgba(255,255,255,0.3)", borderColor: "#222222", color: "#cccccc" }}
        >
          Lee estos términos antes de usar Elite Labs. Al registrarte o usar el servicio, confirmas que los has leído y aceptado.
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
            ¿Tienes preguntas? Escríbenos a{" "}
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
            <Link href="/privacy" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Política de privacidad</Link>
            <Link href="/support" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
