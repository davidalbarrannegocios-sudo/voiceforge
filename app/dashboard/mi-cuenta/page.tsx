"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EliteLoader } from "@/components/ui/EliteLoader";
import { User, Shield, Check, X } from "lucide-react";
import { useLang } from "@/app/dashboard/LanguageContext";
import { CustomSelect } from "@/components/CustomSelect";

const LANGUAGE_OPTIONS = [
  { value: "es", label: "Español",    icon: <span className="fi fi-es" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
  { value: "en", label: "English",    icon: <span className="fi fi-us" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
  { value: "fr", label: "Français",   icon: <span className="fi fi-fr" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
  { value: "de", label: "Deutsch",    icon: <span className="fi fi-de" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
  { value: "pt", label: "Português",  icon: <span className="fi fi-br" style={{ width: "16px", height: "12px", display: "inline-block", borderRadius: "2px" }} /> },
];

type SettingsTab = "perfil" | "seguridad";

export default function MiCuentaPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { lang, t, setLang } = useLang();

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
    if (!user || deleteInput !== t.account.deleteConfirmWord) return;
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
      <div style={{ padding: "40px 32px", display: "flex", justifyContent: "center" }}><EliteLoader /></div>
    );
  }

  return (
    <div style={{ padding: "40px 32px", minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{t.account.title}</h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>{t.account.subtitle}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "32px" }}>
          {([
            { key: "perfil" as SettingsTab, label: t.account.tabProfile, Icon: User },
            { key: "seguridad" as SettingsTab, label: t.account.tabSecurity, Icon: Shield },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setSettingsTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "10px 16px", border: "none", cursor: "pointer",
                background: "transparent", fontSize: "14px", fontWeight: 600,
                color: settingsTab === key ? "#fff" : "#6b7280",
                borderBottom: settingsTab === key ? "2px solid #ffffff" : "2px solid transparent",
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
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.email}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
              {isGoogleUser && (
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                  {t.account.managedByGoogle}
                </span>
              )}
            </div>

            {/* Nombre */}
            <div style={{ display: "flex", alignItems: editingName ? "flex-start" : "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              {editingName ? (
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 12px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.name}</p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t.account.firstName}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", outline: "none" }}
                    />
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t.account.lastName}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={saveName}
                      disabled={nameSaving}
                      style={{ padding: "7px 16px", borderRadius: "7px", border: "none", background: "#ffffff", color: "#000000", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: nameSaving ? 0.7 : 1 }}
                    >
                      {nameSaving ? t.account.saving : t.account.save}
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      style={{ padding: "7px 16px", borderRadius: "7px", border: "1px solid #2a2a3e", background: "transparent", color: "#9ca3af", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {t.account.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.name}</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {user?.fullName ?? "No disponible"}
                    {nameSaved && <span style={{ color: "#22c55e", fontSize: "12px" }}>{t.account.saved}</span>}
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
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.currentPlan}</p>
                <p style={{ margin: 0, fontSize: "13px", textTransform: plan === "lifetime" ? "none" : "capitalize", color: plan === "lifetime" ? "#f59e0b" : "#6b7280", fontWeight: plan === "lifetime" ? 600 : 400 }}>
                  {plan === "lifetime" ? "Elite Vitalicio ♾" : (plan ?? "...")}
                </p>
              </div>
              <Link
                href="/dashboard?tab=billing"
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {t.account.manageSub}
              </Link>
            </div>

            {/* Foto */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Foto de perfil"
                    style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover", opacity: photoSaving ? 0.5 : 1, transition: "opacity 0.2s" }}
                  />
                ) : (
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#1e1e3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#fff", fontWeight: 700 }}>
                    {user?.firstName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.profilePhoto}</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{t.account.photoDesc}</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={changePhoto} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoSaving}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: photoSaving ? 0.6 : 1 }}
              >
                {photoSaving ? t.account.uploading : t.account.changePhoto}
              </button>
            </div>

            {/* Cuentas conectadas */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.connectedAccounts}</p>
                {isGoogleUser && googleAccount ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                    Google · {googleAccount.emailAddress ?? user?.emailAddresses[0]?.emailAddress}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{t.account.noConnected}</p>
                )}
              </div>
              {isGoogleUser && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", padding: "5px 12px", borderRadius: "6px", flexShrink: 0 }}>
                  <Check size={12} color="#22c55e" />
                  <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 600 }}>{t.account.connected}</span>
                </div>
              )}
            </div>

            {/* Preferencias */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#fff", fontSize: "14px" }}>{t.account.language}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{t.account.languageDesc}</p>
              </div>
              <CustomSelect
                options={LANGUAGE_OPTIONS}
                value={lang}
                onChange={(val) => {
                  setLang(val);
                  window.location.reload();
                }}
                style={{ minWidth: "140px" }}
              />
            </div>

            {/* Eliminar cuenta */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "#f87171", fontSize: "14px" }}>{t.account.deleteAccount}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{t.account.deleteDesc}</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.35)", background: "transparent", color: "#f87171", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {t.account.deleteAccount}
              </button>
            </div>
          </div>
        )}

        {/* ── Seguridad ── */}
        {settingsTab === "seguridad" && (
          <div>
            {/* Contraseña */}
            <div style={{ paddingBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "32px" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 600, color: "#fff" }}>{t.account.password}</h3>
              {hasPassword ? (
                <div>
                  {[
                    { label: t.account.currentPassword, value: currentPassword, set: setCurrentPassword },
                    { label: t.account.newPassword, value: newPassword, set: setNewPassword },
                    { label: t.account.confirmPassword, value: confirmPassword, set: setConfirmPassword },
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
                      background: "#ffffff", color: "#000000", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      opacity: passwordSaving || !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
                    }}
                  >
                    {passwordSaving ? t.account.saving : t.account.changePassword}
                  </button>
                </div>
              ) : (
                <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Shield size={18} style={{ color: "#aaaaaa", flexShrink: 0 }} />
                  <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px", lineHeight: 1.5 }}>
                    {t.account.googleAuth}
                  </p>
                </div>
              )}
            </div>

            {/* 2FA */}
            <div className="flex items-center justify-between py-5 border-b border-white/10">
              <div>
                <p className="text-white font-medium">{t.account.twoFactor}</p>
                <p className="text-gray-400 text-sm">{t.account.twoFactorDesc}</p>
              </div>
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                {t.account.comingSoon}
              </span>
            </div>
          </div>
        )}

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
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f87171" }}>{t.account.deleteAccount}</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", padding: "4px" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#fca5a5", lineHeight: 1.6 }}>
                {t.account.deleteConfirmText}
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
              {t.account.deleteConfirmLabel}
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={t.account.deleteConfirmPlaceholder}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#13131f", color: "#fff", fontSize: "13px", marginBottom: "16px", outline: "none" }}
            />
            <button
              onClick={deleteAccount}
              disabled={deleteInput !== t.account.deleteConfirmWord || deleting}
              style={{
                width: "100%", padding: "11px", borderRadius: "8px", border: "none",
                background: deleteInput === "ELIMINAR" ? "#ef4444" : "#1a1a1a",
                color: deleteInput === "ELIMINAR" ? "#fff" : "#4a4a65",
                fontSize: "13px", fontWeight: 700,
                cursor: deleteInput !== t.account.deleteConfirmWord || deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {deleting ? t.account.deleting : t.account.deleteBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
