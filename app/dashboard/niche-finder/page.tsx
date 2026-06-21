"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { DollarSign, Lock } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
interface NicheChannel {
  id: string;
  ytChannelId: string;
  title: string;
  description?: string | null;
  username?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  format?: string | null;
  outlierScore?: number | null;
  isFaceless?: boolean | null;
  isAiChannel?: boolean | null;
  isMonetized?: boolean | null;
  quality?: string | null;
  tags: string[];
  subscribers?: number | null;
  monthlyRevenue?: number | null;
  monthlyViews?: number | null;
  totalViews?: number | null;
  totalVideos?: number | null;
  rpm?: number | null;
  uploadsPerWeek?: number | null;
  avgVideoLength?: number | null;
}

interface ApiResponse {
  channels: NicheChannel[];
  total: number;
  pages: number;
  categories: string[];
  formats: string[];
  seed: number;
  error?: string;
}

/* ─── Formatters ─────────────────────────────────────────────── */
const numFmt = new Intl.NumberFormat("es-ES");

function fmtN(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return numFmt.format(Math.round(n / 100_000) / 10) + "M";
  if (n >= 1_000) return numFmt.format(Math.round(n / 100) / 10) + "K";
  return numFmt.format(n);
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M/mo";
  return "$" + numFmt.format(Math.round(n)) + "/mo";
}

function fmtRpm(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toFixed(2);
}

/* ─── Outlier badge ──────────────────────────────────────────── */
function OutlierBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const color = score >= 3 ? "#f59e0b" : score >= 2 ? "#34d399" : score >= 1 ? "#60a5fa" : "#6b7280";
  const bg    = score >= 3 ? "rgba(245,158,11,0.12)" : score >= 2 ? "rgba(52,211,153,0.1)" : score >= 1 ? "rgba(96,165,250,0.1)" : "rgba(107,114,128,0.1)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "99px", background: bg, fontSize: "11px", fontWeight: 700, color }}>
      ⚡ {score.toFixed(1)}
    </span>
  );
}

