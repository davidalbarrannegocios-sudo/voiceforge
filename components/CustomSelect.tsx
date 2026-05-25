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
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  function close() {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 160);
  }

  function handleOpen() {
    if (open) { close(); return; }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOpenUp(rect.bottom + 256 > window.innerHeight);
    }
    setOpen(true);
  }

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

  const panelPos: CSSProperties = openUp
    ? { bottom: "calc(100% + 6px)", transformOrigin: "bottom" }
    : { top: "calc(100% + 6px)", transformOrigin: "top" };

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

      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            background: "#1a1a2e",
            border: "1px solid #2a2a3e",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 9999,
            maxHeight: "240px",
            overflowY: "auto",
            padding: "4px 0",
            scrollbarWidth: "thin",
            scrollbarColor: "#3b82f6 transparent",
            animation: `${closing ? "csClose" : "csOpen"} ${closing ? "160ms ease-in" : "180ms ease-out"} forwards`,
            ...panelPos,
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
