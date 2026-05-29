"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────── */
interface CodeTab {
  lang: "curl" | "javascript" | "python";
  code: string;
}

/* ─────────────────────────────────────────────────────────────────
   SIDEBAR DATA
───────────────────────────────────────────────────────────────── */
const NAV = [
  {
    label: "Introducción",
    items: [
      { id: "bienvenida",    label: "Bienvenida" },
      { id: "autenticacion", label: "Autenticación" },
      { id: "rate-limits",   label: "Rate limits" },
      { id: "errores",       label: "Errores" },
    ],
  },
  {
    label: "Endpoints",
    items: [
      { id: "tts",    label: "POST /v1/tts" },
      { id: "voices", label: "GET /v1/voices" },
      { id: "usage",  label: "GET /v1/usage" },
      { id: "models", label: "GET /v1/models" },
    ],
  },
  {
    label: "Guías",
    items: [
      { id: "primeros-pasos",   label: "Primeros pasos" },
      { id: "modelos-precios",  label: "Modelos y precios" },
      { id: "etiquetas",        label: "Etiquetas de emoción" },
      { id: "formatos",         label: "Formatos de audio" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────
   CODE EXAMPLES
───────────────────────────────────────────────────────────────── */
const AUTH_EXAMPLES: CodeTab[] = [
  {
    lang: "curl",
    code: `curl -X POST https://elitelabs.es/api/v1/tts \\
  -H "Authorization: Bearer el_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hola", "voice_id": "VOICE_ID"}' \\
  --output audio.mp3`,
  },
  {
    lang: "javascript",
    code: `const response = await fetch('https://elitelabs.es/api/v1/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer el_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: 'Hola', voice_id: 'VOICE_ID' }),
})
const audio = await response.arrayBuffer()`,
  },
  {
    lang: "python",
    code: `import requests

response = requests.post(
    'https://elitelabs.es/api/v1/tts',
    headers={
        'Authorization': 'Bearer el_live_YOUR_KEY',
        'Content-Type': 'application/json',
    },
    json={'text': 'Hola', 'voice_id': 'VOICE_ID'},
)
with open('audio.mp3', 'wb') as f:
    f.write(response.content)`,
  },
];

const TTS_EXAMPLES: CodeTab[] = [
  {
    lang: "curl",
    code: `curl -X POST https://elitelabs.es/api/v1/tts \\
  -H "Authorization: Bearer el_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "[excited] Bienvenido a Elite Labs.",
    "voice_id": "VOICE_ID",
    "model": "elite-e2-pro",
    "speed": 1.0,
    "format": "mp3"
  }' --output audio.mp3`,
  },
  {
    lang: "javascript",
    code: `const res = await fetch('https://elitelabs.es/api/v1/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer el_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '[excited] Bienvenido a Elite Labs.',
    voice_id: 'VOICE_ID',
    model: 'elite-e2-pro',
    speed: 1.0,
    format: 'mp3',
  }),
})
// res.body es el audio binario
const buffer = await res.arrayBuffer()
const blob = new Blob([buffer], { type: 'audio/mpeg' })`,
  },
  {
    lang: "python",
    code: `import requests

res = requests.post(
    'https://elitelabs.es/api/v1/tts',
    headers={
        'Authorization': 'Bearer el_live_YOUR_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'text': '[excited] Bienvenido a Elite Labs.',
        'voice_id': 'VOICE_ID',
        'model': 'elite-e2-pro',
        'speed': 1.0,
        'format': 'mp3',
    },
)
with open('audio.mp3', 'wb') as f:
    f.write(res.content)`,
  },
];

const QUICKSTART_EXAMPLE: CodeTab[] = [
  {
    lang: "curl",
    code: `# 1. Consulta tus voces disponibles
curl https://elitelabs.es/api/v1/voices \\
  -H "Authorization: Bearer el_live_YOUR_KEY"

# 2. Genera audio con una voz
curl -X POST https://elitelabs.es/api/v1/tts \\
  -H "Authorization: Bearer el_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hola mundo desde Elite Labs.",
    "voice_id": "ID_DE_VOZ_COPIADO_ARRIBA",
    "model": "elite-e2-pro"
  }' --output mi_audio.mp3

# 3. Comprueba tu saldo
curl https://elitelabs.es/api/v1/usage \\
  -H "Authorization: Bearer el_live_YOUR_KEY"`,
  },
  {
    lang: "javascript",
    code: `// 1. Genera tu primera síntesis
const res = await fetch('https://elitelabs.es/api/v1/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer el_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hola mundo desde Elite Labs.',
    voice_id: 'ID_DE_VOZ',
    model: 'elite-e2-pro',
  }),
})

// 2. Reproduce el audio
const blob = new Blob([await res.arrayBuffer()], { type: 'audio/mpeg' })
const audio = new Audio(URL.createObjectURL(blob))
audio.play()`,
  },
  {
    lang: "python",
    code: `import requests

# 1. Genera tu primera síntesis
res = requests.post(
    'https://elitelabs.es/api/v1/tts',
    headers={
        'Authorization': 'Bearer el_live_YOUR_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'text': 'Hola mundo desde Elite Labs.',
        'voice_id': 'ID_DE_VOZ',
        'model': 'elite-e2-pro',
    },
)

# 2. Guarda el audio
with open('audio.mp3', 'wb') as f:
    f.write(res.content)
print(f'Bytes usados: {res.headers.get("X-Bytes-Used")}')`,
  },
];

/* ─────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────── */

function CodeBlock({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(tabs[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginTop: "12px" }}>
      {/* Tabs */}
      <div style={{ display: "flex", background: "#0d0d0d", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {tabs.map((t, i) => (
          <button
            key={t.lang}
            onClick={() => setActive(i)}
            style={{
              padding: "8px 14px", fontSize: "11px", fontWeight: 600,
              background: "transparent", border: "none", cursor: "pointer",
              color: active === i ? "#ffffff" : "rgba(255,255,255,0.3)",
              borderBottom: active === i ? "2px solid #ffffff" : "2px solid transparent",
              transition: "color 0.15s",
            }}
          >
            {t.lang}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={copy}
          style={{
            padding: "0 12px", background: "transparent", border: "none",
            cursor: "pointer", color: copied ? "#4ade80" : "rgba(255,255,255,0.3)",
            fontSize: "11px", fontWeight: 500, transition: "color 0.15s",
          }}
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      {/* Code */}
      <pre style={{
        margin: 0, padding: "16px", background: "#0d0d0d",
        fontSize: "12px", lineHeight: 1.7, color: "rgba(255,255,255,0.75)",
        fontFamily: "monospace", overflowX: "auto",
        whiteSpace: "pre",
      }}>
        {tabs[active].code}
      </pre>
    </div>
  );
}

function SingleCodeBlock({ code, lang = "json" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginTop: "12px" }}>
      <div style={{ display: "flex", background: "#0d0d0d", borderBottom: "1px solid rgba(255,255,255,0.06)", justifyContent: "space-between", alignItems: "center", padding: "6px 12px" }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{lang}</span>
        <button
          onClick={copy}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: copied ? "#4ade80" : "rgba(255,255,255,0.3)", fontSize: "11px", fontWeight: 500 }}
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "16px", background: "#0d0d0d", fontSize: "12px", lineHeight: 1.7, color: "rgba(255,255,255,0.75)", fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre" }}>
        {code}
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: "POST" | "GET" }) {
  const styles: Record<string, React.CSSProperties> = {
    POST: { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" },
    GET:  { background: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" },
  };
  return (
    <span style={{
      ...styles[method],
      fontSize: "11px", fontWeight: 700, padding: "3px 8px",
      borderRadius: "5px", fontFamily: "monospace", letterSpacing: "0.05em",
    }}>
      {method}
    </span>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: "80px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {children}
      </h2>
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "24px 0 8px" }}>
      {children}
    </p>
  );
}

function ParamTable({ rows }: { rows: { name: string; type: string; required?: boolean; description: string }[] }) {
  return (
    <div style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginTop: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            {["Parámetro", "Tipo", "", "Descripción"].map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#e5e7eb", fontWeight: 500, whiteSpace: "nowrap" }}>{r.name}</td>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#60a5fa", fontSize: "12px" }}>{r.type}</td>
              <td style={{ padding: "10px 14px" }}>
                {r.required !== undefined && (
                  <span style={{
                    fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                    background: r.required ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)",
                    color: r.required ? "#f87171" : "rgba(255,255,255,0.35)",
                    whiteSpace: "nowrap",
                  }}>
                    {r.required ? "requerido" : "opcional"}
                  </span>
                )}
              </td>
              <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginTop: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", color: j === 0 ? "#e5e7eb" : "rgba(255,255,255,0.55)", fontFamily: j === 0 ? "monospace" : undefined }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", fontFamily: "monospace", fontSize: "12px",
      padding: "2px 8px", borderRadius: "5px", margin: "3px 3px",
      background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)",
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      {children}
    </span>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN CLIENT COMPONENT
───────────────────────────────────────────────────────────────── */
export function DocsClient() {
  const [activeSection, setActiveSection] = useState("bienvenida");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    document.querySelectorAll("section[id]").forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "#ffffff" }}>

      {/* ── Navbar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        height: "52px", background: "#000000",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <Image src="/elitelabs.png" alt="Elite Labs" width={24} height={24} className="rounded-md" />
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>Elite Labs</span>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", marginLeft: "4px" }}>API Docs</span>
        </Link>
        <Link
          href="/dashboard/developers"
          style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Volver al dashboard
        </Link>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: "260px", flexShrink: 0,
          height: "100%", overflowY: "auto",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "#000000", padding: "24px 16px",
        }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "16px", paddingLeft: "8px" }}>
            Elite Labs API
          </p>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "16px" }} />

          {NAV.map((group) => (
            <div key={group.label} style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", paddingLeft: "8px" }}>
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    style={{
                      width: "100%", textAlign: "left", background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                      border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "6px",
                      fontSize: "13px", fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)",
                      display: "block", marginBottom: "1px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; } }}
                    onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "0 48px 120px" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>

            {/* ── Bienvenida ── */}
            <SectionTitle id="bienvenida">Elite Labs API</SectionTitle>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginTop: "16px" }}>
              Genera síntesis de voz de alta calidad mediante nuestra API REST.
              Sin suscripción, sin límites mensuales — pagas solo lo que usas.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "20px" }}>
              {[
                { label: "Precio", value: "18€ / 1M bytes" },
                { label: "Pago",   value: "Por uso, sin cuota" },
                { label: "Latencia", value: "Streaming" },
              ].map((s) => (
                <div key={s.label} style={{ padding: "14px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0, fontFamily: "monospace" }}>{s.value}</p>
                </div>
              ))}
            </div>
            <SubLabel>Base URL</SubLabel>
            <SingleCodeBlock code="https://elitelabs.es/api/v1" lang="url" />

            {/* ── Autenticación ── */}
            <SectionTitle id="autenticacion">Autenticación</SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Todas las peticiones requieren un header <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px" }}>Authorization</code> con tu API key.
              Las keys tienen el formato <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px" }}>el_live_XXXXXXXX</code>.
            </p>
            <SingleCodeBlock code={`Authorization: Bearer el_live_YOUR_KEY`} lang="header" />
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "12px" }}>
              Genera tu API key en{" "}
              <Link href="/dashboard/developers" style={{ color: "#60a5fa", textDecoration: "none" }}>
                el panel de desarrollador →
              </Link>
            </p>
            <SubLabel>Ejemplo</SubLabel>
            <CodeBlock tabs={AUTH_EXAMPLES} />

            {/* ── Rate limits ── */}
            <SectionTitle id="rate-limits">Rate limits</SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              La concurrencia máxima depende del gasto acumulado en tu wallet API.
              A mayor gasto histórico, más solicitudes puedes procesar en paralelo.
            </p>
            <DataTable
              headers={["Gasto acumulado", "Concurrencia"]}
              rows={[
                ["0 — 150€",     "3 slots"],
                ["150 — 250€",   "10 slots"],
                ["250 — 1.500€", "40 slots"],
                ["+3.000€",      "50 slots"],
              ]}
            />
            <SubLabel>Headers de respuesta</SubLabel>
            <DataTable
              headers={["Header", "Descripción"]}
              rows={[
                ["X-Bytes-Used",      "Bytes consumidos en esta petición"],
                ["X-Bytes-Remaining", "Bytes restantes en tu wallet"],
              ]}
            />

            {/* ── Errores ── */}
            <SectionTitle id="errores">Errores</SectionTitle>
            <DataTable
              headers={["Código", "Significado"]}
              rows={[
                ["401", "API key inválida o ausente"],
                ["402", "Sin bytes disponibles en wallet"],
                ["400", "Parámetros incorrectos"],
                ["500", "Error interno del servidor"],
              ]}
            />
            <SubLabel>Formato de error</SubLabel>
            <SingleCodeBlock code={`{ "error": "descripción del error" }`} lang="json" />

            {/* ── POST /v1/tts ── */}
            <SectionTitle id="tts">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MethodBadge method="POST" />
                <span style={{ fontFamily: "monospace", fontSize: "20px" }}>/v1/tts</span>
              </div>
            </SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Convierte texto a audio. Devuelve el binario de audio directamente en el body de la respuesta.
            </p>
            <SubLabel>Headers</SubLabel>
            <ParamTable rows={[
              { name: "Authorization", type: "string", required: true,  description: "Bearer el_live_YOUR_KEY" },
              { name: "Content-Type",  type: "string", required: true,  description: "application/json" },
            ]} />
            <SubLabel>Body</SubLabel>
            <ParamTable rows={[
              { name: "text",     type: "string", required: true,  description: "Texto a sintetizar (UTF-8)" },
              { name: "voice_id", type: "string", required: true,  description: "ID de la voz a usar" },
              { name: "model",    type: "string", required: false, description: "Modelo TTS. Default: elite-e2-pro" },
              { name: "speed",    type: "number", required: false, description: "Velocidad 0.5–2.0. Default: 1.0" },
              { name: "format",   type: "string", required: false, description: "mp3 (default) | wav" },
            ]} />
            <SubLabel>Respuesta</SubLabel>
            <InfoBox>Audio binario en el formato especificado (Content-Type: audio/mpeg o audio/wav).</InfoBox>
            <SubLabel>Modelos disponibles</SubLabel>
            <DataTable
              headers={["ID", "Descripción"]}
              rows={[
                ["elite-e2-pro", "Motor principal S2-Pro · Máxima calidad (recomendado)"],
                ["elite-legacy", "Motor S1 Legacy · Compatible con etiquetas (parenthesis)"],
                ["elite-turbo",  "Motor rápido · Menor latencia"],
              ]}
            />
            <SubLabel>Ejemplo</SubLabel>
            <CodeBlock tabs={TTS_EXAMPLES} />

            {/* ── GET /v1/voices ── */}
            <SectionTitle id="voices">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MethodBadge method="GET" />
                <span style={{ fontFamily: "monospace", fontSize: "20px" }}>/v1/voices</span>
              </div>
            </SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Lista las voces públicas disponibles en la plataforma.
            </p>
            <SubLabel>Query params</SubLabel>
            <ParamTable rows={[
              { name: "page",  type: "number", required: false, description: "Página. Default: 1" },
              { name: "limit", type: "number", required: false, description: "Resultados por página. Default: 20, máx: 100" },
            ]} />
            <SubLabel>Respuesta</SubLabel>
            <SingleCodeBlock code={`{
  "voices": [
    {
      "id":       "string",
      "name":     "string",
      "gender":   "masculine | feminine",
      "language": "string",
      "provider": "fish_audio"
    }
  ],
  "page":  1,
  "limit": 20,
  "total": 42
}`} lang="json" />

            {/* ── GET /v1/usage ── */}
            <SectionTitle id="usage">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MethodBadge method="GET" />
                <span style={{ fontFamily: "monospace", fontSize: "20px" }}>/v1/usage</span>
              </div>
            </SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Consulta el saldo disponible en tu wallet API.
            </p>
            <SubLabel>Respuesta</SubLabel>
            <SingleCodeBlock code={`{
  "bytes_available": 1000000,
  "total_spent_eur": 18.00
}`} lang="json" />

            {/* ── GET /v1/models ── */}
            <SectionTitle id="models">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MethodBadge method="GET" />
                <span style={{ fontFamily: "monospace", fontSize: "20px" }}>/v1/models</span>
              </div>
            </SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Lista los modelos disponibles y su precio.
            </p>
            <SubLabel>Respuesta</SubLabel>
            <SingleCodeBlock code={`{
  "models": [
    {
      "id":                     "elite-e2-pro",
      "name":                   "Elite Labs E2 Pro",
      "type":                   "tts",
      "price_per_million_bytes": 18
    },
    {
      "id":                     "elite-legacy",
      "name":                   "Elite Labs Legacy",
      "type":                   "tts",
      "price_per_million_bytes": 18
    },
    {
      "id":                     "elite-turbo",
      "name":                   "Elite Labs Turbo",
      "type":                   "tts",
      "price_per_million_bytes": 18
    },
    {
      "id":           "transcribe-1",
      "name":         "Elite Labs ASR",
      "type":         "asr",
      "price_per_hour": 0.36
    }
  ]
}`} lang="json" />

            {/* ── Primeros pasos ── */}
            <SectionTitle id="primeros-pasos">Primeros pasos</SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Empieza a generar audio en menos de 5 minutos.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
              {[
                { n: "1", title: "Crea tu cuenta", desc: "Regístrate gratis en elitelabs.es" },
                { n: "2", title: "Recarga tu wallet", desc: "Ve al panel de desarrollador y añade saldo. Desde 18€ por 1M bytes." },
                { n: "3", title: "Genera tu API key", desc: "En el panel de desarrollador, crea una key con un nombre descriptivo." },
                { n: "4", title: "Haz tu primera petición", desc: "Copia el ejemplo de abajo, reemplaza YOUR_KEY y VOICE_ID y ejecuta." },
              ].map((step) => (
                <div key={step.n} style={{ display: "flex", gap: "14px", padding: "14px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {step.n}
                  </span>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>{step.title}</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <SubLabel>Ejemplo completo</SubLabel>
            <CodeBlock tabs={QUICKSTART_EXAMPLE} />

            {/* ── Modelos y precios ── */}
            <SectionTitle id="modelos-precios">Modelos y precios</SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              Los bytes se calculan sobre el texto UTF-8 de entrada, no sobre el tamaño del audio resultante.
              El precio es el mismo para todos los modelos TTS.
            </p>
            <DataTable
              headers={["Tipo", "Modelo", "Precio"]}
              rows={[
                ["TTS", "elite-e2-pro", "18€ / millón de bytes"],
                ["TTS", "elite-legacy",  "18€ / millón de bytes"],
                ["TTS", "elite-turbo",   "18€ / millón de bytes"],
                ["ASR", "transcribe-1",  "0.36€ / hora de audio"],
              ]}
            />
            <InfoBox>
              <strong style={{ color: "#fff" }}>Ejemplo:</strong> un texto de 1.000 caracteres UTF-8 ≈ 1.000 bytes → coste aproximado de 0,018€.
            </InfoBox>

            {/* ── Etiquetas de emoción ── */}
            <SectionTitle id="etiquetas">Etiquetas de emoción</SectionTitle>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginTop: "12px" }}>
              El motor <strong style={{ color: "#fff" }}>Elite E2 Pro (S2-Pro)</strong> soporta etiquetas entre corchetes que modifican el tono y la emoción.
              Las etiquetas deben ir <strong style={{ color: "#fff" }}>al inicio de cada frase</strong>.
            </p>
            <SubLabel>Tono emocional</SubLabel>
            <div style={{ marginTop: "4px" }}>
              {["[angry]", "[sad]", "[excited]", "[whispering]", "[soft]", "[breathy]", "[emphasis]"].map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
            <SubLabel>Efectos de audio</SubLabel>
            <div style={{ marginTop: "4px" }}>
              {["[laughing]", "[chuckling]", "[sighing]", "[pause]", "[long pause]"].map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
            <SubLabel>Avanzadas</SubLabel>
            <div style={{ marginTop: "4px" }}>
              {["[inhale]", "[exhale]", "[screaming]", "[shouting]", "[surprised]"].map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
            <SubLabel>Ejemplo</SubLabel>
            <SingleCodeBlock code={`"[excited] Bienvenido a Elite Labs. [soft] Tu audio está listo."`} lang="text" />
            <InfoBox>
              El motor <strong style={{ color: "#fff" }}>Legacy (S1)</strong> usa sintaxis con paréntesis:{" "}
              <code style={{ fontFamily: "monospace", fontSize: "12px" }}>(happy) (sad) (angry) (excited) (whispering)</code>
            </InfoBox>

            {/* ── Formatos de audio ── */}
            <SectionTitle id="formatos">Formatos de audio</SectionTitle>
            <DataTable
              headers={["Formato", "Calidad", "Uso recomendado"]}
              rows={[
                ["mp3", "128 kbps", "Web, streaming (default)"],
                ["wav", "Sin pérdida", "Producción, edición"],
              ]}
            />
            <InfoBox>
              Los bytes consumidos se calculan sobre el <strong style={{ color: "#fff" }}>texto UTF-8 de entrada</strong>,
              no sobre el tamaño del audio de salida.
            </InfoBox>

          </div>
        </main>
      </div>
    </div>
  );
}