/* ─── Channel thumbnail with fallback ───────────────────────── */
function Thumb({ ch, size = 40 }: { ch: NicheChannel; size?: number }) {
  const [err, setErr] = useState(false);
  const hue = ch.ytChannelId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (ch.thumbnail && !err) {
    return (
      <img
        src={ch.thumbnail}
        alt={ch.title}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: size * 0.25, objectFit: "cover", flexShrink: 0, background: "#1a1a1a" }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, flexShrink: 0, background: `hsl(${hue},40%,16%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, color: `hsl(${hue},55%,60%)` }}>
      {ch.title.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ─── Card view ─────────────────────────────────────────────── */
function ChannelCard({ ch }: { ch: NicheChannel }) {
  return (
    <div
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", transition: "all 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <Thumb ch={ch} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>{ch.title}</p>
          {ch.username && <p style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{ch.username}</p>}
        </div>
        <a href={`https://youtube.com/channel/${ch.ytChannelId}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, color: "#6b7280", padding: "2px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        <OutlierBadge score={ch.outlierScore} />
        {ch.category && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(167,139,250,0.1)", color: "#a78bfa", fontWeight: 500 }}>{ch.category}</span>}
        {ch.isFaceless && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(52,211,153,0.08)", color: "#34d399", fontWeight: 500 }}>Faceless</span>}
        {ch.isMonetized === true  && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(34,197,94,0.08)", color: "#4ade80", fontWeight: 500 }}>💰 Monetizado</span>}
        {ch.isMonetized === false && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(107,114,128,0.1)", color: "#9ca3af", fontWeight: 500 }}>No monetizado</span>}
        {ch.isAiChannel && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", fontWeight: 500 }}>AI</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {[
          { label: "Suscriptores", val: fmtN(ch.subscribers) },
          { label: "Ingresos/mes",  val: fmtMoney(ch.monthlyRevenue), green: !!ch.monthlyRevenue },
          { label: "Vistas/mes",    val: fmtN(ch.monthlyViews) },
          { label: "RPM",           val: fmtRpm(ch.rpm) },
        ].map(({ label, val, green }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "7px 10px" }}>
            <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>{label}</p>
            <p style={{ fontSize: "13px", fontWeight: 600, color: green ? "#34d399" : "#e5e7eb" }}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
        <span style={{ fontSize: "11px", color: "#6b7280" }}>{ch.totalVideos != null ? `${numFmt.format(ch.totalVideos)} vídeos` : ""}</span>
        {ch.format && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(96,165,250,0.1)", color: "#60a5fa", fontWeight: 500 }}>{ch.format}</span>}
      </div>
    </div>
  );
}

/* ─── Table view (order is random — column headers are labels only) ── */
const TABLE_COLS = [
  { label: "Canal",        width: "220px" },
  { label: "Outlier",      width: "80px" },
  { label: "Subs",         width: "80px" },
  { label: "Ingresos/mes", width: "100px" },
  { label: "RPM",          width: "70px" },
  { label: "Vídeos",       width: "70px" },
  { label: "Views/mes",    width: "85px" },
  { label: "Monetizado",   width: "90px" },
  { label: "Categoría",    width: "120px" },
  { label: "",             width: "36px" },
];

function TableView({ channels }: { channels: NicheChannel[] }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {TABLE_COLS.map((col, i) => (
              <th
                key={i}
                style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {channels.map((ch, i) => (
            <tr
              key={ch.id}
              style={{ borderBottom: i < channels.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
            >
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Thumb ch={ch} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{ch.title}</p>
                    {ch.username && <p style={{ fontSize: "10px", color: "#6b7280" }}>@{ch.username}</p>}
                  </div>
                </div>
              </td>
              <td style={{ padding: "10px 12px" }}><OutlierBadge score={ch.outlierScore} /></td>
              <td style={{ padding: "10px 12px", fontSize: "12px", color: "#e5e7eb" }}>{fmtN(ch.subscribers)}</td>
              <td style={{ padding: "10px 12px", fontSize: "12px", color: ch.monthlyRevenue ? "#34d399" : "#6b7280" }}>{fmtMoney(ch.monthlyRevenue)}</td>
              <td style={{ padding: "10px 12px", fontSize: "12px", color: "#e5e7eb" }}>{fmtRpm(ch.rpm)}</td>
              <td style={{ padding: "10px 12px", fontSize: "12px", color: "#e5e7eb" }}>{ch.totalVideos != null ? numFmt.format(ch.totalVideos) : "—"}</td>
              <td style={{ padding: "10px 12px", fontSize: "12px", color: "#e5e7eb" }}>{fmtN(ch.monthlyViews)}</td>
              <td style={{ padding: "10px 12px", fontSize: "12px" }}>
                {ch.isMonetized === true  && <span style={{ color: "#4ade80" }}>✓ Sí</span>}
                {ch.isMonetized === false && <span style={{ color: "#6b7280" }}>✗ No</span>}
                {ch.isMonetized == null   && <span style={{ color: "#4b5563" }}>—</span>}
              </td>
              <td style={{ padding: "10px 12px" }}>
                {ch.category && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(167,139,250,0.1)", color: "#a78bfa", fontWeight: 500, whiteSpace: "nowrap" }}>{ch.category}</span>}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <a href={`https://youtube.com/channel/${ch.ytChannelId}`} target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", display: "flex", alignItems: "center" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Range filter ───────────────────────────────────────────── */
function RangeFilter({ label, minKey, maxKey, filters, onChange }: {
  label: string; minKey: string; maxKey: string;
  filters: Record<string, string>; onChange: (key: string, val: string) => void;
}) {
  const inp: React.CSSProperties = { width: "80px", padding: "5px 8px", fontSize: "11px", color: "#e5e7eb", background: "#111", border: "1px solid #222", borderRadius: "6px", outline: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input type="number" placeholder="Min" value={filters[minKey] ?? ""} onChange={e => onChange(minKey, e.target.value)} style={inp} />
        <span style={{ color: "#444", fontSize: "11px" }}>–</span>
        <input type="number" placeholder="Max" value={filters[maxKey] ?? ""} onChange={e => onChange(maxKey, e.target.value)} style={inp} />
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function NicheFinderPage() {
  const [channels, setChannels]     = useState<NicheChannel[]>([]);
  const [total, setTotal]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [reloading, setReloading]   = useState(false);
  const [forbidden, setForbidden]   = useState(false);
  const [view, setView]             = useState<"cards" | "table">("cards");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("");
  const [page, setPage]             = useState(1);
  const [ranges, setRanges]         = useState<Record<string, string>>({});
  const [onlyMonetized, setOnlyMonetized] = useState(false);

  // Seed is stored in a ref so it doesn't cause re-renders and avoids stale closures
  const seedRef     = useRef<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catsFetched = useRef(false);

  const fetchChannels = useCallback(async (
    overrides: Record<string, string | number> = {},
    clearSeed = false,
  ) => {
    setLoading(true);
    try {
      if (clearSeed) seedRef.current = null;

      const params: Record<string, string> = {
        search, category, page: String(page),
        ...Object.fromEntries(Object.entries(ranges).filter(([, v]) => v !== "")),
        ...(onlyMonetized ? { isMonetized: "true" } : {}),
        // Carry the current seed for consistent pagination; omit to let server generate one
        ...(seedRef.current !== null ? { seed: String(seedRef.current) } : {}),
        ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
      };

      const res  = await fetch(`/api/niche-channels?${new URLSearchParams(params)}`);
      const data: ApiResponse = await res.json();
      if (res.status === 403) { setForbidden(true); return; }
      setForbidden(false);
      setChannels(data.channels ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      // Save the seed returned by the server for subsequent pagination calls
      if (typeof data.seed === "number") seedRef.current = data.seed;
      if (!catsFetched.current && data.categories?.length) {
        setCategories(data.categories);
        catsFetched.current = true;
      }
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }, [search, category, page, ranges, onlyMonetized]);

  useEffect(() => { fetchChannels(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchChannels({ search: val, page: 1 }), 350);
  }

  function handleCategory(val: string) {
    setCategory(val);
    setPage(1);
    fetchChannels({ category: val, page: 1 });
  }

  function handleRangeChange(key: string, val: string) {
    setRanges(prev => ({ ...prev, [key]: val }));
  }

  function applyRanges() { setPage(1); fetchChannels({ page: 1 }); }

  function handleMonetizedToggle() {
    const next = !onlyMonetized;
    setOnlyMonetized(next);
    setPage(1);
    fetchChannels({ isMonetized: next ? "true" : "", page: 1 });
  }

  function handlePage(p: number) { setPage(p); fetchChannels({ page: p }); }

  function handleReload() {
    setReloading(true);
    setPage(1);
    fetchChannels({ page: 1 }, true /* clearSeed → new random order */);
  }

  const selStyle: React.CSSProperties = {
    fontSize: "12px", color: "#9ca3af", background: "#111", border: "1px solid #222",
    borderRadius: "8px", padding: "6px 10px", outline: "none", cursor: "pointer",
  };
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
    background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
    border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
    color: active ? "#e5e7eb" : "#6b7280", cursor: "pointer",
  });

  /* ── Forbidden ── */
  if (forbidden) {
    const DUMMY_CARDS = [
      { title: "Finanzas personales", category: "Finanzas", subs: "42 K", revenue: "3.200 €", rpm: "18,4 €", score: 2.8, color: "#1e3a5f" },
      { title: "IA y productividad", category: "Tecnología", subs: "87 K", revenue: "5.600 €", rpm: "12,1 €", score: 3.5, color: "#2d1b4e" },
      { title: "Cocina vegana fácil", category: "Lifestyle", subs: "134 K", revenue: "2.900 €", rpm: "7,3 €", score: 1.9, color: "#1a3d2b" },
      { title: "Inversión en bolsa", category: "Finanzas", subs: "61 K", revenue: "4.100 €", rpm: "22,7 €", score: 3.1, color: "#3d2a1a" },
      { title: "Meditación y mindfulness", category: "Bienestar", subs: "29 K", revenue: "1.800 €", rpm: "9,5 €", score: 2.2, color: "#1a2d3d" },
      { title: "Programación en Python", category: "Educación", subs: "198 K", revenue: "6.400 €", rpm: "11,8 €", score: 4.1, color: "#2d1a3d" },
      { title: "Viajes en furgoneta", category: "Viajes", subs: "73 K", revenue: "2.100 €", rpm: "6,2 €", score: 1.7, color: "#3d1a1a" },
      { title: "Criptomonedas y Web3", category: "Finanzas", subs: "55 K", revenue: "7.800 €", rpm: "31,2 €", score: 2.6, color: "#1a3d3a" },
      { title: "Desarrollo personal", category: "Educación", subs: "112 K", revenue: "3.500 €", rpm: "8,9 €", score: 2.0, color: "#2d3d1a" },
    ];

    return (
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Blurred teaser background */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", filter: "blur(10px)", opacity: 0.45, padding: "32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", alignContent: "start" }}>
          {DUMMY_CARDS.map((card, i) => (
            <div key={i} style={{ borderRadius: "12px", overflow: "hidden", background: "#18181b", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ height: "100px", background: `linear-gradient(135deg, ${card.color} 0%, #0a0a0b 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>{card.category}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9ca3af" }}>
                  <span>{card.subs} subs</span>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>{card.revenue}/mes</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                  <span>RPM {card.rpm}</span>
                  <span style={{ color: "#facc15" }}>★ {card.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "rgba(0,0,0,0.20)" }} />

        {/* Paywall content */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center", padding: "40px 32px", maxWidth: "520px", borderRadius: "16px", background: "rgba(9,9,11,0.6)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
          <Lock size={48} style={{ color: "#9ca3af", opacity: 0.8 }} />
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e5e7eb", margin: 0 }}>Función exclusiva para planes de pago</h2>
          <p style={{ fontSize: "14px", color: "#9ca3af", maxWidth: "440px", margin: 0, lineHeight: 1.7 }}>
            El Buscador de Nichos utiliza datos del proveedor NexLev, integrados directamente en Elite Labs. Accede a canales monetizados sin pagar la suscripción de NexLev por separado: te ahorras más de 30&nbsp;$/mes obteniendo las mismas funcionalidades dentro de tu plan.
          </p>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
            Disponible en los planes Starter, Pro, Elite y Enterprise.
          </p>
          <Link href="/pricing" style={{ padding: "10px 28px", borderRadius: "10px", background: "#ffffff", color: "#000", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
            Ver planes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", color: "#e5e7eb" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>Buscador de Nichos</h1>
          <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "5px", background: "#1a1a1a", color: "#6b7280" }}>BETA</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
            {/* Reload button */}
            <button
              onClick={handleReload}
              disabled={loading}
              title="Nuevo barajado aleatorio"
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={reloading ? { animation: "spin 0.7s linear infinite" } : undefined}
              >
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Recargar
            </button>
            <button onClick={() => setView("cards")} style={btnStyle(view === "cards")}>⊞ Tarjetas</button>
            <button onClick={() => setView("table")} style={btnStyle(view === "table")}>☰ Tabla</button>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          Descubre nichos rentables de YouTube
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#444", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Buscar nicho, canal, keyword…"
            style={{ width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "7px", paddingBottom: "7px", fontSize: "12px", color: "#e5e7eb", background: "#111", border: "1px solid #222", borderRadius: "8px", outline: "none", boxSizing: "border-box" }} />
        </div>

        <select value={category} onChange={e => handleCategory(e.target.value)} style={selStyle}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: onlyMonetized ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", border: onlyMonetized ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(255,255,255,0.08)", color: onlyMonetized ? "#4ade80" : "#9ca3af", userSelect: "none" }}
        >
          <input
            type="checkbox"
            checked={onlyMonetized}
            onChange={handleMonetizedToggle}
            style={{ display: "none" }}
          />
          <span style={{ width: "14px", height: "14px", borderRadius: "3px", border: onlyMonetized ? "1.5px solid #4ade80" : "1.5px solid #444", background: onlyMonetized ? "#4ade80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
            {onlyMonetized && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><polyline points="1,3.5 3.5,6 8,1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </span>
          <DollarSign size={12} />
          Solo monetizados
        </label>

        <button onClick={() => setFiltersOpen(o => !o)} style={{ ...selStyle, display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros avanzados
        </button>
      </div>

      {/* Advanced filters */}
      {filtersOpen && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>
          <RangeFilter label="Suscriptores"    minKey="minSubs"     maxKey="maxSubs"     filters={ranges} onChange={handleRangeChange} />
          <RangeFilter label="RPM ($)"         minKey="minRpm"      maxKey="maxRpm"      filters={ranges} onChange={handleRangeChange} />
          <RangeFilter label="Ingresos/mes ($)"minKey="minRevenue"  maxKey="maxRevenue"  filters={ranges} onChange={handleRangeChange} />
          <RangeFilter label="Vídeos totales"  minKey="minVideos"   maxKey="maxVideos"   filters={ranges} onChange={handleRangeChange} />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", opacity: 0.4 }}>
            <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Tiempo desde 1.er vídeo
              <span title="Próximamente — datos aún no disponibles" style={{ marginLeft: "5px", cursor: "help", fontSize: "10px", color: "#a78bfa" }}>ℹ</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input type="number" placeholder="Min días" disabled style={{ width: "80px", padding: "5px 8px", fontSize: "11px", background: "#111", border: "1px solid #222", borderRadius: "6px", color: "#4b5563", cursor: "not-allowed" }} />
              <span style={{ color: "#444", fontSize: "11px" }}>–</span>
              <input type="number" placeholder="Max días" disabled style={{ width: "80px", padding: "5px 8px", fontSize: "11px", background: "#111", border: "1px solid #222", borderRadius: "6px", color: "#4b5563", cursor: "not-allowed" }} />
            </div>
          </div>

          <button onClick={applyRanges} style={{ padding: "7px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "#ffffff", color: "#000", border: "none", cursor: "pointer" }}>
            Aplicar
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        view === "cards" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ height: "240px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: "52px", borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        )
      ) : channels.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "36px" }}>📊</span>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280" }}>No se encontraron canales con esos filtros</p>
          <p style={{ fontSize: "12px", color: "#444" }}>Prueba ajustando los rangos o borrando el buscador</p>
        </div>
      ) : view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
          {channels.map(ch => <ChannelCard key={ch.id} ch={ch} />)}
        </div>
      ) : (
        <TableView channels={channels} />
      )}

      {/* Pagination */}
      {pages > 1 && !loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
          <button onClick={() => handlePage(1)} disabled={page <= 1} style={{ padding: "6px 10px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: page <= 1 ? "#444" : "#9ca3af", cursor: page <= 1 ? "default" : "pointer" }}>«</button>
          <button onClick={() => handlePage(page - 1)} disabled={page <= 1} style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: page <= 1 ? "#444" : "#e5e7eb", cursor: page <= 1 ? "default" : "pointer" }}>← Anterior</button>
          <span style={{ fontSize: "12px", color: "#6b7280", padding: "0 8px" }}>Pág. {numFmt.format(page)} / {numFmt.format(pages)}</span>
          <button onClick={() => handlePage(page + 1)} disabled={page >= pages} style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: page >= pages ? "#444" : "#e5e7eb", cursor: page >= pages ? "default" : "pointer" }}>Siguiente →</button>
          <button onClick={() => handlePage(pages)} disabled={page >= pages} style={{ padding: "6px 10px", borderRadius: "8px", fontSize: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: page >= pages ? "#444" : "#9ca3af", cursor: page >= pages ? "default" : "pointer" }}>»</button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
