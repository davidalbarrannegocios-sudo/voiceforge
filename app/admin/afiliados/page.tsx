"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Copy, Check, RefreshCw, Edit2, Eye, Gift, Star,
  DollarSign, ChevronDown, ChevronUp, Search, X, Users, TrendingUp,
  Link2, Zap,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface ReferralEntry {
  id: string; status: string; rewardChars: number; createdAt: string;
  referred: { id: string; email: string; plan: string; createdAt: string };
}
interface AffiliateUser {
  id: string; email: string; plan: string; createdAt: string;
  referralCode: string | null; affiliateType: string;
  referralBalance: number; referralEarned: number;
  inviteCount: number; conversionCount: number; creditsEarned: number;
  generationCount: number; referrals: ReferralEntry[];
}
interface Stats {
  totalStandard: number; totalCash: number; totalInvites: number;
  totalConversions: number; conversionRate: number;
  pendingCommission: number; paidCommission: number;
}

/* ─── Style helpers ──────────────────────────────────────── */
const s = {
  card: { background: "#111111", border: "1px solid #1a1a1a", borderRadius: "12px" } as React.CSSProperties,
  th: { padding: "9px 12px", textAlign: "left" as const, color: "#555", fontWeight: 600,
    fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const },
  td: { padding: "10px 12px", fontSize: "13px", verticalAlign: "middle" as const },
  btn: (bg = "#1a1a1a", extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: bg, border: "1px solid rgba(255,255,255,0.08)", color: "#e5e7eb",
    borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" as const, ...extra,
  }),
  input: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px",
    color: "#e5e7eb", padding: "8px 12px", fontSize: "13px", outline: "none" } as React.CSSProperties,
};

const PLAN_COLOR: Record<string, string> = {
  free: "#6b7280", starter: "#3b82f6", pro: "#8b5cf6", elite: "#f59e0b", enterprise: "#ef4444",
};

function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_COLOR[plan] ?? "#6b7280";
  return (
    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
      color: c, background: `${c}22`, border: `1px solid ${c}55` }}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={s.btn("#0d0d0d", { padding: "2px 6px" })}
      title="Copiar"
    >
      {copied ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
    </button>
  );
}

