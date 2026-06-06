"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "¡Hola! Soy el asistente de Elite Labs. ¿En qué puedo ayudarte hoy? 👋",
};

function DotsLoader() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: "50%", background: "#6b7280",
            animation: "chatDot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

function AiAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "8px", background: "#2563eb",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: 2, overflow: "hidden",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/elitelabs.png" alt="Elite Labs" style={{ width: 18, height: 18, objectFit: "contain" }} />
    </div>
  );
}

function UserAvatar({ imageUrl, firstName }: { imageUrl?: string | null; firstName?: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={firstName || "User"}
        style={{ width: 28, height: 28, borderRadius: "8px", objectFit: "cover", flexShrink: 0, marginTop: 2 }}
      />
    );
  }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "8px", background: "#f97316",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: 2, fontSize: 12, fontWeight: 700, color: "#fff",
    }}>
      {firstName?.[0]?.toUpperCase() ?? "U"}
    </div>
  );
}

export function SupportChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages([...history, { role: "assistant", content: data.message }]);
    } catch {
      setMessages([
        ...history,
        { role: "assistant", content: "Error al conectar. Contáctanos en soporte@elitelabs.es" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    /* Panel — no overlay, floats over content without blocking it */
    <div
      style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "380px",
        zIndex: 50, display: "flex", flexDirection: "column",
        background: "#09090b",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.7)",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AiAvatar />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#e5e7eb", lineHeight: 1.2 }}>Soporte Elite Labs</p>
            <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: 1.2 }}>Asistente con IA · Respuesta instantánea</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: "7px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {messages.map((msg, i) =>
          msg.role === "assistant" ? (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <AiAvatar />
              <div style={{
                maxWidth: "80%", padding: "9px 13px",
                borderRadius: "16px 16px 16px 4px",
                fontSize: "13px", lineHeight: 1.6,
                background: "rgba(39,39,42,0.9)",
                color: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(255,255,255,0.07)",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: "10px" }}>
              <div style={{
                maxWidth: "80%", padding: "9px 13px",
                borderRadius: "16px 16px 4px 16px",
                fontSize: "13px", lineHeight: 1.6,
                background: "#3f3f46",
                color: "#ffffff",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
              <UserAvatar imageUrl={user?.imageUrl} firstName={user?.firstName} />
            </div>
          )
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <AiAvatar />
            <div style={{ padding: "9px 14px", borderRadius: "16px 16px 16px 4px", background: "rgba(39,39,42,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <DotsLoader />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "12px", padding: "6px 6px 6px 12px" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e5e7eb", fontSize: "13px", minWidth: 0 }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 30, height: 30, borderRadius: "8px", border: "none",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              background: input.trim() && !loading ? "#3f3f46" : "rgba(255,255,255,0.06)",
              color: input.trim() && !loading ? "#ffffff" : "#4b5563",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s", flexShrink: 0,
            }}
          >
            <Send size={13} />
          </button>
        </div>
        <p style={{ fontSize: "10px", color: "#374151", textAlign: "center", marginTop: "8px" }}>
          Respuestas generadas por IA · Para soporte urgente: soporte@elitelabs.es
        </p>
      </div>
    </div>
  );
}
