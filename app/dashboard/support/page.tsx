"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Paperclip, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  type: string;
  description: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  general:   "Ayuda general",
  technical: "Problema técnico",
  billing:   "Facturación",
  refund:    "Reembolso",
  other:     "Otro",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS = [
  { value: "all",    label: "All statuses" },
  { value: "open",   label: "Abierto" },
  { value: "closed", label: "Cerrado" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  ...TYPE_OPTIONS,
];

function StatusBadge({ status, adminReply }: { status: string; adminReply: string | null }) {
  const hasReply = !!adminReply;
  if (status === "closed") {
    return (
      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#666" }}>
        Cerrado
      </span>
    );
  }
  if (hasReply) {
    return (
      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>
        Respondido
      </span>
    );
  }
  return (
    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
      Abierto
    </span>
  );
}

function NewCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType]               = useState("general");
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setError("La descripción es obligatoria."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al crear el caso.");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: "520px", background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px", position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", margin: 0 }}>Nuevo caso de soporte</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "4px 0 0" }}>Te responderemos lo antes posible</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "4px", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Tipo de solicitud
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "14px", padding: "10px 12px", outline: "none", cursor: "pointer" }}
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Descripción
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe tu problema con el mayor detalle posible..."
              rows={5}
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "14px", padding: "10px 12px", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* Attachments placeholder */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Adjuntos <span style={{ color: "#444", fontWeight: 400, textTransform: "none" }}>(opcional)</span>
            </label>
            <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#444", fontSize: "13px", cursor: "default" }}>
              <Paperclip size={14} />
              <span>Arrastra archivos aquí o haz clic para seleccionar</span>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "12px" }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#888", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "9px 18px", borderRadius: "10px", border: "none", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [statusFilter, setStatus]   = useState("all");
  const [typeFilter, setType]       = useState("all");

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const filtered = tickets.filter(t => {
    if (statusFilter !== "all") {
      const hasReply = !!t.adminReply;
      const effectiveStatus = t.status === "closed" ? "closed" : hasReply ? "replied" : "open";
      if (statusFilter === "open" && effectiveStatus !== "open") return false;
      if (statusFilter === "closed" && effectiveStatus !== "closed") return false;
    }
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
      {/* Back link */}
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#555", textDecoration: "none", marginBottom: "24px" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={e => (e.currentTarget.style.color = "#555")}
      >
        <ArrowLeft size={14} /> Dashboard
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Support cases</h1>
          <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>
            Gestiona tus solicitudes de soporte. Respondemos en menos de 24h.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "10px", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Plus size={14} /> New case
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: statusFilter === "all" ? "#888" : "#fff", fontSize: "13px", padding: "7px 12px", cursor: "pointer", outline: "none" }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setType(e.target.value)}
          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: typeFilter === "all" ? "#888" : "#fff", fontSize: "13px", padding: "7px 12px", cursor: "pointer", outline: "none" }}
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={22} style={{ color: "#333" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>No support cases yet</p>
            <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>
              {tickets.length > 0 ? "No hay casos con los filtros actuales." : "¿Necesitas ayuda? Abre un nuevo caso y te ayudamos."}
            </p>
          </div>
          {tickets.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "10px", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              <Plus size={14} /> New case
            </button>
          )}
        </div>
      ) : (
        /* Ticket list */
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px 120px 110px", gap: "16px", padding: "10px 20px", background: "#0d0d0d" }}>
            {["Case #", "Descripción", "Categoría", "Estado", "Fecha"].map(h => (
              <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {filtered.map(ticket => (
            <div
              key={ticket.id}
              style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px 120px 110px", gap: "16px", padding: "14px 20px", background: "#111", borderTop: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#141414")}
              onMouseLeave={e => (e.currentTarget.style.background = "#111")}
            >
              <span style={{ fontSize: "12px", color: "#555", fontFamily: "monospace", alignSelf: "center" }}>#{ticket.id.slice(-6).toUpperCase()}</span>
              <div style={{ minWidth: 0, alignSelf: "center" }}>
                <p style={{ fontSize: "13px", color: "#ccc", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.description}</p>
                {ticket.adminReply && (
                  <p style={{ fontSize: "11px", color: "#60a5fa", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Respuesta: {ticket.adminReply}
                  </p>
                )}
              </div>
              <span style={{ fontSize: "12px", color: "#666", alignSelf: "center" }}>{TYPE_LABELS[ticket.type] ?? ticket.type}</span>
              <div style={{ alignSelf: "center" }}>
                <StatusBadge status={ticket.status} adminReply={ticket.adminReply} />
              </div>
              <span style={{ fontSize: "12px", color: "#555", alignSelf: "center" }}>
                {new Date(ticket.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewCaseModal onClose={() => setShowModal(false)} onCreated={fetchTickets} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
