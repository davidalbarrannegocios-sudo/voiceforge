"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

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

/* ─── Table view ─────────────────────────────────────────────── */
type SortKey = "outlierScore" | "subscribers" | "monthlyRevenue" | "rpm" | "totalVideos" | "monthlyViews";

const TABLE_COLS: { key: SortKey | null; label: string; width: string }[] = [
  { key: null,             label: "Canal",        width: "220px" },
  { key: "outlierScore",   label: "Outlier",      width: "80px" },
  { key: "subscribers",    label: "Subs",         width: "80px" },
  { key: "monthlyRevenue", label: "Ingresos/mes", width: "100px" },
  { key: "rpm",            label: "RPM",          width: "70px" },
  { key: "totalVideos",    label: "Vídeos",       width: "70px" },
  { key: "monthlyViews",   label: "Views/mes",    width: "85px" },
  { key: null,             label: "Monetizado",   width: "90px" },
  { key: null,             label: "Categoría",    width: "120px" },
  { key: null,             label: "",             width: "36px" },
];

function TableView({ channels, sortBy, sortOrder, onSort }: {
  channels: NicheChannel[];
  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  return (
    <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {TABLE_COLS.map((col, i) => (
              <th
                key={i}
                onClick={() => col.key && onSort(col.key)}
                style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: col.key === sortBy ? "#e5e7eb" : "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", cursor: col.key ? "pointer" : "default", whiteSpace: "nowrap", width: col.width, userSelect: "none" }}
              >
                {col.label}{col.key === sortBy ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
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
  const [forbidden, setForbidden]   = useState(false);
  const [view, setView]             = useState<"cards" | "table">("cards");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("");
  const [sortBy, setSortBy]         = useState<SortKey>("outlierScore");
  const [sortOrder, setSortOrder]   = useState<"asc" | "desc">("desc");
  const [page, setPage]             = useState(1);
  const [ranges, setRanges]         = useState<Record<string, string>>({});
  const [isMonetized, setIsMonetized] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catsFetched = useRef(false);

  const buildParams = useCallback((overrides: Record<string, string | number> = {}) => {
    const p: Record<string, string> = {
      search, category, sortBy, sortOrder, page: String(page),
      ...Object.fromEntries(Object.entries(ranges).filter(([, v]) => v !== "")),
      ...(isMonetized ? { isMonetized } : {}),
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    return new URLSearchParams(p).toString();
  }, [search, category, sortBy, sortOrder, page, ranges, isMonetized]);

  const fetchChannels = useCallback(async (overrides: Record<string, string | number> = {}) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/niche-channels?${buildParams(overrides)}`);
      const data: ApiResponse = await res.json();
      if (res.status === 403) { setForbidden(true); return; }
      setForbidden(false);
      setChannels(data.channels ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      if (!catsFetched.current && data.categories?.length) {
        setCategories(data.categories);
        catsFetched.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchChannels(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchChannels({ search: val, page: 1 }), 350);
  }

  function handleSelect(key: string, val: string) {
    if (key === "category") setCategory(val);
    if (key === "sortBy")   setSortBy(val as SortKey);
    setPage(1);
    fetchChannels({ [key]: val, page: 1 });
  }

  function handleSortToggle() {
    const next = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(next);
    setPage(1);
    fetchChannels({ sortOrder: next, page: 1 });
  }

  function handleTableSort(key: SortKey) {
    const next = sortBy === key ? (sortOrder === "desc" ? "asc" : "desc") : "desc";
    setSortBy(key); setSortOrder(next); setPage(1);
    fetchChannels({ sortBy: key, sortOrder: next, page: 1 });
  }

  function handleRangeChange(key: string, val: string) {
    setRanges(prev => ({ ...prev, [key]: val }));
  }

  function applyRanges() { setPage(1); fetchChannels({ page: 1 }); }

  function handleMonetized(val: string) {
    setIsMonetized(val); setPage(1);
    fetchChannels({ isMonetized: val, page: 1 });
  }

  function handlePage(p: number) { setPage(p); fetchChannels({ page: p }); }

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
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px" }}>🔒</div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e5e7eb", margin: 0 }}>Función exclusiva para planes de pago</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "400px", margin: 0 }}>
          El Buscador de Nichos con datos de más de 300 canales monetizados está disponible en los planes Starter, Pro, Elite y Enterprise.
        </p>
        <Link href="/dashboard?tab=billing" style={{ padding: "10px 24px", borderRadius: "10px", background: "#ffffff", color: "#000", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
          Ver planes
        </Link>
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
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
            <button onClick={() => setView("cards")} style={btnStyle(view === "cards")}>⊞ Tarjetas</button>
            <button onClick={() => setView("table")} style={btnStyle(view === "table")}>☰ Tabla</button>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          Descubre nichos rentables de YouTube con datos reales · {loading ? "…" : numFmt.format(total)} canales
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#444", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Buscar nicho, canal, keyword…"
            style={{ width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "7px", paddingBottom: "7px", fontSize: "12px", color: "#e5e7eb", background: "#111", border: "1px solid #222", borderRadius: "8px", outline: "none", boxSizing: "border-box" }} />
        </div>

        <select value={category} onChange={e => handleSelect("category", e.target.value)} style={selStyle}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={sortBy} onChange={e => handleSelect("sortBy", e.target.value)} style={selStyle}>
          <option value="outlierScore">⚡ Outlier Score</option>
          <option value="monthlyRevenue">💰 Ingresos/mes</option>
          <option value="subscribers">👥 Suscriptores</option>
          <option value="monthlyViews">👁 Vistas/mes</option>
          <option value="rpm">💵 RPM</option>
          <option value="totalVideos">🎬 Vídeos totales</option>
        </select>

        <button onClick={handleSortToggle} style={{ ...selStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          {sortOrder === "desc" ? "↓ Mayor primero" : "↑ Menor primero"}
        </button>

        <div style={{ display: "flex", gap: "4px" }}>
          {[["", "Todos"], ["true", "💰 Monetizados"], ["false", "Sin monetizar"]].map(([val, label]) => (
            <button key={val} onClick={() => handleMonetized(val)} style={btnStyle(isMonetized === val)}>{label}</button>
          ))}
        </div>

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
        <TableView channels={channels} sortBy={sortBy} sortOrder={sortOrder} onSort={handleTableSort} />
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

      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
    </div>
  );
}
