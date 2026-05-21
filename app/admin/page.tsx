"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/* ─── Types ───────────────────────────────────────────────── */
interface AdminUser {
  id: string;
  email: string;
  credits: number;
  role: string;
  createdAt: string;
  _count: { generations: number };
  purchases: { amountCents: number }[];
}

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  totalCreditsConsumed: number;
  totalRevenueEuros: string;
}

/* ─── Helpers ─────────────────────────────────────────────── */
const card = {
  background: "#12121a",
  border: "1px solid #2a2a3e",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const input = {
  background: "#0d0d17",
  border: "1px solid #2a2a3e",
  borderRadius: "0.5rem",
  color: "#fff",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
} as const;

const btn = (color = "#3b82f6") =>
  ({
    background: color,
    border: "none",
    borderRadius: "0.5rem",
    color: "#fff",
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  } as const);

function Tag({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        background: isAdmin ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
        color: isAdmin ? "#93c5fd" : "#8888a8",
        border: `1px solid ${isAdmin ? "rgba(59,130,246,0.35)" : "#2a2a3e"}`,
      }}
    >
      {isAdmin ? "admin" : "user"}
    </span>
  );
}

/* ─── Main ────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Credits form
  const [creditUserId, setCreditUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditOp, setCreditOp] = useState<"add" | "subtract">("add");
  const [creditLoading, setCreditLoading] = useState(false);

  // Role form
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState<"admin" | "user">("admin");
  const [roleLoading, setRoleLoading] = useState(false);

  const toast = (msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    const [uRes, sRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/stats"),
    ]);
    if (uRes.status === 403 || uRes.status === 401) { setAuthorized(false); return; }
    setAuthorized(true);
    setUsers(await uRes.json());
    setStats(await sRes.json());
  }, []);

  useEffect(() => { if (isLoaded && user) fetchAll(); }, [isLoaded, user, fetchAll]);
  useEffect(() => { if (isLoaded && !user) router.push("/sign-in"); }, [isLoaded, user, router]);

  async function handleCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!creditUserId || !creditAmount) return;
    setCreditLoading(true);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: creditUserId, amount: Number(creditAmount), operation: creditOp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Créditos actualizados. Nuevo saldo: ${data.credits.toLocaleString("es-ES")}`);
      setCreditUserId(""); setCreditAmount("");
      fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", false);
    } finally { setCreditLoading(false); }
  }

  async function handleRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleUserId) return;
    setRoleLoading(true);
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: roleUserId, role: roleValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Rol actualizado a "${data.role}"`);
      setRoleUserId("");
      fetchAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", false);
    } finally { setRoleLoading(false); }
  }

  if (!isLoaded || authorized === null)
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8888a8" }}>Cargando...</p>
      </div>
    );

  if (authorized === false)
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "#f87171", fontSize: "1.25rem", fontWeight: 700 }}>Acceso denegado</p>
        <p style={{ color: "#8888a8" }}>Necesitas permisos de administrador.</p>
        <button style={btn()} onClick={() => router.push("/dashboard")}>Volver al dashboard</button>
      </div>
    );

  const filtered = users.filter(
    (u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #2a2a3e", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: "1.1rem" }}>Panel de Administración</p>
          <p style={{ color: "#555570", fontSize: "0.75rem" }}>Elite Labs — acceso restringido</p>
        </div>
        <button style={{ ...btn(), background: "#1a1a2e", border: "1px solid #2a2a3e" }} onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </button>
      </div>

      {/* Toast */}
      {feedback && (
        <div style={{
          position: "fixed", top: "5rem", right: "2rem", zIndex: 50,
          padding: "0.75rem 1.25rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.875rem",
          background: feedback.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
          color: feedback.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${feedback.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {feedback.msg}
        </div>
      )}

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Usuarios totales", value: stats.totalUsers.toLocaleString("es-ES") },
              { label: "Generaciones totales", value: stats.totalGenerations.toLocaleString("es-ES") },
              { label: "Créditos consumidos", value: stats.totalCreditsConsumed.toLocaleString("es-ES") },
              { label: "Ingresos estimados", value: `€${stats.totalRevenueEuros}` },
            ].map(({ label, value }) => (
              <div key={label} style={card}>
                <p style={{ color: "#555570", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>{label}</p>
                <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Management row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>

          {/* Credits */}
          <div style={card}>
            <p style={{ fontWeight: 700, marginBottom: "1rem" }}>Gestión de créditos</p>
            <form onSubmit={handleCredits} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>ID de usuario</label>
                <input
                  style={input}
                  placeholder="cuid del usuario"
                  value={creditUserId}
                  onChange={(e) => setCreditUserId(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>Cantidad</label>
                  <input
                    style={input}
                    type="number"
                    min="1"
                    placeholder="0"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>Operación</label>
                  <select
                    style={{ ...input }}
                    value={creditOp}
                    onChange={(e) => setCreditOp(e.target.value as "add" | "subtract")}
                  >
                    <option value="add">Añadir</option>
                    <option value="subtract">Quitar</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={creditLoading}
                style={{ ...btn(creditOp === "add" ? "#3b82f6" : "#ef4444"), opacity: creditLoading ? 0.6 : 1 }}
              >
                {creditLoading ? "Procesando..." : creditOp === "add" ? "Añadir créditos" : "Quitar créditos"}
              </button>
            </form>
          </div>

          {/* Role */}
          <div style={card}>
            <p style={{ fontWeight: 700, marginBottom: "1rem" }}>Gestión de roles</p>
            <form onSubmit={handleRole} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>ID de usuario</label>
                <input
                  style={input}
                  placeholder="cuid del usuario"
                  value={roleUserId}
                  onChange={(e) => setRoleUserId(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#8888a8", display: "block", marginBottom: "0.35rem" }}>Nuevo rol</label>
                <select
                  style={{ ...input }}
                  value={roleValue}
                  onChange={(e) => setRoleValue(e.target.value as "admin" | "user")}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={roleLoading}
                style={{ ...btn(), opacity: roleLoading ? 0.6 : 1 }}
              >
                {roleLoading ? "Actualizando..." : "Cambiar rol"}
              </button>
            </form>
          </div>
        </div>

        {/* Users table */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <p style={{ fontWeight: 700 }}>Usuarios ({filtered.length})</p>
            <input
              style={{ ...input, width: "260px" }}
              placeholder="Buscar por email o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                  {["ID", "Email", "Créditos", "Generaciones", "Ingresos", "Rol", "Registro"].map((h) => (
                    <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#555570", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const revenue = u.purchases.reduce((s, p) => s + p.amountCents, 0) / 100;
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid #1e1e2e" }}>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#555570", fontFamily: "monospace", fontSize: "0.7rem" }}>
                        <button
                          onClick={() => { navigator.clipboard.writeText(u.id); toast("ID copiado"); }}
                          title="Copiar ID"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#555570", fontFamily: "monospace" }}
                        >
                          {u.id.slice(0, 10)}…
                        </button>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#e5e7eb" }}>{u.email}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#93c5fd", fontWeight: 600 }}>{u.credits.toLocaleString("es-ES")}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{u._count.generations}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#4ade80" }}>€{revenue.toFixed(2)}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}><Tag role={u.role} /></td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#555570", whiteSpace: "nowrap" }}>
                        {new Date(u.createdAt).toLocaleDateString("es-ES")}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#555570" }}>
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
