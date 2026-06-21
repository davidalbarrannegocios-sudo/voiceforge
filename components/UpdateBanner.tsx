"use client";
import { useEffect, useState } from "react";

export function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkForUpdate = async () => {
      try {
        const res = await fetch("/api/build-id?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = await res.json();
        const stored = sessionStorage.getItem("__build_id");
        if (!stored) {
          sessionStorage.setItem("__build_id", buildId);
        } else if (stored !== buildId) {
          console.log("[UpdateBanner] Nueva versión detectada, mostrando banner");
          setShow(true);
        }
      } catch {}
    };

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 30 * 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted || !show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "rgba(15, 15, 15, 0.75)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "14px",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      maxWidth: "calc(100vw - 48px)",
    }}>
      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.80)", fontWeight: 400, whiteSpace: "nowrap" }}>
        Hay una nueva versión disponible de la web, actualiza para disfrutar de todas las funciones.
      </span>
      <button
        onClick={() => {
          sessionStorage.removeItem("__build_id");
          window.location.reload();
        }}
        style={{
          fontSize: "12px",
          fontWeight: 700,
          padding: "6px 14px",
          borderRadius: "8px",
          border: "none",
          background: "#ffffff",
          color: "#000000",
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Actualizar
      </button>
      <button
        onClick={() => setShow(false)}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.35)",
          cursor: "pointer",
          fontSize: "16px",
          lineHeight: 1,
          padding: "0",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
