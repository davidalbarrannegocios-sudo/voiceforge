"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

type Lang = "es" | "en";

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: "es", flag: "https://flagcdn.com/w20/es.png", label: "Español" },
  { code: "en", flag: "https://flagcdn.com/w20/us.png", label: "English" },
];

// ─── Content types ─────────────────────────────────────────────────────────────

type ProviderItem = { name: string; role: string; url: string };

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "group"; title: string; items: string[] }
  | { type: "providers"; items: ProviderItem[] }
  | { type: "retention"; rows: { label: string; value: string }[] };

type SubSection = { id: string; title: string; blocks: Block[] };

type Section = {
  id: string;
  title: string;
  blocks?: Block[];
  subsections?: SubSection[];
};

type PrivacyContent = {
  pageTitle: string;
  legalLabel: string;
  lastUpdated: string;
  company: string;
  introBanner: string;
  backLink: string;
  contactFooter: string;
  sections: Section[];
};

// ─── ESPAÑOL ──────────────────────────────────────────────────────────────────

const es: PrivacyContent = {
  pageTitle: "Política de Privacidad",
  legalLabel: "Legal",
  lastUpdated: "Última actualización: 24 de junio de 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, EE. UU.",
  introBanner: "En Elite Labs nos tomamos tu privacidad en serio. Esta política explica qué datos recopilamos, por qué y cómo los protegemos.",
  backLink: "← Inicio",
  contactFooter: "¿Preguntas? Escríbenos a",
  sections: [
    {
      id: "1",
      title: "1. Introducción y Responsable del Tratamiento",
      blocks: [
        { type: "p", text: 'Elite Tube LLC ("Elite Labs"), con domicilio en 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, EE. UU., es el responsable del tratamiento de los datos personales recogidos a través de elitelabs.es.' },
        { type: "p", text: "Contacto: soporte@elitelabs.es" },
      ],
    },
    {
      id: "2",
      title: "2. Datos que Recopilamos",
      subsections: [
        {
          id: "2.1",
          title: "2.1 Datos que nos proporcionas directamente",
          blocks: [
            {
              type: "ul",
              items: [
                "Datos de cuenta: nombre, email, contraseña (gestionada por Clerk).",
                "Datos de pago: procesados por Stripe; Elite Labs no almacena datos de pago completos.",
                "Contenido generado: textos para síntesis de voz, muestras de audio para clonación, parámetros de configuración.",
                "Comunicaciones: mensajes de soporte o email a soporte@elitelabs.es.",
                "Datos del programa de afiliados: código de referido, datos bancarios para comisiones.",
              ],
            },
          ],
        },
        {
          id: "2.2",
          title: "2.2 Datos que recopilamos automáticamente",
          blocks: [
            {
              type: "ul",
              items: [
                "Datos de uso: páginas visitadas, funcionalidades utilizadas, créditos consumidos, historial de generaciones.",
                "Datos técnicos: dirección IP, navegador, sistema operativo, identificadores de dispositivo.",
                "Geolocalización aproximada derivada de la IP (país y ciudad).",
                "Cookies y tecnologías similares.",
                "Datos de sesión: registros de inicio/cierre de sesión, duración.",
              ],
            },
          ],
        },
        {
          id: "2.3",
          title: "2.3 Datos de terceros",
          blocks: [
            {
              type: "ul",
              items: [
                "Información de autenticación de Google vía Clerk.",
                "Datos de pago y suscripción de Stripe.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "3",
      title: "3. Finalidades y Base Legal",
      blocks: [
        {
          type: "retention",
          rows: [
            { label: "Prestación del servicio", value: "Ejecución del contrato" },
            { label: "Gestión de pagos", value: "Ejecución del contrato" },
            { label: "Atención al cliente", value: "Ejecución del contrato / Interés legítimo" },
            { label: "Comunicaciones transaccionales", value: "Ejecución del contrato" },
            { label: "Seguridad y prevención de fraude", value: "Interés legítimo" },
            { label: "Análisis y mejora del servicio", value: "Interés legítimo" },
            { label: "Marketing", value: "Consentimiento" },
            { label: "Cumplimiento legal", value: "Obligación legal" },
            { label: "Programa de afiliados", value: "Ejecución del contrato" },
          ],
        },
      ],
    },
    {
      id: "4",
      title: "4. Datos Especialmente Sensibles",
      blocks: [
        { type: "p", text: "Las muestras de voz para clonación pueden considerarse datos biométricos. Las procesamos exclusivamente para crear el modelo de voz solicitado. No las usamos para identificar personas ni las compartimos, salvo con Fish Audio para la generación del modelo." },
      ],
    },
    {
      id: "5",
      title: "5. Destinatarios y Terceros",
      blocks: [
        {
          type: "providers",
          items: [
            { name: "Clerk, Inc. (EE. UU.)", role: "Autenticación", url: "clerk.com/privacy" },
            { name: "Stripe, Inc. (EE. UU.)", role: "Pagos", url: "stripe.com/privacy" },
            { name: "Fish Audio", role: "Síntesis y clonación de voz", url: "fish.audio/privacy" },
            { name: "DeepL SE (Alemania)", role: "Traducción", url: "deepl.com/privacy" },
            { name: "OpenAI, LLC (EE. UU.)", role: "Diarización de audio (GPT)", url: "openai.com/privacy" },
            { name: "Hetzner Online GmbH (Alemania)", role: "Almacenamiento de audios", url: "hetzner.com/legal/privacy-policy" },
            { name: "Supabase, Inc. (EE. UU.)", role: "Base de datos", url: "supabase.com/privacy" },
            { name: "Cloudflare, Inc. (EE. UU.)", role: "CDN y seguridad", url: "cloudflare.com/privacypolicy" },
            { name: "Resend, Inc. (EE. UU.)", role: "Emails transaccionales", url: "resend.com/privacy" },
            { name: "Sanity AS (Noruega)", role: "CMS blog", url: "sanity.io/privacy" },
            { name: "xAI Corp. (EE. UU.)", role: "Chat de soporte con IA (Grok)", url: "x.ai/privacy" },
            { name: "Google LLC (EE. UU.)", role: "Analytics y Search Console", url: "policies.google.com/privacy" },
          ],
        },
        { type: "p", text: "No vendemos datos personales a terceros." },
      ],
    },
    {
      id: "6",
      title: "6. Transferencias Internacionales",
      blocks: [
        { type: "p", text: "Para usuarios del EEE, las transferencias a EE. UU. se realizan con Cláusulas Contractuales Tipo aprobadas por la Comisión Europea y el Marco de Privacidad UE-EE. UU." },
      ],
    },
    {
      id: "7",
      title: "7. Cookies",
      blocks: [
        {
          type: "group",
          title: "Cookies necesarias:",
          items: [
            "Sesión Clerk — autenticación de usuario.",
            "Token de autenticación — mantenimiento de sesión.",
            "Preferencias de idioma — elitelabs_lang.",
          ],
        },
        {
          type: "group",
          title: "Cookies de análisis (con consentimiento):",
          items: [
            "Google Analytics: _ga, _gid, _gat.",
          ],
        },
        {
          type: "group",
          title: "Cookies de terceros:",
          items: [
            "Cloudflare: __cf_bm.",
            "Stripe: __stripe_mid, __stripe_sid.",
          ],
        },
        { type: "p", text: "Gestión mediante el banner de cookies o la configuración del navegador." },
      ],
    },
    {
      id: "8",
      title: "8. Conservación de Datos",
      blocks: [
        {
          type: "retention",
          rows: [
            { label: "Datos de cuenta", value: "Hasta eliminación + 30 días" },
            { label: "Historial de generaciones (audios)", value: "3 días" },
            { label: "Historial de generaciones (registros)", value: "12 meses" },
            { label: "Datos de pago", value: "7 años (obligación fiscal)" },
            { label: "Logs de acceso", value: "12 meses" },
            { label: "Muestras de voz", value: "Hasta eliminación por el usuario" },
            { label: "Comunicaciones de soporte", value: "3 años" },
            { label: "Datos de analítica (Google Analytics)", value: "26 meses" },
            { label: "Datos de afiliados", value: "Duración del programa + 5 años" },
          ],
        },
      ],
    },
    {
      id: "9",
      title: "9. Derechos de los Usuarios",
      blocks: [
        {
          type: "group",
          title: "Derechos generales:",
          items: [
            "Acceso a tus datos personales.",
            "Rectificación de datos inexactos.",
            "Supresión de tus datos ('derecho al olvido').",
            "Oposición al tratamiento.",
            "Limitación del tratamiento.",
            "Portabilidad de datos.",
            "Retirada del consentimiento en cualquier momento.",
          ],
        },
        {
          type: "group",
          title: "Usuarios UE (GDPR):",
          items: [
            "Derecho a reclamar ante la autoridad de protección de datos de tu país.",
          ],
        },
        {
          type: "group",
          title: "Usuarios California (CCPA/CPRA):",
          items: [
            "Derecho a conocer los datos personales recopilados.",
            "Derecho a eliminar datos personales.",
            "Derecho a no participar en la venta de datos (Elite Labs no vende datos).",
            "Derecho a no ser discriminado por ejercer estos derechos.",
            "Derecho a corregir datos inexactos.",
            "Derecho a limitar el uso de información sensible.",
          ],
        },
        { type: "p", text: "Ejercicio de derechos: soporte@elitelabs.es — respuesta en 30 días (45 días para solicitudes CCPA)." },
      ],
    },
    {
      id: "10",
      title: "10. Seguridad",
      blocks: [
        { type: "ul", items: [
          "Cifrado SSL/TLS en tránsito.",
          "Cifrado en reposo.",
          "Control de acceso por roles.",
          "Monitorización continua.",
          "Copias de seguridad cifradas.",
          "Notificación de brechas de seguridad en 72 horas (GDPR).",
        ]},
      ],
    },
    {
      id: "11",
      title: "11. Menores",
      blocks: [
        { type: "p", text: "No recopilamos datos de menores de 13 años de forma intencionada. Si detectas que un menor ha proporcionado datos, contacta con soporte@elitelabs.es para solicitar su eliminación." },
      ],
    },
    {
      id: "12",
      title: "12. Cambios en esta Política",
      blocks: [
        { type: "p", text: "Notificaremos cambios sustanciales por email con al menos 30 días de antelación. La fecha de 'Última actualización' en el encabezado indica la versión vigente." },
      ],
    },
    {
      id: "13",
      title: "13. Contacto",
      blocks: [
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, EE. UU.",
            "soporte@elitelabs.es",
            "elitelabs.es",
            "Tiempo de respuesta: máximo 30 días.",
          ],
        },
        { type: "p", text: "Reclamaciones: AEPD (España), autoridad nacional de protección de datos de tu país (UE), o FTC (EE. UU.)." },
      ],
    },
  ],
};

// ─── ENGLISH ──────────────────────────────────────────────────────────────────

const en: PrivacyContent = {
  pageTitle: "Privacy Policy",
  legalLabel: "Legal",
  lastUpdated: "Last updated: June 24, 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
  introBanner: "At Elite Labs we take your privacy seriously. This policy explains what data we collect, why, and how we protect it.",
  backLink: "← Home",
  contactFooter: "Questions? Write to us at",
  sections: [
    {
      id: "1",
      title: "1. Introduction and Data Controller",
      blocks: [
        { type: "p", text: 'Elite Tube LLC ("Elite Labs"), with registered address at 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA, is the data controller for personal data collected through elitelabs.es.' },
        { type: "p", text: "Contact: soporte@elitelabs.es" },
      ],
    },
    {
      id: "2",
      title: "2. Data We Collect",
      subsections: [
        {
          id: "2.1",
          title: "2.1 Data you provide directly",
          blocks: [
            {
              type: "ul",
              items: [
                "Account data: name, email, password (managed by Clerk).",
                "Payment data: processed by Stripe; Elite Labs does not store full payment data.",
                "Generated content: texts for voice synthesis, audio samples for cloning, configuration parameters.",
                "Communications: support messages or emails to soporte@elitelabs.es.",
                "Affiliate program data: referral code, bank details for commissions.",
              ],
            },
          ],
        },
        {
          id: "2.2",
          title: "2.2 Data we collect automatically",
          blocks: [
            {
              type: "ul",
              items: [
                "Usage data: pages visited, features used, credits consumed, generation history.",
                "Technical data: IP address, browser, operating system, device identifiers.",
                "Approximate geolocation derived from IP (country and city).",
                "Cookies and similar technologies.",
                "Session data: login/logout records, duration.",
              ],
            },
          ],
        },
        {
          id: "2.3",
          title: "2.3 Third-party data",
          blocks: [
            {
              type: "ul",
              items: [
                "Google authentication information via Clerk.",
                "Payment and subscription data from Stripe.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "3",
      title: "3. Purposes and Legal Basis",
      blocks: [
        {
          type: "retention",
          rows: [
            { label: "Service provision", value: "Performance of contract" },
            { label: "Payment processing", value: "Performance of contract" },
            { label: "Customer support", value: "Performance of contract / Legitimate interest" },
            { label: "Transactional communications", value: "Performance of contract" },
            { label: "Security and fraud prevention", value: "Legitimate interest" },
            { label: "Service analysis and improvement", value: "Legitimate interest" },
            { label: "Marketing", value: "Consent" },
            { label: "Legal compliance", value: "Legal obligation" },
            { label: "Affiliate program", value: "Performance of contract" },
          ],
        },
      ],
    },
    {
      id: "4",
      title: "4. Special Sensitive Data",
      blocks: [
        { type: "p", text: "Voice samples for cloning may be considered biometric data. We process them exclusively to create the requested voice model. We do not use them to identify individuals nor share them, except with Fish Audio for model generation." },
      ],
    },
    {
      id: "5",
      title: "5. Recipients and Third Parties",
      blocks: [
        {
          type: "providers",
          items: [
            { name: "Clerk, Inc. (USA)", role: "Authentication", url: "clerk.com/privacy" },
            { name: "Stripe, Inc. (USA)", role: "Payments", url: "stripe.com/privacy" },
            { name: "Fish Audio", role: "Voice synthesis and cloning", url: "fish.audio/privacy" },
            { name: "DeepL SE (Germany)", role: "Translation", url: "deepl.com/privacy" },
            { name: "OpenAI, LLC (USA)", role: "Audio diarization (GPT)", url: "openai.com/privacy" },
            { name: "Hetzner Online GmbH (Germany)", role: "Audio storage", url: "hetzner.com/legal/privacy-policy" },
            { name: "Supabase, Inc. (USA)", role: "Database", url: "supabase.com/privacy" },
            { name: "Cloudflare, Inc. (USA)", role: "CDN and security", url: "cloudflare.com/privacypolicy" },
            { name: "Resend, Inc. (USA)", role: "Transactional emails", url: "resend.com/privacy" },
            { name: "Sanity AS (Norway)", role: "Blog CMS", url: "sanity.io/privacy" },
            { name: "xAI Corp. (USA)", role: "AI support chat (Grok)", url: "x.ai/privacy" },
            { name: "Google LLC (USA)", role: "Analytics and Search Console", url: "policies.google.com/privacy" },
          ],
        },
        { type: "p", text: "We do not sell personal data to third parties." },
      ],
    },
    {
      id: "6",
      title: "6. International Transfers",
      blocks: [
        { type: "p", text: "For EEA users, transfers to the USA are carried out with Standard Contractual Clauses approved by the European Commission and the EU-US Privacy Framework." },
      ],
    },
    {
      id: "7",
      title: "7. Cookies",
      blocks: [
        {
          type: "group",
          title: "Necessary cookies:",
          items: [
            "Clerk session — user authentication.",
            "Authentication token — session maintenance.",
            "Language preferences — elitelabs_lang.",
          ],
        },
        {
          type: "group",
          title: "Analytics cookies (with consent):",
          items: [
            "Google Analytics: _ga, _gid, _gat.",
          ],
        },
        {
          type: "group",
          title: "Third-party cookies:",
          items: [
            "Cloudflare: __cf_bm.",
            "Stripe: __stripe_mid, __stripe_sid.",
          ],
        },
        { type: "p", text: "Managed via the cookie banner or browser settings." },
      ],
    },
    {
      id: "8",
      title: "8. Data Retention",
      blocks: [
        {
          type: "retention",
          rows: [
            { label: "Account data", value: "Until deletion + 30 days" },
            { label: "Generation history (audio files)", value: "3 days" },
            { label: "Generation history (records)", value: "12 months" },
            { label: "Payment data", value: "7 years (tax obligation)" },
            { label: "Access logs", value: "12 months" },
            { label: "Voice samples", value: "Until deleted by user" },
            { label: "Support communications", value: "3 years" },
            { label: "Analytics data (Google Analytics)", value: "26 months" },
            { label: "Affiliate data", value: "Program duration + 5 years" },
          ],
        },
      ],
    },
    {
      id: "9",
      title: "9. User Rights",
      blocks: [
        {
          type: "group",
          title: "General rights:",
          items: [
            "Access to your personal data.",
            "Rectification of inaccurate data.",
            "Erasure of your data ('right to be forgotten').",
            "Objection to processing.",
            "Restriction of processing.",
            "Data portability.",
            "Withdrawal of consent at any time.",
          ],
        },
        {
          type: "group",
          title: "EU users (GDPR):",
          items: [
            "Right to lodge a complaint with the data protection authority in your country.",
          ],
        },
        {
          type: "group",
          title: "California users (CCPA/CPRA):",
          items: [
            "Right to know what personal data we collect.",
            "Right to delete personal data.",
            "Right to opt out of the sale of data (Elite Labs does not sell data).",
            "Right not to be discriminated against for exercising these rights.",
            "Right to correct inaccurate data.",
            "Right to limit use of sensitive information.",
          ],
        },
        { type: "p", text: "To exercise your rights: soporte@elitelabs.es — response within 30 days (45 days for CCPA requests)." },
      ],
    },
    {
      id: "10",
      title: "10. Security",
      blocks: [
        { type: "ul", items: [
          "SSL/TLS encryption in transit.",
          "Encryption at rest.",
          "Role-based access control.",
          "Continuous monitoring.",
          "Encrypted backups.",
          "Security breach notification within 72 hours (GDPR).",
        ]},
      ],
    },
    {
      id: "11",
      title: "11. Minors",
      blocks: [
        { type: "p", text: "We do not intentionally collect data from children under 13. If you discover that a minor has provided data, contact soporte@elitelabs.es to request its deletion." },
      ],
    },
    {
      id: "12",
      title: "12. Changes to this Policy",
      blocks: [
        { type: "p", text: "We will notify material changes by email at least 30 days in advance. The 'Last updated' date in the header indicates the current version." },
      ],
    },
    {
      id: "13",
      title: "13. Contact",
      blocks: [
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
            "soporte@elitelabs.es",
            "elitelabs.es",
            "Response time: maximum 30 days.",
          ],
        },
        { type: "p", text: "Complaints: Spanish DPA (AEPD), your national data protection authority (EU), or FTC (USA)." },
      ],
    },
  ],
};

const CONTENT: Record<Lang, PrivacyContent> = { es, en };

// ─── Renderer helpers ─────────────────────────────────────────────────────────

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return (
      <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
        {block.text}
      </p>
    );
  }

  if (block.type === "ul") {
    return (
      <ul className="space-y-2 mt-2">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#9ca3af" }}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6b7280" }} />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "group") {
    return (
      <div className="mt-3">
        <p className="text-sm font-semibold mb-2" style={{ color: "#d1d5db" }}>{block.title}</p>
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#9ca3af" }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6b7280" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === "providers") {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border" style={{ borderColor: "#2a2a2a" }}>
        {block.items.map((p, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
            style={{
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              borderBottom: i < block.items.length - 1 ? "1px solid #1f1f1f" : "none",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span className="font-medium" style={{ color: "#e5e7eb" }}>{p.name}</span>
              <span className="ml-2 text-xs" style={{ color: "#6b7280" }}>— {p.role}</span>
            </div>
            <a
              href={`https://${p.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex-shrink-0 transition-colors hover:text-gray-200"
              style={{ color: "#6b7280", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              {p.url}
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "retention") {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border" style={{ borderColor: "#2a2a2a" }}>
        {block.rows.map((row, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
            style={{
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              borderBottom: i < block.rows.length - 1 ? "1px solid #1f1f1f" : "none",
            }}
          >
            <span style={{ color: "#9ca3af" }}>{row.label}</span>
            <span className="text-xs text-right flex-shrink-0" style={{ color: "#d1d5db", maxWidth: "55%" }}>{row.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function RenderSection({ section }: { section: Section }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">{section.title}</h2>
      {section.blocks && (
        <div className="space-y-3">
          {section.blocks.map((b, i) => <RenderBlock key={i} block={b} />)}
        </div>
      )}
      {section.subsections && (
        <div className="space-y-6 mt-1">
          {section.subsections.map((sub) => (
            <div key={sub.id}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#e5e7eb" }}>{sub.title}</h3>
              <div className="space-y-3">
                {sub.blocks.map((b, i) => <RenderBlock key={i} block={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Language selector ────────────────────────────────────────────────────────

function LangSelector({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px", borderRadius: "8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer", color: "#ffffff", fontSize: "13px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.flag} alt={current.code} width={16} height={12} style={{ objectFit: "cover", borderRadius: "2px" }} />
        <span style={{ fontWeight: 500 }}>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: "140px", zIndex: 9999,
          background: "rgba(18,18,18,0.95)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: "12px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)", padding: "4px",
        }}>
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => { onChange(l.code); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "none", cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.6)",
                  fontSize: "13px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.flag} alt={l.code} width={16} height={12} style={{ objectFit: "cover", borderRadius: "2px" }} />
                <span style={{ flex: 1, fontWeight: active ? 600 : 400 }}>{l.label}</span>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                    <path d="M1.5 5.5L4 8L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("elitelabs_lang") as Lang | null;
    if (stored && (stored === "es" || stored === "en")) {
      setLang(stored);
    }
    setMounted(true);
  }, []);

  const handleLangChange = (l: Lang) => {
    setLang(l);
    localStorage.setItem("elitelabs_lang", l);
  };

  const c = CONTENT[lang];

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "white" }}>
      <header
        className="border-b sticky top-0 z-10"
        style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderColor: "#222222" }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/elitelabs.png"
              alt="Elite Labs"
              width={28}
              height={28}
              style={{ height: "28px", width: "auto", objectFit: "contain" }}
              className="rounded-lg"
            />
            <span className="font-bold text-white">Elite Labs</span>
          </Link>
          <div className="flex items-center gap-4">
            {mounted && <LangSelector lang={lang} onChange={handleLangChange} />}
            <Link href="/" className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
              {c.backLink}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
            {c.legalLabel}
          </p>
          <h1 className="text-4xl font-bold text-white mb-3">{c.pageTitle}</h1>
          <p className="text-sm mb-1" style={{ color: "#888888" }}>{c.lastUpdated}</p>
          <p className="text-xs" style={{ color: "#555570" }}>{c.company}</p>
        </div>

        <div
          className="p-5 rounded-xl border mb-10 text-sm leading-relaxed"
          style={{
            background: "#1a1a1a",
            borderLeft: "3px solid rgba(255,255,255,0.2)",
            borderColor: "#222222",
            color: "#cccccc",
          }}
        >
          {c.introBanner}
        </div>

        <div className="space-y-10">
          {c.sections.map((section) => (
            <RenderSection key={section.id} section={section} />
          ))}
        </div>

        <div className="mt-14 pt-8 border-t" style={{ borderColor: "#222222" }}>
          <p className="text-sm" style={{ color: "#888888" }}>
            {c.contactFooter}{" "}
            <a href="mailto:soporte@elitelabs.es" className="text-gray-300 hover:text-white transition-colors">
              soporte@elitelabs.es
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t mt-16 py-6 px-6" style={{ borderColor: "#222222" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "#555570" }}>© 2026 Elite Tube LLC. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
              {lang === "es" ? "Términos de uso" : "Terms of Use"}
            </Link>
            <Link href="/support" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
              {lang === "es" ? "Soporte" : "Support"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
