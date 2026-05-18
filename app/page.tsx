import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/nextjs";

const features = [
  {
    icon: "🎙️",
    title: "Voces naturales",
    items: [
      "Control de expresividad",
      "80+ idiomas soportados",
      "Cadencia y entonación realistas",
    ],
  },
  {
    icon: "🔁",
    title: "Clonación de voz",
    items: [
      "Solo 10 segundos de audio",
      "Resultados instantáneos",
      "Preserva el timbre único",
    ],
  },
  {
    icon: "⚡",
    title: "GPU bajo demanda",
    items: [
      "Sin esperas de servidor",
      "Escala automáticamente",
      "Descarga directa en MP3",
    ],
  },
];

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: 9,
    credits: 100,
    minutes: "~50",
    popular: false,
    features: [
      "100 créditos",
      "~50 min de audio",
      "Voces del sistema",
      "Clonación de voz",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    credits: 400,
    minutes: "~200",
    popular: true,
    features: [
      "400 créditos",
      "~200 min de audio",
      "Voces del sistema",
      "Clonación de voz",
      "Historial completo",
    ],
  },
  {
    key: "studio",
    name: "Studio",
    price: 79,
    credits: 1200,
    minutes: "~600",
    popular: false,
    features: [
      "1200 créditos",
      "~600 min de audio",
      "Voces del sistema",
      "Clonación de voz",
      "Historial completo",
      "Prioridad de GPU",
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-purple-400 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "#2a2a3e",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
              }}
            >
              V
            </div>
            <span className="font-bold text-lg text-white">VoiceForge</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Precios
            </Link>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10">
                  Iniciar sesión
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                  }}
                >
                  Empezar gratis
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                }}
              >
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-24 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border"
              style={{
                background: "rgba(124,58,237,0.1)",
                borderColor: "rgba(124,58,237,0.3)",
                color: "#a78bfa",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Powered by Chatterbox · MIT License
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Narración con IA de{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                calidad profesional
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Genera voces realistas con IA avanzada. Clona cualquier voz con
              solo 10 segundos de audio y produce narraciones de estudio desde
              tu navegador.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button
                    className="text-base font-semibold text-white px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                      boxShadow: "0 8px 30px rgba(124,58,237,0.35)",
                    }}
                  >
                    Empezar gratis →
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="text-base font-semibold text-white px-8 py-4 rounded-xl transition-all hover:-translate-y-1 text-center"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                    boxShadow: "0 8px 30px rgba(124,58,237,0.35)",
                  }}
                >
                  Ir al Dashboard →
                </Link>
              </Show>
              <Link
                href="/pricing"
                className="text-base font-semibold px-8 py-4 rounded-xl border transition-all hover:border-purple-500/50 hover:text-white text-gray-300 text-center"
                style={{ borderColor: "#2a2a3e", background: "#12121a" }}
              >
                Ver precios
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border transition-all hover:border-purple-500/30"
                  style={{ background: "#12121a", borderColor: "#2a2a3e" }}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <ul className="space-y-2">
                    {feature.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-gray-400"
                      >
                        <CheckIcon />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pb-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">
                Precios simples y transparentes
              </h2>
              <p className="text-gray-400">
                1 crédito ≈ 500 caracteres de texto · Sin suscripciones · Paga
                solo lo que usas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  className="relative p-6 rounded-2xl border flex flex-col"
                  style={{
                    background: plan.popular
                      ? "rgba(124,58,237,0.08)"
                      : "#12121a",
                    borderColor: plan.popular ? "#7C3AED" : "#2a2a3e",
                  }}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-4 py-1 rounded-full whitespace-nowrap"
                      style={{
                        background:
                          "linear-gradient(135deg, #7C3AED, #3B82F6)",
                      }}
                    >
                      MÁS POPULAR
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-white">
                        {plan.price}€
                      </span>
                      <span className="text-gray-400 text-sm">pago único</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {plan.credits} créditos · {plan.minutes} min de audio
                    </p>
                  </div>

                  <ul className="space-y-2 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Show when="signed-out">
                    <SignUpButton mode="modal">
                      <button
                        className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:-translate-y-0.5"
                        style={
                          plan.popular
                            ? {
                                background:
                                  "linear-gradient(135deg, #7C3AED, #6D28D9)",
                                color: "white",
                                boxShadow:
                                  "0 4px 15px rgba(124,58,237,0.3)",
                              }
                            : {
                                background: "#1a1a2e",
                                color: "#d1d5db",
                                border: "1px solid #2a2a3e",
                              }
                        }
                      >
                        Comprar {plan.name}
                      </button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <Link
                      href={`/pricing?plan=${plan.key}`}
                      className="block w-full py-3 rounded-lg font-semibold text-sm text-center transition-all hover:-translate-y-0.5"
                      style={
                        plan.popular
                          ? {
                              background:
                                "linear-gradient(135deg, #7C3AED, #6D28D9)",
                              color: "white",
                              boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
                            }
                          : {
                              background: "#1a1a2e",
                              color: "#d1d5db",
                              border: "1px solid #2a2a3e",
                            }
                      }
                    >
                      Comprar {plan.name}
                    </Link>
                  </Show>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4" style={{ borderColor: "#2a2a3e" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2025 VoiceForge. Powered by{" "}
            <span className="text-purple-400">Chatterbox TTS</span> (MIT
            License)
          </p>
          <div className="flex gap-6">
            <Link
              href="/pricing"
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Precios
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
