"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, RefreshCw, User, Headphones } from "lucide-react";

interface TicketMessage {
  role: "user" | "admin";
  content: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  type: string;
  description: string;
  status: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  general: "Ayuda general",
  technical: "Problema técnico",
  billing: "Facturación",
  refund: "Reembolso",
  other: "Otro",
};

function StatusBadge({ status, messages }: { status: string; messages: TicketMessage[] }) {
  const hasAdmin = messages?.some(m => m.role === "admin");
  if (status === "closed") return <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#555" }}>Resuelto</span>;
  if (hasAdmin) return <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>Respondido</span>;
  return <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>Abierto</span>;
}

export default function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch("/api/support/" + id);
      if (!res.ok) { router.push("/dashboard/support"); return; }
      setTicket(await res.json());
    } catch { router.push("/dashboard/support"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTicket(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/support/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (!res.ok) throw new Error("Error al enviar");
      setTicket(await res.json());
      setReply("");
    } catch { setError("No se pudo enviar el mensaje. Inténtalo de nuevo."); }
    finally { setSending(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ width: "22px", height: "22px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!ticket) return null;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: "760px", width: "100%", margin: "0 auto" }}>
      <Link href="/dashboard/support" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#555", textDecoration: "none", marginBottom: "24px" }} onMouseEnter={e => (e.currentTarget.style.color = "#fff")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
        <ArrowLeft size={14} /> Back to support cases
      </Link>

      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "22px 24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "#444", fontFamily: "monospace" }}>Case ID: {ticket.id.slice(-8).toUpperCase()}</span>
          <button onClick={fetchTicket} style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: "2px", display: "flex" }} title="Actualizar"><RefreshCw size={12} /></button>
        </div>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{TYPE_LABELS[ticket.type] ?? ticket.type}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <StatusBadge status={ticket.status} messages={messages} />
          <span style={{ fontSize: "12px", color: "#444" }}>
            Actualizado {new Date(ticket.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>Timeline</h2>
        </div>
        <div style={{ padding: "8px 0" }}>
          {messages.length === 0 ? (
            <p style={{ padding: "24px", fontSize: "13px", color: "#555", textAlign: "center" }}>No hay mensajes aún.</p>
          ) : messages.map((msg, i) => (
            <div key={i} style={{ padding: "16px 24px", borderBottom: i < messages.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "admin" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.08)", border: "1px solid " + (msg.role === "admin" ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.1)") }}>
                {msg.role === "admin" ? <Headphones size={14} style={{ color: "#60a5fa" }} /> : <User size={14} style={{ color: "#888" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: msg.role === "admin" ? "#60a5fa" : "#ccc" }}>{msg.role === "admin" ? "Support Team" : "Tú"}</span>
                  <span style={{ fontSize: "11px", color: "#444" }}>{new Date(msg.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p style={{ fontSize: "14px", color: "#bbb", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {ticket.status !== "closed" ? (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px 24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Send size={14} style={{ color: "#555" }} /> Add a reply
          </h3>
          <form onSubmit={handleReply}>
            <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write your reply..." rows={5} style={{ width: "100%", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#fff", fontSize: "14px", padding: "12px 14px", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6 }} />
            {error && <p style={{ fontSize: "13px", color: "#f87171", margin: "8px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button type="submit" disabled={sending || !reply.trim()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "#fff", color: "#000", fontSize: "13px", fontWeight: 700, cursor: sending || !reply.trim() ? "not-allowed" : "pointer", opacity: sending || !reply.trim() ? 0.5 : 1 }}>
                <Send size={13} /> {sending ? "Enviando..." : "Send reply"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>Este caso está cerrado. Si necesitas más ayuda, abre un nuevo caso.</p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
