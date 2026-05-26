"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home, Mic2, Type, FileAudio, Globe, Clock,
  CreditCard, Gift, Zap, User, Shield, Check, X,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Inicio", Icon: Home },
  { href: "/dashboard?tab=generate", label: "Generar voz", Icon: Type },
  { href: "/dashboard?tab=transcribe", label: "Transcribir", Icon: FileAudio },
  { href: "/dashboard?tab=translate", label: "Traducir", Icon: Globe },
  { href: "/dashboard?tab=voices", label: "Mis voces", Icon: Mic2 },
  { href: "/dashboard?tab=history", label: "Historial", Icon: Clock },
  { href: "/dashboard?tab=billing", label: "Facturación", Icon: CreditCard },
  { href: "/dashboard?tab=referral", label: "Referidos", Icon: Gift },
];

type SettingsTab = "perfil" | "seguridad";

export default function MiCuentaPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("perfil");
  const [plan, setPlan] = useState<string | null>(null);

  // Name
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Photo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => setPlan(d.plan ?? "free"));
  }, []);

  useEffect(() => {
    if (user && editingName) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user, editingName]);

  async function saveName() {
    if (!user) return;
    setNameSaving(true);
    try {
      await user.update({ firstName, lastName });
      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } finally {
      setNameSaving(false);
    }
  }

  async function changePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoSaving(true);
    try {
      await user.setProfileImage({ file });
    } finally {
      setPhotoSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function changePassword() {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      await user.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: true });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setPasswordError(clerkErr.errors?.[0]?.message ?? "Error al cambiar la contraseña");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteAccount() {
    if (!user || deleteInput !== "ELIMINAR") return;
    setDeleting(true);
    try {
      await user.delete();
      router.push("/");
    } finally {
      setDeleting(false);
    }
  }

  const isGoogleUser = user?.externalAccounts?.some((a) => a.provider.toLowerCase().includes("google"));
  const googleAccount = user?.externalAccounts?.find((a) => a.provider.toLowerCase().includes("google"));
  const hasPassword = user?.passwordEnabled ?? false;

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#080811", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280" }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080811", display: "flex" }}>
      {/* ── Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col"
        style={{
          width: "240px",
          flexShrink: 0,
          borderRight: "1px solid #1e1e2e",
          background: "#0d0d17",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <div style={{ height: "56px", display: "flex", alignItems: "center", paddingLeft: "20px", flexShrink: 0 }}>
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/elitelabs.png"
              alt="Elite Labs"
              width={28}
              height={28}
              style={{ height: "28px", width: "auto", objectFit: "contain" }}
              className="rounded-lg"
            />
            <span className="font-bold text-white tracking-tight text-sm">Elite Labs</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 12px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 500, color: "#5a5a78",
                textDecoration: "none", marginBottom: "2px",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#5a5a78";
              }}
            >
              <Icon size={15} style={{ color: "#3e3e58", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
            </Link>
          ))}

          {/* Mi cuenta — active */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 12px", borderRadius: "8px",
              fontSize: "13px", fontWeight: 500,
              background: "rgba(59,130,246,0.12)", color: "#93c5fd",
              marginBottom: "2px",
            }}
          >
            <User size={15} style={{ color: "#93c5fd", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Mi cuenta</span>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
          </div>
        </nav>

        {/* Upgrade */}
        <div style={{ padding: "0 12px 16px", flexShrink: 0 }}>
          <Link
            href="/dashboard?tab=billing"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px", borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#0a0a14", textDecoration: "none",
              position: "relative", overflow: "hidden",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.35)"; e.currentTarget.style.background = "#0d0d1e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "#0a0a14"; }}
          >
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)" }} />
            <div style={{ position: "relative", zIndex: 1, width: "24px", height: "24px", borderRadius: "6px", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={13} style={{ color: "#93c5fd" }} />
            </div>
            <span style={{ position: "relative", zIndex: 1, fontSize: "13px", fontWeight: 600, color: "#c0c0d8", flex: 1 }}>Mejorar plan</span>
            <svg style={{ position: "relative", zIndex: 1 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555570" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "40px 32px", minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Configuración</h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Gestiona tu perfil y preferencias de seguridad</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e1e2e", marginBottom: "32px" }}>
          {([
            { key: "perfil" as SettingsTab, label: "Perfil", Icon: User },
            { key: "seguridad" as SettingsTab, label: "Seguridad", Icon: Shield },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setSettingsTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "10px 16px", border: "none", cursor: "pointer",
                background: "transparent", fontSize: "14px", fontWeight: 600,
                color: settingsTab === key ? "#fff" : "#6b7280",
                borderBottom: settingsTab === key ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.15s ease",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Perfil ── */}
        {settingsTab === "perfil" && (
          <div>
            {/* Email */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>Dirección de email</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
              {isGoogleUser && (
                <span style={{ fontSize: "12px", color: "#4a4a65", background: "#13131f", border: "1px solid #1e1e2e", padding: "4px 10px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                  Gestionado por Google
                </span>
              )}
            </div>

            {/* Nombre */}
            <div style={{ display: "flex", alignItems: editingName ? "flex-start" : "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              {editingName ? (
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 12px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>Nombre</p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Nombre"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", outline: "none" }}
                    />
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Apellidos"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={saveName}
                      disabled={nameSaving}
                      style={{ padding: "7px 16px", borderRadius: "7px", border: "none", background: "#3b82f6", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: nameSaving ? 0.7 : 1 }}
                    >
                      {nameSaving ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      style={{ padding: "7px 16px", borderRadius: "7px", border: "1px solid #2a2a3e", background: "transparent", color: "#9ca3af", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>Nombre</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {user?.fullName ?? "No disponible"}
                    {nameSaved && <span style={{ color: "#22c55e", fontSize: "12px" }}>✓ Guardado</span>}
                  </p>
                </div>
              )}
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Actualizar nombre
                </button>
              )}
            </div>

            {/* Plan */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>Plan actual</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", textTransform: "capitalize" }}>{plan ?? "..."}</p>
              </div>
              <Link
                href="/dashboard?tab=billing"
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Gestionar suscripción
              </Link>
            </div>

            {/* Foto */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Foto de perfil"
                    style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", opacity: photoSaving ? 0.5 : 1, transition: "opacity 0.2s" }}
                  />
                ) : (
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1e1e3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#fff", fontWeight: 700 }}>
                    {user?.firstName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>Foto de perfil</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>JPG, PNG, máx 5MB</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={changePhoto} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoSaving}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: photoSaving ? 0.6 : 1 }}
              >
                {photoSaving ? "Subiendo..." : "Cambiar foto"}
              </button>
            </div>

            {/* Cuentas conectadas */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>Cuentas conectadas</p>
                {isGoogleUser && googleAccount ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                    Google · {googleAccount.emailAddress ?? user?.emailAddresses[0]?.emailAddress}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>Sin cuentas externas conectadas</p>
                )}
              </div>
              {isGoogleUser && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", padding: "5px 12px", borderRadius: "6px", flexShrink: 0 }}>
                  <Check size={12} color="#22c55e" />
                  <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 600 }}>Conectado</span>
                </div>
              )}
            </div>

            {/* Eliminar cuenta */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#f87171", fontSize: "14px" }}>Eliminar cuenta</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>Esta acción es permanente e irreversible</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.35)", background: "transparent", color: "#f87171", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        )}

        {/* ── Seguridad ── */}
        {settingsTab === "seguridad" && (
          <div>
            {/* Contraseña */}
            <div style={{ paddingBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "32px" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 600, color: "#fff" }}>Contraseña</h3>
              {hasPassword ? (
                <div>
                  {[
                    { label: "Contraseña actual", value: currentPassword, set: setCurrentPassword },
                    { label: "Nueva contraseña", value: newPassword, set: setNewPassword },
                    { label: "Confirmar contraseña", value: confirmPassword, set: setConfirmPassword },
                  ].map(({ label, value, set }) => (
                    <div key={label} style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "6px", fontWeight: 500 }}>{label}</label>
                      <input
                        type="password"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", outline: "none" }}
                      />
                    </div>
                  ))}
                  {passwordError && <p style={{ color: "#f87171", fontSize: "12px", margin: "0 0 12px" }}>{passwordError}</p>}
                  {passwordSuccess && <p style={{ color: "#22c55e", fontSize: "12px", margin: "0 0 12px" }}>✓ Contraseña actualizada</p>}
                  <button
                    onClick={changePassword}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                    style={{
                      padding: "8px 20px", borderRadius: "8px", border: "none",
                      background: "#3b82f6", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      opacity: passwordSaving || !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
                    }}
                  >
                    {passwordSaving ? "Guardando..." : "Cambiar contraseña"}
                  </button>
                </div>
              ) : (
                <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Shield size={18} style={{ color: "#3b82f6", flexShrink: 0 }} />
                  <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px", lineHeight: 1.5 }}>
                    Tu cuenta usa <strong style={{ color: "#fff" }}>Google</strong> para autenticarse. No es necesario gestionar una contraseña.
                  </p>
                </div>
              )}
            </div>

            {/* 2FA */}
            <div className="flex items-center justify-between py-5 border-b border-white/10">
              <div>
                <p className="text-white font-medium">Autenticación de dos factores (2FA)</p>
                <p className="text-gray-400 text-sm">Añade una capa extra de seguridad a tu cuenta</p>
              </div>
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                Próximamente
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
          }}
        >
          <div style={{ background: "#0d0d17", border: "1px solid #1e1e2e", borderRadius: "16px", width: "100%", maxWidth: "400px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f87171" }}>Eliminar cuenta</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", padding: "4px" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#fca5a5", lineHeight: 1.6 }}>
                Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus datos, voces e historial.
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
              Escribe <strong style={{ color: "#d1d5db" }}>ELIMINAR</strong> para confirmar:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="ELIMINAR"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", marginBottom: "16px", outline: "none" }}
            />
            <button
              onClick={deleteAccount}
              disabled={deleteInput !== "ELIMINAR" || deleting}
              style={{
                width: "100%", padding: "11px", borderRadius: "8px", border: "none",
                background: deleteInput === "ELIMINAR" ? "#ef4444" : "#1a1a2e",
                color: deleteInput === "ELIMINAR" ? "#fff" : "#4a4a65",
                fontSize: "13px", fontWeight: 700,
                cursor: deleteInput !== "ELIMINAR" || deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {deleting ? "Eliminando..." : "Eliminar mi cuenta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
