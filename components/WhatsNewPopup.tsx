"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/app/dashboard/LanguageContext";
import { X } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

// Force safe link attributes after every sanitization pass (module-level, runs once)
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

interface Announcement {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
}

export function WhatsNewPopup() {
  const { lang } = useLang();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/announcements")
      .then(r => r.json())
      .then(d => {
        if (d.announcement) {
          setAnnouncement(d.announcement);
          setTimeout(() => setVisible(true), 800);
        }
      })
      .catch(() => {});
  }, [mounted]);

  async function handleClose() {
    setVisible(false);
    if (announcement) {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
    }
    setTimeout(() => setAnnouncement(null), 400);
  }

  if (!mounted || !announcement) return null;

  const currentLang = lang ?? "es";
  const title = announcement.title[currentLang] ?? announcement.title["en"] ?? "";
  const content = announcement.content[currentLang] ?? announcement.content["en"] ?? "";

  function renderContent(text: string) {
    return text.split("\n\n").map((block, i) => {
      const formatted = block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      const clean = DOMPurify.sanitize(formatted, {
        ALLOWED_TAGS: ["strong", "b", "em", "i", "br", "a"],
        ALLOWED_ATTR: ["href", "target", "rel"],
      });
      return (
        <p
          key={i}
          style={{ margin: "0 0 10px 0", fontSize: "13px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      );
    });
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(4px)" : "none",
        transition: "all 0.3s ease",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "440px",
          background: "rgba(18,18,18,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "20px",
          padding: "28px 28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(16px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "rgba(255,255,255,0.06)", border: "none",
            borderRadius: "50%", width: "28px", height: "28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.5)",
          }}
        >
          <X size={14} />
        </button>

        <div style={{ marginBottom: "16px" }}>
          <span style={{
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
          }}>
            Novedades
          </span>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: "4px 0 0 0", lineHeight: 1.3 }}>
            {title}
          </h2>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "16px", marginBottom: "20px" }}>
          {renderContent(content)}
        </div>

        <button
          onClick={handleClose}
          style={{
            width: "100%", padding: "12px",
            borderRadius: "12px", border: "none",
            background: "#ffffff", color: "#000000",
            fontWeight: 700, fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Entendido 👍
        </button>
      </div>
    </div>
  );
}
