"use client";

import { useState, useEffect, useCallback } from "react";
import { X, HelpCircle, Send, ChevronLeft, MessageSquare, ChevronDown } from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";

const FAQS = [
  {
    q: "¿Cómo funcionan los caracteres?",
    a: "Los caracteres se descuentan según el texto generado. 1 carácter = 1 letra o símbolo.",
  },
  {
    q: "¿Puedo cancelar mi suscripción?",
    a: "Sí, puedes cancelar en cualquier momento desde Facturación → Gestionar suscripción.",
  },
  {
    q: "El audio no se generó correctamente",
    a: "Si hubo un error, los créditos se devuelven automáticamente. Si no fue así, contacta con soporte indicando el ID del audio.",
  },
  {
    q: "¿Cuándo se renuevan mis caracteres?",
    a: "Los caracteres se renuevan cada mes en la fecha de tu suscripción.",
  },
  {
    q: "No puedo acceder a mi cuenta",
    a: "Intenta restablecer tu contraseña. Si el problema persiste, contacta con soporte.",
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#3a3a52", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Preguntas frecuentes</p>
      {FAQS.map((faq, i) => (
        <div key={i} style={{ borderRadius: "10px", border: "1px solid #1e1e2e", background: "#0d0d17", overflow: "hidden" }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: "8px" }}
          >
            <span style={{ fontSize: "13px", color: "#c9cad6", fontWeight: 500 }}>{faq.q}</span>
            <ChevronDown
              size={14}
              style={{ color: "#3a3a52", flexShrink: 0, transition: "transform 0.2s", transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          {open === i && (
            <div style={{ padding: "0 14px 12px", borderTop: "1px solid #1a1a28" }}>
              <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, paddingTop: "10px" }}>{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const TICKET_TYPES = [
  { value: "general",   label: "Ayuda general" },
  { value: "technical", label: "Problema técnico" },
  { value: "billing",   label: "Problema de facturación" },
  { value: "refund",    label: "Solicitar reembolso" },
  { value: "other",     label: "Otro" },
];

interface SupportTicket {
  id: string;
  type: string;
  description: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

type View = "menu" | "new" | "list";

export function SupportModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("menu");
  const [type, setType] = useState("general");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "list") fetchTickets();
  }, [view, fetchTickets]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setView("menu");
    setSuccess(false);
    setError(null);
  }

  const typeLabel = (val: string) => TICKET_TYPES.find(t => t.value === val)?.label ?? val;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.75)" }}
    >
      <div style={{ width: "100%", maxWidth: "480px", borderRadius: "20px", background: "#0d0d17", border: "1px solid #1e1e2e", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a28" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {view !== "menu" && (
              <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a4a65", padding: "2px", display: "flex", alignItems: "center" }}>
                <ChevronLeft size={16} />
              </button>
            )}
            <HelpCircle size={15} style={{ color: "#aaaaaa" }} />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#000000" }}>
              {view === "menu" ? "Soporte" : view === "new" ? "Nuevo ticket" : "Mis tickets"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#3a3a52", padding: "2px" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Menu ── */}
          {view === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <FaqAccordion />
              <div style={{ height: "1px", background: "#1a1a28", marginBottom: "2px" }} />
              <p style={{ fontSize: "13px", color: "#4a4a65", marginBottom: "4px" }}>¿En qué podemos ayudarte?</p>
              <button
                onClick={() => { setView("new"); setSuccess(false); }}
                style={{ padding: "14px 16px", borderRadius: "12px", border: "1px solid #2a2a3e", background: "#12121a", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e5e7eb", fontSize: "14px", fontWeight: 500 }}>
                  <Send size={14} style={{ color: "#aaaaaa", flexShrink: 0 }} />
                  Crear nuevo ticket
                </div>
                <p style={{ fontSize: "12px", color: "#4a4a65", marginTop: "4px", marginLeft: "24px" }}>Contacta con nuestro equipo</p>
              </button>
              <button
                onClick={() => setView("list")}
                style={{ padding: "14px 16px", borderRadius: "12px", border: "1px solid #2a2a3e", background: "#12121a", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e5e7eb", fontSize: "14px", fontWeight: 500 }}>
                  <MessageSquare size={14} style={{ color: "#aaaaaa", flexShrink: 0 }} />
                  Ver mis tickets
                </div>
                <p style={{ fontSize: "12px", color: "#4a4a65", marginTop: "4px", marginLeft: "24px" }}>Consulta el estado de tus solicitudes</p>
              </button>
            </div>
          )}

          {/* ── New ticket ── */}
          {view === "new" && (
            success ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Send size={20} style={{ color: "#4ade80" }} />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#000000", marginBottom: "8px" }}>¡Ticket enviado!</p>
                <p style={{ fontSize: "13px", color: "#4a4a65" }}>Te responderemos lo antes posible.</p>
                <button
                  onClick={goBack}
                  style={{ marginTop: "20px", padding: "10px 24px", borderRadius: "10px", border: "none", background: "#ffffff", color: "#000000", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >
                  Volver
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>Tipo de solicitud</label>
                  <CustomSelect
                    options={TICKET_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    value={type}
                    onChange={setType}
                    className="w-full"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b7280", marginBottom: "6px" }}>Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe tu problema o pregunta con el mayor detalle posible..."
                    rows={5}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", background: "#0a0a0f", border: "1px solid #2a2a3e", color: "#e5e7eb", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                {error && (
                  <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "13px" }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  style={{ padding: "12px", borderRadius: "10px", border: "none", background: "#ffffff", color: "#000000", fontSize: "14px", fontWeight: 600, cursor: loading || !description.trim() ? "not-allowed" : "pointer", opacity: loading || !description.trim() ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <Send size={13} />
                  {loading ? "Enviando..." : "Enviar solicitud"}
                </button>
              </form>
            )
          )}

          {/* ── Ticket list ── */}
          {view === "list" && (
            ticketsLoading ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "#4a4a65", fontSize: "13px" }}>Cargando tickets...</div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <p style={{ color: "#4a4a65", fontSize: "13px" }}>No tienes tickets abiertos.</p>
                <button
                  onClick={() => setView("new")}
                  style={{ marginTop: "12px", padding: "8px 20px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "transparent", color: "#aaaaaa", fontSize: "13px", cursor: "pointer" }}
                >
                  Crear uno ahora
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    style={{ padding: "14px", borderRadius: "12px", border: `1px solid ${ticket.status === "closed" ? "#1a1a28" : "#2a2a3e"}`, background: "#12121a" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>{typeLabel(ticket.type)}</span>
                      <span style={{
                        fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                        background: ticket.status === "closed" ? "rgba(107,114,128,0.12)" : "rgba(255,255,255,0.07)",
                        color: ticket.status === "closed" ? "#6b7280" : "#aaaaaa",
                        border: `1px solid ${ticket.status === "closed" ? "#2a2a3e" : "rgba(255,255,255,0.12)"}`,
                      }}>
                        {ticket.status === "closed" ? "CERRADO" : "ABIERTO"}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                      {ticket.description.length > 120 ? ticket.description.slice(0, 120) + "…" : ticket.description}
                    </p>
                    {ticket.adminReply && (
                      <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", marginTop: "10px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#aaaaaa", marginBottom: "4px", letterSpacing: "0.05em" }}>RESPUESTA DEL EQUIPO</p>
                        <p style={{ fontSize: "13px", color: "#aaaaaa", lineHeight: 1.5 }}>{ticket.adminReply}</p>
                      </div>
                    )}
                    <p style={{ fontSize: "11px", color: "#2e2e48", marginTop: "8px" }}>
                      {new Date(ticket.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
