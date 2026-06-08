"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, MessageSquare, ChevronRight } from "lucide-react";
import { useLang } from "../LanguageContext";

interface Ticket {
  id: string;
  type: string;
  description: string;
  status: string;
  adminReply: string | null;
  messages: Array<{ role: string; content: string; createdAt: string }>;
  createdAt: string;
}

function StatusBadge({ status, messages, t }: { status: string; messages: Ticket["messages"]; t: Record<string, string> }) {
  const hasAdminReply = messages?.some(m => m.role === "admin");
  if (status === "closed") return <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#555" }}>{t.statusClosed}</span>;
  if (hasAdminReply) return <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>Respondido</span>;
  return <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>{t.statusOpen}</span>;
}

function NewCaseModal({ onClose, onCreated, t }: { onClose: () => void; onCreated: () => void; t: Record<string, string> }) {
  const TYPE_OPTIONS = [
    { value: "general", label: t.typeGeneral },
    { value: "technical", label: t.typeTechnical },
    { value: "billing", label: t.typeBilling },
    { value: "refund", label: t.typeRefund },
    { value: "other", label: t.typeOther },
  ];
  const [type, setType] = useState("general");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setError(t.descRequired); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || t.errorSend); }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorSend);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: "520px", background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", margin: 0 }}>{t.newCaseTitle}</h2>
            <p style={{ fontSize: "13px", color: "#555", margin: "4px 0 0" }}>{t.newCaseDesc}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "4px", display: "flex" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.category}</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "14px", padding: "10px 12px", outline: "none", cursor: "pointer" }}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.description}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.descPlaceholder} rows={5} style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "14px", padding: "10px 12px", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          {error && <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "12px" }}>{error}</p>}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#888", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>{t.cancel}</button>
            <button type="submit" disabled={loading} style={{ padding: "9px 18px", borderRadius: "10px", border: "none", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? t.sending : t.submitRequest}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const { t } = useLang();
  const s = t.support;
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatus] = useState("all");
  const [typeFilter, setType] = useState("all");

  const TYPE_LABELS: Record<string, string> = {
    general: s.typeGeneral, technical: s.typeTechnical,
    billing: s.typeBilling, refund: s.typeRefund, other: s.typeOther,
  };

  const STATUS_OPTIONS = [
    { value: "all", label: s.allStatuses },
    { value: "open", label: s.statusOpen },
    { value: "closed", label: s.statusClosed },
  ];

  const CATEGORY_OPTIONS = [
    { value: "all", label: s.allCategories },
    { value: "general", label: s.typeGeneral },
    { value: "technical", label: s.typeTechnical },
    { value: "billing", label: s.typeBilling },
    { value: "refund", label: s.typeRefund },
    { value: "other", label: s.typeOther },
  ];

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch { setTickets([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const filtered = tickets.filter(t => {
    if (statusFilter !== "all") {
      const hasAdmin = t.messages?.some(m => m.role === "admin");
      const effectiveStatus = t.status === "closed" ? "closed" : hasAdmin ? "replied" : "open";
      if (statusFilter === "open" && effectiveStatus !== "open") return false;
      if (statusFilter === "closed" && effectiveStatus !== "closed") return false;
    }
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#555", textDecoration: "none", marginBottom: "24px" }} onMouseEnter={e => (e.currentTarget.style.color = "#fff")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>{s.supportCases}</h1>
          <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>{s.supportDesc}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "10px", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0 }}>
          <Plus size={14} /> {s.newCase}
        </button>
      </div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: statusFilter === "all" ? "#666" : "#fff", fontSize: "13px", padding: "7px 12px", cursor: "pointer", outline: "none" }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setType(e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: typeFilter === "all" ? "#666" : "#fff", fontSize: "13px", padding: "7px 12px", cursor: "pointer", outline: "none" }}>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={22} style={{ color: "#333" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>{s.noCasesYet}</p>
            <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>{tickets.length > 0 ? s.allCategories : s.noCasesDesc}</p>
          </div>
          {tickets.length === 0 && (
            <button onClick={() => setShowModal(true)} style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "10px", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer" }}>
              <Plus size={14} /> {s.newCase}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(ticket => {
            const lastMsg = ticket.messages?.slice(-1)[0];
            const msgCount = ticket.messages?.length ?? 0;
            return (
              <div key={ticket.id} onClick={() => router.push("/dashboard/support/" + ticket.id)} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "18px 20px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "#141414"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "#111"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "#444", fontFamily: "monospace" }}>CASE ID: {ticket.id.slice(-8).toUpperCase()}</span>
                      <span style={{ fontSize: "11px", color: "#555", padding: "2px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>{TYPE_LABELS[ticket.type] ?? ticket.type}</span>
                      <StatusBadge status={ticket.status} messages={ticket.messages ?? []} t={s} />
                    </div>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "#fff", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.description.slice(0, 80)}</p>
                    {lastMsg && <p style={{ fontSize: "13px", color: "#555", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastMsg.role === "admin" ? s.supportPrefix : s.youPrefix}{lastMsg.content.slice(0, 100)}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                    <ChevronRight size={16} style={{ color: "#333" }} />
                    <span style={{ fontSize: "12px", color: "#444" }}>{new Date(ticket.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {msgCount > 0 && <span style={{ fontSize: "11px", color: "#555" }}>{msgCount} {msgCount === 1 ? s.message : s.messages}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showModal && <NewCaseModal onClose={() => setShowModal(false)} onCreated={fetchTickets} t={s} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
