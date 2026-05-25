"use client";

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

export function CustomSelect({ options, value, onChange, placeholder, className, style }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const MAX_H = 200;

  function close() {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 160);
  }

  function handleOpen() {
    if (open) { close(); return; }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < MAX_H + 12);
      setPanelRect(rect);
    }
    setOpen(true);
  }

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUp(spaceBelow < MAX_H + 12);
        setPanelRect(rect);
      }
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Fixed-position panel breaks out of any overflow:hidden ancestor (e.g. modals)
  const panelStyle: CSSProperties = panelRect
    ? openUp
      ? {
          position: "fixed",
          left: panelRect.left,
          width: panelRect.width,
          bottom: window.innerHeight - panelRect.top + 6,
          transformOrigin: "bottom",
        }
      : {
          position: "fixed",
          left: panelRect.left,
          width: panelRect.width,
          top: panelRect.bottom + 6,
          transformOrigin: "top",
        }
    : {};

  return (
    <div className={`relative ${className ?? ""}`} style={style} ref={containerRef}>
      <style>{`
        @keyframes csOpen  { from { opacity:0; transform:scaleY(0.88); } to { opacity:1; transform:scaleY(1); } }
        @keyframes csClose { from { opacity:1; transform:scaleY(1); } to { opacity:0; transform:scaleY(0.88); } }
      `}</style>

      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        style={{ background: "#0a0a0f", border: "1px solid #2a2a3e" }}
      >
        {selected?.icon && <span className="flex-shrink-0 flex items-center">{selected.icon}</span>}
        <span className="flex-1 text-left truncate" style={{ color: selected ? "#e5e7eb" : "#6b7280" }}>
          {selected?.label ?? placeholder ?? "Seleccionar..."}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "#8888a8",
            flexShrink: 0,
            transition: "transform 180ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && panelRect && (
        <div
          style={{
            ...panelStyle,
            background: "#1a1a2e",
            border: "1px solid #2a2a3e",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 99999,
            maxHeight: `${MAX_H}px`,
            overflowY: "auto",
            padding: "4px 0",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.2) transparent",
            animation: `${closing ? "csClose" : "csOpen"} ${closing ? "160ms ease-in" : "180ms ease-out"} forwards`,
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); close(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left"
                style={{ color: isSelected ? "#93c5fd" : "#d1d5db" }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {opt.icon && <span className="flex-shrink-0 flex items-center">{opt.icon}</span>}
                <span className="flex-1">{opt.label}</span>
                {isSelected && <Check size={12} style={{ color: "#93c5fd", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
