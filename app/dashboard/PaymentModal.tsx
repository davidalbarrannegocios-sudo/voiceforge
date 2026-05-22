"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface BillingPlan {
  key: string;
  name: string;
  price: number;
  characters: number;
}

export function PaymentModal({
  plan,
  onClose,
}: {
  plan: BillingPlan;
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan.key }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setError(data.error ?? "No se pudo iniciar el pago");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Error de conexión. Inténtalo de nuevo.");
      });

    return () => { cancelled = true; };
  }, [plan.key]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.75)" }}
    >
      <div style={{ width: "100%", maxWidth: "360px", borderRadius: "16px", padding: "28px 24px", background: "#12121a", border: "1px solid #2a2a3e" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>Plan {plan.name}</p>
            <p style={{ fontSize: "13px", color: "#4a4a65" }}>
              {plan.characters.toLocaleString("es-ES")} caracteres/mes · ${plan.price}/mes
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a4a65", padding: "2px" }}>
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", paddingTop: "8px" }}>
            <svg style={{ color: "#93c5fd" }} className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p style={{ fontSize: "13px", color: "#4a4a65" }}>Redirigiendo a Stripe...</p>
          </div>
        )}
      </div>
    </div>
  );
}
