"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, CreditCard, Gift, LogOut, LayoutDashboard } from "lucide-react";

interface UserMenuProps {
  used?: number;
  total?: number;
}

export function UserMenu({ used, total }: UserMenuProps = {}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = (user?.firstName?.[0] ?? user?.emailAddresses[0]?.emailAddress[0] ?? "U").toUpperCase();

  const showRing = used !== undefined && total !== undefined && total > 0;
  const pct = showRing ? Math.min(100, (used / total) * 100) : 0;
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const ringColor = pct < 60 ? "#3b82f6" : pct < 85 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" ref={ref}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex-shrink-0"
        style={{ width: showRing ? 40 : undefined, height: showRing ? 40 : undefined }}
        aria-label="Menú de usuario"
      >
        {showRing ? (
          <>
            <svg
              style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
              width="40"
              height="40"
            >
              <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              <circle
                cx="20"
                cy="20"
                r={r}
                fill="none"
                stroke={ringColor}
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName ?? "Avatar"}
                className="absolute rounded-full object-cover"
                style={{ top: 4, left: 4, width: "calc(100% - 8px)", height: "calc(100% - 8px)" }}
              />
            ) : (
              <div
                className="absolute rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm"
                style={{ top: 4, left: 4, width: "calc(100% - 8px)", height: "calc(100% - 8px)" }}
              >
                {initial}
              </div>
            )}
          </>
        ) : user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.fullName ?? "Avatar"}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent hover:ring-blue-500 transition-all"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white font-bold text-sm transition-colors ring-2 ring-transparent hover:ring-blue-400">
            {initial}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ background: "#0d0d17", border: "1px solid #1e1e2e" }}
        >
          {/* User info */}
          <div className="p-4" style={{ borderBottom: "1px solid #1e1e2e" }}>
            <div className="flex items-center gap-3">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName ?? "Avatar"}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{user?.fullName ?? "Usuario"}</p>
                <p className="text-xs truncate" style={{ color: "#6b7280" }}>
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
            {showRing && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6b7280" }}>
                  <span>Caracteres usados</span>
                  <span style={{ color: "#9ca3af" }}>{used!.toLocaleString("es-ES")} / {total!.toLocaleString("es-ES")}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: ringColor }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nav links */}
          <div className="p-2">
            {[
              { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
              { href: "/dashboard?tab=billing", label: "Facturación", Icon: CreditCard },
              { href: "/dashboard?tab=referral", label: "Referidos", Icon: Gift },
              { href: "/dashboard?tab=home", label: "Mi cuenta", Icon: Settings },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{ color: "#9ca3af" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                {label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="p-2" style={{ borderTop: "1px solid #1e1e2e" }}>
            <button
              onClick={() => { setOpen(false); signOut({ redirectUrl: "/" }); router; }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors"
              style={{ color: "#f87171", background: "transparent", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#fca5a5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f87171"; }}
            >
              <LogOut size={15} style={{ flexShrink: 0 }} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
