"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RefreshCw, Trash2 } from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */
interface FishModel {
  _id: string;
  title: string;
  created_at: string;
  visibility: string;
  state: string;
}
interface Assignment {
  clonedVoiceId: string;
  userId: string;
  name: string;
  gender: string;
  language: string;
}
interface DBUser {
  id: string;
  email: string;
}

/* ─── Suggestion rules ───────────────────────────────────── */
// Map Fish Audio model title patterns to email hints
const SUGGESTIONS: [RegExp, string][] = [
  [/^isra$/i,                                   "israelclavijo92@gmail.com"],
  [/^(boxeo|jlj)$/i,                            "albarranjimenezd@gmail.com"],
  [/^(mega|mega pro|megaa|megapro|mega ultra pro|megaproyectos|megaproyectos\s*\d*)$/i,
                                                "aterrizajefatal00@gmail.com"],
  [/^(sonia|clyde|portugues|ingles|tests?(\s*2)?|klkkl|ref-\d+)$/i,
                                                "voiceiadelegado@gmail.com"],
];

function suggestEmail(title: string): string | null {
  for (const [re, email] of SUGGESTIONS) {
    if (re.test(title.trim())) return email;
  }
  return null;
}

/* ─── Style helpers (matches /admin style) ───────────────── */
const S = {
  page:  { minHeight: "100vh", background: "#000000", color: "#fff", fontFamily: "Inter, sans-serif", padding: "2rem" } as const,
  card:  { background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem", padding: "1.5rem" } as const,
  input: { background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#fff", padding: "0.4rem 0.6rem", fontSize: "0.8rem", outline: "none" } as const,
  btn:   (bg = "#ffffff", extra: React.CSSProperties = {}) => ({ background: bg, border: "none", borderRadius: "0.5rem", color: bg === "#ffffff" ? "#000" : "#fff", padding: "0.45rem 0.9rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", ...extra } as const),
};

/* ─── Row component ──────────────────────────────────────── */
function ModelRow({
  model,
  users,
  assignment,
  suggestedEmail,
  onSave,
  onDelete,
}: {
  model: FishModel;
  users: DBUser[];
  assignment: Assignment | null;
  suggestedEmail: string | null;
  onSave: (modelId: string, userId: string, name: string, gender: string, language: string) => Promise<void>;
  onDelete: (modelId: string) => Promise<void>;
}) {
  const suggested = users.find(u => u.email === suggestedEmail);

  const [selectedUserId, setSelectedUserId] = useState(
    assignment?.userId ?? suggested?.id ?? ""
  );
  const [voiceName, setVoiceName] = useState(assignment?.name ?? model.title);
  const [gender, setGender]       = useState(assignment?.gender ?? "masculine");
  const [language, setLanguage]   = useState(assignment?.language ?? "es");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [saved, setSaved]         = useState(false);

  const isNew     = !assignment;
  const isSuggested = !assignment && !!suggested;
  const isDirty   = assignment
    ? (selectedUserId !== assignment.userId || voiceName !== assignment.name || gender !== assignment.gender || language !== assignment.language)
    : !!selectedUserId;

  async function handleSave() {
    if (!selectedUserId || !voiceName) return;
    setSaving(true);
    try {
      await onSave(model._id, selectedUserId, voiceName, gender, language);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(model._id); }
    finally { setDeleting(false); }
  }

  const assignedUser = users.find(u => u.id === (assignment?.userId ?? ""));

  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Model info */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#fff" }}>{model.title}</div>
        <div style={{ fontSize: "0.7rem", color: "#555", fontFamily: "monospace", marginTop: 2 }}>{model._id.slice(0, 16)}…</div>
      </td>
      <td style={{ padding: "10px 12px", verticalAlign: "middle", color: "#666", fontSize: "0.75rem" }}>
        {model.created_at.slice(0, 10)}
      </td>

      {/* Current assignment badge */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
        {assignment ? (
          <span style={{ fontSize: "0.75rem", color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6, padding: "2px 8px" }}>
            {assignedUser?.email ?? assignment.userId}
          </span>
        ) : isSuggested ? (
          <span style={{ fontSize: "0.75rem", color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, padding: "2px 8px" }}>
            sugerido: {suggestedEmail}
          </span>
        ) : (
          <span style={{ fontSize: "0.75rem", color: "#555" }}>sin asignar</span>
        )}
      </td>

      {/* User dropdown */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle", minWidth: 220 }}>
        <select
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          style={{ ...S.input, width: "100%" }}
        >
          <option value="">— Seleccionar usuario —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>
      </td>

      {/* Voice name */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle", minWidth: 140 }}>
        <input
          value={voiceName}
          onChange={e => setVoiceName(e.target.value)}
          style={{ ...S.input, width: "100%" }}
          placeholder="Nombre de voz"
        />
      </td>

      {/* Gender */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
        <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...S.input, width: 110 }}>
          <option value="masculine">Masculino</option>
          <option value="feminine">Femenino</option>
          <option value="neutral">Neutro</option>
        </select>
      </td>

      {/* Language */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
        <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...S.input, width: 80 }}>
          <option value="es">ES</option>
          <option value="en">EN</option>
          <option value="pt">PT</option>
          <option value="fr">FR</option>
          <option value="de">DE</option>
        </select>
      </td>

      {/* Actions */}
      <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty || !selectedUserId}
            style={S.btn(saved ? "#4ade80" : "#ffffff", {
              opacity: (!isDirty || !selectedUserId) ? 0.4 : 1,
              display: "flex", alignItems: "center", gap: 4,
            })}
          >
            {saving ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : saved ? <Check size={12} /> : null}
            {saving ? "…" : saved ? "Guardado" : isNew ? "Asignar" : "Actualizar"}
          </button>
          {assignment && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={S.btn("#ef4444", { padding: "0.45rem 0.6rem", opacity: deleting ? 0.5 : 1 })}
              title="Quitar asignación"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function RestoreVoicesPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [fishModels, setFishModels]   = useState<FishModel[]>([]);
  const [assigned, setAssigned]       = useState<Record<string, Assignment>>({});
  const [users, setUsers]             = useState<DBUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/restore-voices");
      if (res.status === 401 || res.status === 403) { setAuthorized(false); return; }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setFishModels(data.fishModels ?? []);
      setAssigned(data.assigned ?? {});
      setUsers(data.users ?? []);
      setAuthorized(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isLoaded && user) fetchData(); }, [isLoaded, user, fetchData]);
  useEffect(() => { if (isLoaded && !user) router.push("/sign-in"); }, [isLoaded, user, router]);

  async function handleSave(modelId: string, userId: string, name: string, gender: string, language: string) {
    const res = await fetch("/api/admin/restore-voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, userId, voiceName: name, gender, language }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setAssigned(prev => ({
      ...prev,
      [modelId]: { clonedVoiceId: data.voice.id, userId, name, gender, language },
    }));
  }

  async function handleDelete(modelId: string) {
    const res = await fetch("/api/admin/restore-voices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    });
    if (!res.ok) throw new Error(await res.text());
    setAssigned(prev => { const n = { ...prev }; delete n[modelId]; return n; });
  }

  if (!isLoaded || authorized === null) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#888" }}>Cargando…</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "#f87171", fontWeight: 700, fontSize: "1.25rem" }}>Acceso denegado</p>
        <button style={S.btn()} onClick={() => router.push("/dashboard")}>Volver al dashboard</button>
      </div>
    );
  }

  const totalAssigned   = Object.keys(assigned).length;
  const totalSuggested  = fishModels.filter(m => !assigned[m._id] && suggestEmail(m.title)).length;
  const totalUnassigned = fishModels.length - totalAssigned;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #1a1a1a; color: #fff; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => router.push("/admin")} style={S.btn("#1a1a1a", { border: "1px solid rgba(255,255,255,0.1)", color: "#888", display: "flex", alignItems: "center", gap: 6 })}>
          <ArrowLeft size={14} /> Admin
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Restaurar Voces Clonadas</h1>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#555", marginTop: 2 }}>
            Asigna cada modelo de Fish Audio a su usuario propietario.
          </p>
        </div>
        <button onClick={fetchData} disabled={loading} style={S.btn("#1a1a1a", { marginLeft: "auto", border: "1px solid rgba(255,255,255,0.1)", color: "#888", display: "flex", alignItems: "center", gap: 6 })}>
          <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          Recargar
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { label: "Modelos en Fish Audio", value: fishModels.length, color: "#aaa" },
          { label: "Asignados", value: totalAssigned, color: "#4ade80" },
          { label: "Con sugerencia", value: totalSuggested, color: "#fbbf24" },
          { label: "Sin asignar", value: totalUnassigned, color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: "0.72rem", color: "#555" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...S.card, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", marginBottom: "1rem" }}>
          <p style={{ color: "#f87171", margin: 0, fontSize: "0.875rem" }}>{error}</p>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.75rem", color: "#555" }}>
        <span><span style={{ color: "#4ade80" }}>●</span> Asignado</span>
        <span><span style={{ color: "#fbbf24" }}>●</span> Pre-asignación sugerida (confirmar antes de guardar)</span>
        <span><span style={{ color: "#555" }}>●</span> Sin asignar</span>
      </div>

      {/* Table */}
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555" }}>Cargando modelos de Fish Audio…</div>
        ) : fishModels.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555" }}>No se encontraron modelos en Fish Audio.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0a0a0a" }}>
                  {["Modelo", "Creado", "Estado actual", "Asignar a usuario", "Nombre en app", "Género", "Idioma", "Acción"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#555", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fishModels.map(model => (
                  <ModelRow
                    key={model._id}
                    model={model}
                    users={users}
                    assignment={assigned[model._id] ?? null}
                    suggestedEmail={suggestEmail(model.title)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#444", lineHeight: 1.6 }}>
        Las sugerencias se basan en el nombre del modelo. Verifica antes de guardar.
        El Fish Audio model ID se usa como <code style={{ color: "#666" }}>referenceAudioUrl</code> en la tabla{" "}
        <code style={{ color: "#666" }}>ClonedVoice</code> — es el identificador que el generador de voz usa como{" "}
        <code style={{ color: "#666" }}>referenceId</code>.
      </p>
    </div>
  );
}
