"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useLang } from "@/app/dashboard/LanguageContext";
import { ChevronDown, X } from "lucide-react";

/* ─── Auth Modal ─────────────────────────────────────────────── */

function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#555555" }}
          className="transition-colors hover:text-white"
        >
          <X size={18} />
        </button>

        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-white mb-1">Empieza gratis</h3>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
          10.000 créditos gratis al registrarte. Sin tarjeta de crédito.
        </p>

        <SignUpButton mode="modal" forceRedirectUrl="/dashboard?tab=create-voice">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90 mb-3"
            style={{ background: "#ffffff", color: "#000000", fontSize: "14px", border: "none", cursor: "pointer" }}
          >
            Crear cuenta gratis →
          </button>
        </SignUpButton>

        <SignInButton mode="modal" forceRedirectUrl="/dashboard?tab=create-voice">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold transition-all hover:bg-white/5"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e5e7eb",
              background: "transparent",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Ya tengo cuenta
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function DesignVoiceClient() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { t } = useLang();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeNav, setActiveNav] = useState<"products" | "empresa" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [demoDescription, setDemoDescription] = useState("");
  const [demoLang, setDemoLang] = useState("es");
  const [demoVariants, setDemoVariants] = useState("1");

  function handleCTA() {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.push("/dashboard?tab=create-voice");
    } else {
      setShowAuthModal(true);
    }
  }

  function openNav(which: "products" | "empresa") {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
    setActiveNav(which);
  }
  function closeNav() {
    navCloseTimer.current = setTimeout(() => setActiveNav(null), 80);
  }

  const NAV_PRODUCTS_LEFT = [
    { title: t.nav.tts, desc: t.nav.ttsDesc, href: "/dashboard" },
    { title: t.nav.stt, desc: t.nav.sttDesc, href: "/dashboard" },
    { title: t.nav.voiceClone, desc: t.nav.voiceCloneDesc, href: "/dashboard" },
  ];
  const NAV_PRODUCTS_RIGHT = [
    { title: t.nav.dialogue, desc: t.nav.dialogueDesc, href: "/dashboard" },
    { title: t.nav.imageVideo, desc: t.nav.imageVideoDesc, href: "/dashboard" },
    { title: "Diseño de voz", desc: "Crea voces originales sin grabar", href: "/design-voice" },
  ];
  const NAV_EMPRESA = [
    { title: t.nav.about, desc: t.nav.aboutDesc, href: "/about" },
    { title: t.nav.blog, desc: t.nav.blogDesc, href: "/blog" },
    { title: t.nav.support, desc: t.nav.supportDesc, href: "/support" },
  ];

  const USE_CASES = [
    {
      icon: "🎙️",
      title: "Narradores",
      desc: "Crea el narrador perfecto para tus vídeos sin contratar actores",
      bg: "linear-gradient(135deg,#1a0535 0%,#2d1b69 60%,#1e0a3c 100%)",
      tags: ["Documentales", "YouTube", "E-learning"],
    },
    {
      icon: "🎮",
      title: "Personajes",
      desc: "Voces únicas para personajes de juegos, animación o ficción",
      bg: "linear-gradient(135deg,#030b1a 0%,#0c2461 60%,#0a1628 100%)",
      tags: ["Videojuegos", "Animación", "Ficción"],
    },
    {
      icon: "📻",
      title: "Locutores",
      desc: "Locutor profesional para podcasts, anuncios y contenido de marca",
      bg: "linear-gradient(135deg,#1a0318 0%,#6b0f4e 60%,#2d0a22 100%)",
      tags: ["Podcasts", "Publicidad", "Branding"],
    },
  ];

  const COMPARE_ROWS = [
    {
      feature: "Necesitas audio",
      clone: { val: "Sí", pos: false },
      design: { val: "No", pos: true },
    },
    {
      feature: "Tiempo de creación",
      clone: { val: "~1 min", pos: null },
      design: { val: "~15 seg", pos: true },
    },
    {
      feature: "Voces originales",
      clone: { val: "No", pos: false },
      design: { val: "Sí", pos: true },
    },
    {
      feature: "Ideal para",
      clone: { val: "Replicar tu voz", pos: null },
      design: { val: "Crear personajes", pos: null },
    },
  ];

  function cellColor(pos: boolean | null) {
    if (pos === true) return "#22c55e";
    if (pos === false) return "#ef4444";
    return "#9ca3af";
  }
  function cellPrefix(pos: boolean | null, val: string) {
    if (pos === true) return `✓ ${val}`;
    if (pos === false) return `✗ ${val}`;
    return val;
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#000000", color: "white" }}>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "transparent" }}>
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/elitelabs.png"
              alt="Elite Labs"
              width={32}
              height={32}
              style={{ height: "32px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }}
              className="rounded-lg"
            />
            <span className="font-bold text-white text-lg">Elite Labs</span>
          </Link>

          {/* Center nav pill */}
          <nav
            className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "999px",
              padding: "4px 16px",
            }}
          >
            {/* Products mega menu */}
            <div className="relative" onMouseEnter={() => openNav("products")} onMouseLeave={closeNav}>
              <button
                onClick={() => setActiveNav(activeNav === "products" ? null : "products")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              >
                {t.nav.products}
                <ChevronDown size={13} style={{ transition: "transform 0.15s", transform: activeNav === "products" ? "rotate(180deg)" : "none" }} />
              </button>
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: `translateX(-50%) translateY(${activeNav === "products" ? "0px" : "4px"})`,
                  opacity: activeNav === "products" ? 1 : 0,
                  pointerEvents: activeNav === "products" ? "auto" : "none",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                  width: "500px",
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "10px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  backdropFilter: "blur(20px)",
                  zIndex: 60,
                }}
              >
                <div style={{ display: "flex", gap: "4px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {NAV_PRODUCTS_LEFT.map((item) => (
                      <Link key={item.title} href={item.href} className="hover:bg-white/5 rounded-xl transition-colors" style={{ display: "block", padding: "10px 12px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "2px" }}>{item.title}</p>
                        <p style={{ fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                  <div style={{ width: "1px", background: "rgba(255,255,255,0.06)", flexShrink: 0, margin: "8px 0" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {NAV_PRODUCTS_RIGHT.map((item) => (
                      <Link key={item.title} href={item.href} className="hover:bg-white/5 rounded-xl transition-colors" style={{ display: "block", padding: "10px 12px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "2px" }}>{item.title}</p>
                        <p style={{ fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Company mega menu */}
            <div className="relative" onMouseEnter={() => openNav("empresa")} onMouseLeave={closeNav}>
              <button
                onClick={() => setActiveNav(activeNav === "empresa" ? null : "empresa")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              >
                {t.nav.company}
                <ChevronDown size={13} style={{ transition: "transform 0.15s", transform: activeNav === "empresa" ? "rotate(180deg)" : "none" }} />
              </button>
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: `translateX(-50%) translateY(${activeNav === "empresa" ? "0px" : "4px"})`,
                  opacity: activeNav === "empresa" ? 1 : 0,
                  pointerEvents: activeNav === "empresa" ? "auto" : "none",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                  width: "240px",
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "10px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  backdropFilter: "blur(20px)",
                  zIndex: 60,
                }}
              >
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 12px 6px" }}>
                  {t.nav.company}
                </p>
                {NAV_EMPRESA.map((item) => (
                  <Link key={item.title} href={item.href} className="hover:bg-white/5 rounded-xl transition-colors" style={{ display: "block", padding: "10px 12px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "2px" }}>{item.title}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">
              {t.nav.pricing}
            </Link>
            <Link href="/voices" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg">
              {t.nav.voices}
            </Link>
          </nav>

          {/* Right: mobile toggle + auth */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              className="md:hidden p-2"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                {mobileNavOpen
                  ? <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                  : <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                }
              </svg>
            </button>

            {isLoaded && isSignedIn ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all hover:-translate-y-0.5"
                style={{ background: "#ffffff", color: "#000000" }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
                  Iniciar sesión
                </Link>
                <button
                  onClick={handleCTA}
                  className="text-sm font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all hover:-translate-y-0.5 whitespace-nowrap"
                  style={{ background: "#ffffff", color: "#000000", border: "none", cursor: "pointer" }}
                >
                  Registrarse gratis
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t" style={{ borderColor: "#1a1a1a", background: "#000000" }}>
            <button
              onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <span>{t.nav.products}</span>
              <ChevronDown size={14} style={{ transition: "transform 0.15s", transform: mobileProductsOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {mobileProductsOpen && (
              <div style={{ paddingLeft: "12px", paddingBottom: "8px", display: "flex", flexDirection: "column", gap: "1px" }}>
                {[...NAV_PRODUCTS_LEFT, ...NAV_PRODUCTS_RIGHT].map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => { setMobileNavOpen(false); setMobileProductsOpen(false); }}
                    className="hover:bg-white/5 rounded-lg transition-colors"
                    style={{ display: "block", padding: "9px 14px" }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{item.title}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280" }}>{item.desc}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/pricing" onClick={() => setMobileNavOpen(false)} className="block px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors border-t" style={{ borderColor: "#1a1a1a" }}>
              {t.nav.pricing}
            </Link>
            <Link href="/voices" onClick={() => setMobileNavOpen(false)} className="block px-5 py-3.5 text-sm text-gray-300 hover:text-white transition-colors border-t" style={{ borderColor: "#1a1a1a" }}>
              {t.nav.voices}
            </Link>
            <div className="px-5 py-4 border-t" style={{ borderColor: "#1a1a1a" }}>
              <button
                onClick={() => { setMobileNavOpen(false); handleCTA(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "#ffffff", color: "#000000", border: "none", cursor: "pointer" }}
              >
                Registrarse gratis
              </button>
            </div>
          </div>
        )}
      </header>

      <main>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="pt-32 md:pt-48 pb-16 md:pb-24 text-center px-4">
          <div className="max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaaaaa" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
              Nuevo · Powered by Fish Audio S2
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              Diseña tu voz{" "}
              <span style={{ color: "#aaaaaa" }}>con IA</span>
            </h1>

            <p className="text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
              Describe cómo quieres que suene y la IA la crea en segundos.
              Sin grabaciones, sin actores de voz.
            </p>

            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-black text-base transition-all hover:-translate-y-1"
              style={{ background: "#ffffff", boxShadow: "0 4px 20px rgba(255,255,255,0.12)", border: "none", cursor: "pointer" }}
            >
              Crear mi voz gratis →
            </button>

            <p className="mt-4 text-xs" style={{ color: "#444444" }}>
              Sin tarjeta de crédito · 10.000 créditos gratis
            </p>
          </div>
        </section>

        {/* ── Demo interactivo ─────────────────────────────────────── */}
        <section className="py-8 md:py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-2xl p-6 md:p-8"
              style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs" style={{ color: "#555555" }}>design-voice — Elite Labs</span>
              </div>

              <label className="block text-sm font-medium text-white mb-2">
                Describe la voz que quieres
              </label>
              <textarea
                value={demoDescription}
                onChange={(e) => setDemoDescription(e.target.value)}
                placeholder="Voz masculina madura, tono grave, acento neutro latinoamericano, estilo periodístico profesional"
                rows={4}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: "#e5e7eb",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "#6b7280" }}>Idioma</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={demoLang}
                      onChange={(e) => setDemoLang(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        color: "#e5e7eb",
                        fontSize: "13px",
                        outline: "none",
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                      }}
                    >
                      <option value="es">🇪🇸 Español</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="pt">🇧🇷 Português</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="zh">🇨🇳 中文</option>
                    </select>
                    <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "#6b7280" }}>Variantes a generar</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={demoVariants}
                      onChange={(e) => setDemoVariants(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        color: "#e5e7eb",
                        fontSize: "13px",
                        outline: "none",
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                      }}
                    >
                      <option value="1">1 variante</option>
                      <option value="2">2 variantes</option>
                      <option value="3">3 variantes</option>
                      <option value="4">4 variantes</option>
                    </select>
                    <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }} />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCTA}
                className="w-full mt-5 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: "#ffffff", color: "#000000", fontSize: "14px", border: "none", cursor: "pointer" }}
              >
                Generar voz →
              </button>

              <p className="text-center text-xs mt-3" style={{ color: "#444444" }}>
                Lista en ~15 segundos · 10.000 créditos gratis al registrarte
              </p>
            </div>
          </div>
        </section>

        {/* ── Casos de uso ─────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">¿Para qué puedes usarlo?</h2>
              <p style={{ color: "#6b7280" }}>Crea la voz perfecta para cada proyecto sin grabar una sola vez</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {USE_CASES.map((uc) => (
                <div
                  key={uc.title}
                  className="relative rounded-2xl overflow-hidden p-6 border"
                  style={{ background: uc.bg, borderColor: "rgba(255,255,255,0.05)", minHeight: "240px" }}
                >
                  <div className="relative flex flex-col justify-end h-full" style={{ minHeight: "180px" }}>
                    <span className="text-4xl mb-3 block">{uc.icon}</span>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2.5 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{uc.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{uc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparativa ──────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Diseño de voz vs Clonación de voz</h2>
              <p style={{ color: "#6b7280" }}>Elige la herramienta perfecta según tu necesidad</p>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Header row */}
              <div className="grid grid-cols-3" style={{ background: "#111111", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="p-4 text-sm font-semibold" style={{ color: "#6b7280" }}></div>
                <div className="p-4 text-sm font-semibold text-center" style={{ color: "#6b7280" }}>Clonación de voz</div>
                <div
                  className="p-4 text-sm font-semibold text-center"
                  style={{ color: "#ffffff", background: "rgba(255,255,255,0.04)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Diseño de voz ✦
                </div>
              </div>

              {COMPARE_ROWS.map((row, i) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-3"
                  style={{
                    background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                    borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <div className="p-4 text-sm font-medium" style={{ color: "#e5e7eb" }}>{row.feature}</div>
                  <div className="p-4 text-sm text-center" style={{ color: cellColor(row.clone.pos) }}>
                    {cellPrefix(row.clone.pos, row.clone.val)}
                  </div>
                  <div
                    className="p-4 text-sm text-center font-medium"
                    style={{ color: cellColor(row.design.pos), background: "rgba(255,255,255,0.02)", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    {cellPrefix(row.design.pos, row.design.val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div
              className="rounded-2xl p-8 sm:p-14 border relative overflow-hidden text-center"
              style={{
                background: "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <div
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(255,255,255,0.09),transparent 70%)" }}
                aria-hidden
              />
              <div
                className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(255,255,255,0.05),transparent 70%)" }}
                aria-hidden
              />
              <h2 className="text-3xl md:text-4xl font-bold mb-3 relative">
                Empieza gratis
              </h2>
              <p className="mb-2 relative text-lg" style={{ color: "#9ca3af" }}>
                10.000 créditos al registrarte
              </p>
              <p className="mb-8 relative text-sm" style={{ color: "#555555" }}>
                Sin tarjeta de crédito · Acceso inmediato
              </p>
              <button
                onClick={handleCTA}
                className="inline-block px-8 py-4 rounded-xl font-semibold text-black text-base transition-all hover:-translate-y-1 relative"
                style={{ background: "#ffffff", boxShadow: "0 4px 20px rgba(255,255,255,0.1)", border: "none", cursor: "pointer" }}
              >
                Crear mi voz gratis →
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: "#222222", background: "#000000" }}>
        <div className="max-w-5xl mx-auto px-4 pt-14 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image
                  src="/elitelabs.png"
                  alt="Elite Labs"
                  width={28}
                  height={28}
                  style={{ height: "28px", width: "auto", objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }}
                  className="rounded-lg"
                />
                <span className="font-bold text-white">Elite Labs</span>
              </Link>
              <p className="text-sm leading-relaxed" style={{ color: "#666666" }}>
                {t.footer.tagline}
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#666666" }}>{t.footer.product}</p>
              <ul className="space-y-3">
                {[
                  { label: t.nav.tts, href: "/dashboard" },
                  { label: t.nav.stt, href: "/dashboard" },
                  { label: t.nav.voiceClone, href: "/dashboard" },
                  { label: "Diseño de voz", href: "/design-voice" },
                  { label: t.nav.gallery, href: "/gallery" },
                  { label: t.nav.pricing, href: "/pricing" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#666666" }}>{t.footer.company}</p>
              <ul className="space-y-3">
                {[
                  { label: t.nav.about, href: "/about" },
                  { label: t.nav.blog, href: "/blog" },
                  { label: t.nav.support, href: "/support" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#666666" }}>{t.footer.legal}</p>
              <ul className="space-y-3">
                {[
                  { label: t.footer.privacy, href: "/privacy" },
                  { label: t.footer.terms, href: "/terms" },
                  { label: t.footer.dmca, href: "/dmca" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t mb-6" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: "#666666" }}>
              {t.footer.copyright}
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {[
                { label: t.footer.privacy, href: "/privacy" },
                { label: t.footer.terms, href: "/terms" },
                { label: t.footer.contact, href: "/support" },
              ].map(({ label, href }, i, arr) => (
                <span key={label} className="flex items-center gap-4">
                  <a href={href} className="text-xs transition-colors hover:text-white/70" style={{ color: "#666666" }}>{label}</a>
                  {i < arr.length - 1 && <span style={{ color: "#222222" }}>|</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
