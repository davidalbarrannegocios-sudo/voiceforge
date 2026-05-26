"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, CreditCard, Gift, LogOut, LayoutDashboard, Zap } from "lucide-react";

interface UserMenuProps {
  used?: number;
  total?: number;
  plan?: string;
}

export function UserMenu({ used, total, plan }: UserMenuProps = {}) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
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
  const remaining = (total ?? 0) - (used ?? 0);
  const pct = showRing ? Math.min(100, (used! / total!) * 100) : 0;
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const ringColor = pct < 60 ? "#3b82f6" : pct < 85 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" ref={ref}>
      {/* Avatar trigger */}
      {showRing ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 min-w-[36px] min-h-[36px] relative flex-shrink-0 flex items-center justify-center p-0 bg-transparent border-none cursor-pointer"
          aria-label="Menú de usuario"
        >
          <svg className="absolute inset-0 -rotate-90" width="36" height="36">
            <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <circle
              cx="18" cy="18" r={r} fill="none"
              stroke={ringColor} strokeWidth="2"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={user.fullName ?? "Avatar"}
              className="absolute rounded-full object-cover"
              style={{ top: 3, left: 3, width: "calc(100% - 6px)", height: "calc(100% - 6px)" }} />
          ) : (
            <div className="absolute rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm"
              style={{ top: 3, left: 3, width: "calc(100% - 6px)", height: "calc(100% - 6px)" }}>
              {initial}
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full overflow-hidden relative flex-shrink-0 flex items-center justify-center p-0 bg-transparent border-none cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
          aria-label="Menú de usuario"
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={user.fullName ?? "Avatar"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {initial}
            </div>
          )}
        </button>
      )}

      {/* Dropdown */}
      <div
        className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden transition-all duration-200 ease-out ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{ background: "#0d0d17", border: "1px solid #1e1e2e" }}
      >
          {/* User info + balance */}
          <div className="p-4" style={{ borderBottom: "1px solid #1e1e2e" }}>
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-3">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName ?? "Avatar"}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
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

            {/* Balance card */}
            {showRing && (
              <>
                <div className="rounded-lg p-3 mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-blue-400" />
                      <span className="text-white font-medium text-sm">Balance</span>
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard?tab=billing");
                      }}
                      className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Mejorar
                    </button>
                  </div>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span style={{ color: "#6b7280" }}>Total</span>
                    <span className="text-white">{total!.toLocaleString("es-ES")} chars</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#6b7280" }}>Disponibles</span>
                    <span className="text-white">{remaining.toLocaleString("es-ES")}</span>
                  </div>
                </div>

                {/* Plan badge */}
                <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div>
                    <p className="text-xs" style={{ color: "#6b7280" }}>Plan actual</p>
                    <p className="text-white text-sm font-medium capitalize">{plan ?? "Free"}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background: ringColor }} />
                </div>
              </>
            )}
          </div>

          {/* Nav links */}
          <div className="p-2">
            {[
              { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
              { href: "/dashboard?tab=billing", label: "Facturación", Icon: CreditCard },
              { href: "/dashboard?tab=referral", label: "Referidos", Icon: Gift },
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
            <button
              onClick={() => { setOpen(false); openUserProfile(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors"
              style={{ color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
            >
              <Settings size={15} style={{ flexShrink: 0 }} />
              Mi cuenta
            </button>
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
    </div>
  );
}