function StatCard({ label, value, sub, color = "#fff" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ ...s.card, padding: "16px 20px", flex: 1, minWidth: 140 }}>
      <p style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 800, color }}>{value}</p>
      {sub && <p style={{ fontSize: "11px", color: "#555", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

/* ─── User Detail Modal ──────────────────────────────────── */
function UserDetailModal({ user, onClose, onAction }: {
  user: AffiliateUser;
  onClose: () => void;
  onAction: (action: string, params?: Record<string, unknown>) => Promise<void>;
}) {
  const [tab, setTab] = useState<"invitados" | "bonus">("invitados");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://elitelabs.es";
  const link = user.referralCode ? `${appUrl}/?ref=${user.referralCode}` : "—";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "16px",
        width: "100%", maxWidth: 680, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1a1a1a",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                {user.email[0].toUpperCase()}
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{user.email}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                  <PlanBadge plan={user.plan} />
                  <span style={{ fontSize: 11, color: "#555" }}>
                    Desde {new Date(user.createdAt).toLocaleDateString("es-ES")}
                  </span>
                  {user.affiliateType === "cash" && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                      color: "#f59e0b", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                      Cash
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Link2 size={12} color="#555" />
              <code style={{ fontSize: 12, color: "#9ca3af", background: "#111", padding: "2px 8px", borderRadius: 4 }}>{link}</code>
              {user.referralCode && <CopyBtn text={link} />}
            </div>
          </div>
          <button onClick={onClose} style={s.btn("#1a1a1a", { padding: "4px 8px" })}><X size={14} /></button>
        </div>

        {/* Mini stats */}
        <div style={{ display: "flex", gap: 1, background: "#1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
          {[
            { label: "Invitados", value: user.inviteCount },
            { label: "Conversiones", value: user.conversionCount },
            { label: "Créditos ganados", value: user.creditsEarned.toLocaleString("es-ES") },
            { label: "Generaciones", value: user.generationCount },
            ...(user.affiliateType === "cash" ? [
              { label: "Comisión pendiente", value: `$${(user.referralBalance / 100).toFixed(2)}` },
              { label: "Total ganado", value: `$${(user.referralEarned / 100).toFixed(2)}` },
            ] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, padding: "10px 14px", background: "#0d0d0d", textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{value}</p>
              <p style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", padding: "0 24px" }}>
          {(["invitados", "bonus"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 14px", fontSize: 13, fontWeight: 500, background: "none", border: "none",
              cursor: "pointer", color: tab === t ? "#fff" : "#555",
              borderBottom: `2px solid ${tab === t ? "#fff" : "transparent"}`,
            }}>
              {t === "invitados" ? "Invitados" : "Acciones"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {tab === "invitados" ? (
            user.referrals.length === 0 ? (
              <p style={{ color: "#555", fontSize: 13 }}>Sin invitados aún.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    {["Email", "Registro", "Estado", "Plan", "Créditos"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {user.referrals.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={s.td}><span style={{ color: "#e5e7eb" }}>{r.referred.email}</span></td>
                      <td style={s.td}><span style={{ color: "#555" }}>{new Date(r.referred.createdAt).toLocaleDateString("es-ES")}</span></td>
                      <td style={s.td}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                          color: r.status !== "pending" ? "#4ade80" : "#6b7280",
                          background: r.status !== "pending" ? "rgba(74,222,128,0.1)" : "rgba(107,114,128,0.1)" }}>
                          {r.status === "pending" ? "Pendiente" : "Convertido"}
                        </span>
                      </td>
                      <td style={s.td}><PlanBadge plan={r.referred.plan} /></td>
                      <td style={s.td}><span style={{ color: r.rewardChars > 0 ? "#4ade80" : "#555" }}>
                        {r.rewardChars > 0 ? `+${r.rewardChars.toLocaleString()}` : "—"}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <BonusCreditsInline userId={user.id} onAction={onAction} />
              <CustomCodeInline userId={user.id} currentCode={user.referralCode} onAction={onAction} />
              {user.affiliateType === "cash" && user.referralBalance > 0 && (
                <div style={{ ...s.card, padding: 16 }}>
                  <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 10 }}>
                    Comisión pendiente: <strong style={{ color: "#4ade80" }}>${(user.referralBalance / 100).toFixed(2)}</strong>
                  </p>
                  <button onClick={() => onAction("mark-paid", { userId: user.id })} style={s.btn("#16a34a")}>
                    <DollarSign size={12} /> Marcar pagado
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BonusCreditsInline({ userId, onAction }: { userId: string; onAction: (a: string, p?: Record<string, unknown>) => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    const n = parseInt(amount);
    if (!n || n < 1) return;
    setLoading(true);
    await onAction("bonus-credits", { userId, amount: n });
    setLoading(false); setDone(true); setAmount("");
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div style={{ ...s.card, padding: 16 }}>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 10, fontWeight: 600 }}>🎁 Añadir créditos bonus</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad de caracteres"
          style={{ ...s.input, flex: 1 }} type="number" min="1" />
        <button onClick={submit} disabled={loading || !amount} style={s.btn("#1d4ed8", { opacity: loading ? 0.6 : 1 })}>
          {done ? <Check size={12} color="#4ade80" /> : loading ? "..." : <><Gift size={12} /> Añadir</>}
        </button>
      </div>
    </div>
  );
}

function CustomCodeInline({ userId, currentCode, onAction }: {
  userId: string; currentCode: string | null;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  const [code, setCode] = useState(currentCode ?? "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr(""); setLoading(true);
    try { await onAction("custom-code", { userId, code }); setDone(true); setTimeout(() => setDone(false), 2000); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }

  return (
    <div style={{ ...s.card, padding: 16 }}>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 10, fontWeight: 600 }}>✏️ Código personalizado</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="MICOD1GO"
          style={{ ...s.input, flex: 1, textTransform: "uppercase" as const }} maxLength={12} />
        <button onClick={submit} disabled={loading || !code} style={s.btn("#374151", { opacity: loading ? 0.6 : 1 })}>
          {done ? <Check size={12} color="#4ade80" /> : loading ? "..." : <><Edit2 size={12} /> Guardar</>}
        </button>
      </div>
      {err && <p style={{ color: "#f87171", fontSize: 11, marginTop: 6 }}>{err}</p>}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AdminAfiliados() {
  const router = useRouter();
  const [tab, setTab] = useState<"standard" | "cash">("standard");
  const [users, setUsers] = useState<AffiliateUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterInvites, setFilterInvites] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [detailUser, setDetailUser] = useState<AffiliateUser | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://elitelabs.es";

  const flash = (msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/afiliados");
    if (res.status === 401 || res.status === 403) { router.push("/admin"); return; }
    if (!res.ok) { flash("Error cargando datos", false); setLoading(false); return; }
    const data = await res.json();
    setUsers(data.users);
    setStats(data.stats);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const doAction = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const userId = params.userId as string;
    setLoadingAction(`${action}-${userId}`);
    try {
      const res = await fetch("/api/admin/afiliados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, ...params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      flash("✓ " + (action === "new-code" ? `Nuevo código: ${data.referralCode}` :
        action === "custom-code" ? `Código: ${data.referralCode}` :
        action === "bonus-credits" ? `Créditos añadidos` :
        action === "set-type" ? `Tipo actualizado` :
        action === "mark-paid" ? `Pago registrado` : "Hecho"));
      await load();
      if (detailUser?.id === userId) {
        // refresh detail user
        const updated = users.find(u => u.id === userId);
        if (updated) setDetailUser(updated);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
      throw e;
    } finally {
      setLoadingAction(null);
    }
  }, [load, detailUser, users]);

  // Filter & sort
  const filtered = users
    .filter(u => (tab === "cash" ? u.affiliateType === "cash" : u.affiliateType !== "cash"))
    .filter(u => {
      if (search) {
        const q = search.toLowerCase();
        return u.email.toLowerCase().includes(q) || (u.referralCode ?? "").toLowerCase().includes(q);
      }
      return true;
    })
    .filter(u => filterPlan === "all" || u.plan === filterPlan)
    .filter(u => {
      if (filterInvites === "with") return u.inviteCount > 0;
      if (filterInvites === "without") return u.inviteCount === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "invites") return b.inviteCount - a.inviteCount;
      if (sortBy === "conversions") return b.conversionCount - a.conversionCount;
      if (sortBy === "generations") return b.generationCount - a.generationCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const isLoading = (action: string, id: string) => loadingAction === `${action}-${id}`;

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Feedback toast */}
      {feedback && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 10000, padding: "10px 18px",
          borderRadius: 10, fontWeight: 600, fontSize: 13,
          background: feedback.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
          color: feedback.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${feedback.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}` }}>
          {feedback.msg}
        </div>
      )}

      {detailUser && (
        <UserDetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onAction={async (action, params = {}) => { await doAction(action, { userId: detailUser.id, ...params }); }}
        />
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>
        {/* Back nav */}
        <button onClick={() => router.push("/admin")} style={{ ...s.btn("#0d0d0d"), marginBottom: 24 }}>
          <ArrowLeft size={13} /> Admin
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Afiliados</h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Gestión completa del programa de afiliados</p>
          </div>
          <button onClick={load} style={s.btn("#1a1a1a", { gap: 6 })}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "#0d0d0d",
          border: "1px solid #1a1a1a", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {([
            { key: "standard" as const, label: "Afiliados Estándar", count: stats?.totalStandard },
            { key: "cash" as const, label: "Afiliados Cash", count: stats?.totalCash },
          ]).map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "8px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "none", transition: "all 150ms",
              background: tab === key ? "#1a1a1a" : "transparent",
              color: tab === key ? "#fff" : "#555",
            }}>
              {label}
              {count !== undefined && (
                <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 6px", borderRadius: 999,
                  background: tab === key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                  color: tab === key ? "#fff" : "#555" }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {tab === "standard" ? (
              <>
                <StatCard label="Afiliados estándar" value={stats.totalStandard} />
                <StatCard label="Invitaciones totales" value={stats.totalInvites} />
                <StatCard label="Conversiones" value={stats.totalConversions} color="#4ade80" />
                <StatCard label="Tasa de conversión" value={`${stats.conversionRate}%`} color="#f59e0b" />
              </>
            ) : (
              <>
                <StatCard label="Afiliados cash" value={stats.totalCash} />
                <StatCard label="Comisión pendiente" value={`$${(stats.pendingCommission / 100).toFixed(2)}`} color="#f59e0b" />
                <StatCard label="Comisión pagada total" value={`$${(stats.paidCommission / 100).toFixed(2)}`} color="#4ade80" />
              </>
            )}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por email o código..."
              style={{ ...s.input, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
          </div>
          {[
            { value: filterPlan, setter: setFilterPlan, opts: [["all","Todos los planes"],["free","Free"],["starter","Starter"],["pro","Pro"],["elite","Elite"]] },
            { value: filterInvites, setter: setFilterInvites, opts: [["all","Todos"],["with","Con invitados"],["without","Sin invitados"]] },
            { value: sortBy, setter: setSortBy, opts: [["recent","Más reciente"],["invites","Más invitados"],["conversions","Más conversiones"],["generations","Más generaciones"]] },
          ].map(({ value, setter, opts }, i) => (
            <select key={i} value={value} onChange={e => setter(e.target.value)} style={{ ...s.input, cursor: "pointer" }}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <span style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>{filtered.length} usuario{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#555" }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...s.card, padding: 40, textAlign: "center", color: "#555" }}>
            No hay usuarios que coincidan con los filtros.
          </div>
        ) : (
          <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0d0d0d" }}>
                    {(tab === "standard"
                      ? ["Usuario", "Código / Enlace", "Invitados", "Conv.", "Créditos", "Gens.", "Plan", "Acciones"]
                      : ["Usuario", "Código", "Invitados / Conv.", "Pendiente", "Pagado total", "Estado", "Acciones"]
                    ).map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, idx) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      tab={tab}
                      idx={idx}
                      appUrl={appUrl}
                      isLoading={isLoading}
                      onDetail={() => setDetailUser(u)}
                      onAction={doAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── User Row ───────────────────────────────────────────── */
function UserRow({ user, tab, idx, appUrl, isLoading, onDetail, onAction }: {
  user: AffiliateUser; tab: "standard" | "cash"; idx: number; appUrl: string;
  isLoading: (a: string, id: string) => boolean;
  onDetail: () => void;
  onAction: (a: string, p?: Record<string, unknown>) => Promise<void>;
}) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [customCode, setCustomCode] = useState(user.referralCode ?? "");
  const [codeLoading, setCodeLoading] = useState(false);

  const refLink = user.referralCode ? `${appUrl}/?ref=${user.referralCode}` : null;
  const bg = idx % 2 === 0 ? "#0d0d0d" : "#111111";

  async function saveCustomCode() {
    setCodeLoading(true);
    try { await onAction("custom-code", { userId: user.id, code: customCode }); setShowCodeInput(false); }
    catch { /* handled by parent */ }
    setCodeLoading(false);
  }

  const commissionPending = (user.referralBalance / 100).toFixed(2);
  const commissionPaid = (Math.max(0, user.referralEarned - user.referralBalance) / 100).toFixed(2);
  const isUpToDate = user.referralBalance === 0;

  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: bg }}>
      {/* Usuario */}
      <td style={s.td}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
            {user.email[0].toUpperCase()}
          </div>
          <button onClick={onDetail} style={{ background: "none", border: "none", cursor: "pointer",
            color: "#e5e7eb", textAlign: "left", padding: 0, fontSize: 13 }}>
            <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {user.email}
            </span>
          </button>
        </div>
      </td>

      {/* Código */}
      <td style={s.td}>
        {showCodeInput ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())}
              style={{ ...s.input, padding: "3px 8px", width: 100, fontSize: 12 }} maxLength={12} />
            <button onClick={saveCustomCode} disabled={codeLoading} style={s.btn("#16a34a", { padding: "3px 6px" })}>
              {codeLoading ? "..." : <Check size={11} />}
            </button>
            <button onClick={() => setShowCodeInput(false)} style={s.btn("#1a1a1a", { padding: "3px 6px" })}>
              <X size={11} />
            </button>
          </div>
        ) : user.referralCode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <code style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#1a1a1a", padding: "1px 6px", borderRadius: 4 }}>
                {user.referralCode}
              </code>
              <CopyBtn text={user.referralCode} />
            </div>
            {refLink && tab === "standard" && (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 10, color: "#555", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {refLink}
                </span>
                <CopyBtn text={refLink} />
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "#555", fontSize: 12 }}>Sin código</span>
        )}
      </td>

      {tab === "standard" ? (
        <>
          <td style={s.td}><span style={{ color: user.inviteCount > 0 ? "#fff" : "#555" }}>{user.inviteCount}</span></td>
          <td style={s.td}>
            <span style={{ color: user.conversionCount > 0 ? "#4ade80" : "#555" }}>{user.conversionCount}</span>
            {user.inviteCount > 0 && (
              <span style={{ fontSize: 10, color: "#555", marginLeft: 4 }}>
                ({Math.round(user.conversionCount / user.inviteCount * 100)}%)
              </span>
            )}
          </td>
          <td style={s.td}><span style={{ color: user.creditsEarned > 0 ? "#f59e0b" : "#555" }}>
            {user.creditsEarned > 0 ? user.creditsEarned.toLocaleString("es-ES") : "—"}
          </span></td>
          <td style={s.td}><span style={{ color: "#9ca3af" }}>{user.generationCount.toLocaleString("es-ES")}</span></td>
          <td style={s.td}><PlanBadge plan={user.plan} /></td>
        </>
      ) : (
        <>
          <td style={s.td}>
            <span style={{ color: "#fff" }}>{user.inviteCount}</span>
            <span style={{ color: "#555", margin: "0 4px" }}>/</span>
            <span style={{ color: "#4ade80" }}>{user.conversionCount}</span>
          </td>
          <td style={s.td}>
            <span style={{ color: user.referralBalance > 0 ? "#f59e0b" : "#555", fontWeight: 700 }}>
              {user.referralBalance > 0 ? `$${commissionPending}` : "—"}
            </span>
          </td>
          <td style={s.td}><span style={{ color: "#9ca3af" }}>${commissionPaid}</span></td>
          <td style={s.td}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              color: isUpToDate ? "#4ade80" : "#f59e0b",
              background: isUpToDate ? "rgba(74,222,128,0.1)" : "rgba(245,158,11,0.1)" }}>
              {isUpToDate ? "Al día" : "Pendiente"}
            </span>
          </td>
        </>
      )}

      {/* Acciones */}
      <td style={{ ...s.td, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={onDetail} style={s.btn("#1a1a1a", { padding: "3px 8px" })} title="Ver perfil">
            <Eye size={11} /> Ver
          </button>
          <button
            onClick={() => onAction("new-code", { userId: user.id })}
            disabled={isLoading("new-code", user.id)}
            style={s.btn("#1a1a1a", { padding: "3px 8px", opacity: isLoading("new-code", user.id) ? 0.6 : 1 })}
            title="Nuevo código aleatorio"
          >
            <RefreshCw size={11} />
          </button>
          <button onClick={() => setShowCodeInput(v => !v)} style={s.btn("#1a1a1a", { padding: "3px 8px" })} title="Código personalizado">
            <Edit2 size={11} />
          </button>
          {tab === "standard" ? (
            <button
              onClick={() => onAction("set-type", { userId: user.id, type: "cash" })}
              disabled={isLoading("set-type", user.id)}
              style={s.btn("#78350f", { padding: "3px 8px", opacity: isLoading("set-type", user.id) ? 0.6 : 1 })}
              title="Convertir a afiliado cash"
            >
              <Star size={11} />
            </button>
          ) : (
            <>
              {user.referralBalance > 0 && (
                <button
                  onClick={() => onAction("mark-paid", { userId: user.id })}
                  disabled={isLoading("mark-paid", user.id)}
                  style={s.btn("#16a34a", { padding: "3px 8px", opacity: isLoading("mark-paid", user.id) ? 0.6 : 1 })}
                  title="Marcar comisión como pagada"
                >
                  <DollarSign size={11} />
                </button>
              )}
              <button
                onClick={() => onAction("set-type", { userId: user.id, type: "standard" })}
                disabled={isLoading("set-type", user.id)}
                style={s.btn("#374151", { padding: "3px 8px", opacity: isLoading("set-type", user.id) ? 0.6 : 1 })}
                title="Degradar a estándar"
              >
                <ChevronDown size={11} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
