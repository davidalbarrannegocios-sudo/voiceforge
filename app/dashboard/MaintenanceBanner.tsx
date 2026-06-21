"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function MaintenanceBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/system-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.maintenanceMessageActive && d.maintenanceMessage?.trim()) {
          setMessage(d.maintenanceMessage.trim());
        }
      })
      .catch(() => {});
  }, []);

  if (!message) return null;

  return (
    <div
      style={{
        background: "rgba(234,179,8,0.08)",
        borderBottom: "1px solid rgba(234,179,8,0.15)",
        height: "36px",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <AlertTriangle size={13} color="#a16207" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {message}
      </span>
    </div>
  );
}
