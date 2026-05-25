"use client";

export const dynamic = "force-dynamic";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  background: "#0d0d17",
  border: "1px solid #1e1e2e",
  borderRadius: "20px",
  padding: "40px 36px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#111122",
  border: "1px solid #2a2a3e",
  borderRadius: "10px",
  padding: "10px 12px 10px 38px",
  fontSize: "14px",
  color: "#e5e7eb",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#8888a8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#f87171",
  marginTop: "4px",
  display: "block",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "11px",
  borderRadius: "10px",
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const googleBtn: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #2a2a3e",
  background: "transparent",
  color: "#e5e7eb",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
      <div style={{ flex: 1, height: "1px", background: "#1e1e2e" }} />
      <span style={{ fontSize: "12px", color: "#555570", whiteSpace: "nowrap" }}>o continúa con</span>
      <div style={{ flex: 1, height: "1px", background: "#1e1e2e" }} />
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <Image src="/elitelabs.png" alt="Elite Labs" width={34} height={34} style={{ borderRadius: "9px" }} />
        <span style={{ fontSize: "17px", fontWeight: 700, color: "#fff" }}>Elite Labs</span>
      </Link>
    </div>
  );
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", padding: "24px" }}>
      <SignIn.Root>

        {/* ── Step 1: identifier ──────────────────────────────── */}
        <SignIn.Step name="start" style={card}>
          <Logo />

          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "6px" }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "28px" }}>
            Inicia sesión en tu cuenta de Elite Labs
          </p>

          <Clerk.Connection name="google" style={googleBtn}>
            <Clerk.Loading scope="provider:google">
              {(loading) => loading
                ? <span style={{ color: "#8888a8" }}>Conectando...</span>
                : <><GoogleIcon />Continuar con Google</>}
            </Clerk.Loading>
          </Clerk.Connection>

          <Divider />

          <Clerk.Field name="identifier" style={{ marginBottom: "16px" }}>
            <Clerk.Label style={labelStyle}>Correo electrónico</Clerk.Label>
            <div style={{ position: "relative", marginTop: "6px" }}>
              <Mail size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#555570", pointerEvents: "none" }} />
              <Clerk.Input type="email" autoComplete="email" style={inputStyle} />
            </div>
            <Clerk.FieldError style={errorStyle} />
          </Clerk.Field>

          <SignIn.Action submit style={primaryBtn}>
            <Clerk.Loading>
              {(loading) => loading ? "Cargando..." : "Continuar"}
            </Clerk.Loading>
          </SignIn.Action>

          <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "#6b7280" }}>
            ¿No tienes cuenta?{" "}
            <Link href="/sign-up" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 500 }}>
              Regístrate
            </Link>
          </p>
        </SignIn.Step>

        {/* ── Step 2: verifications ───────────────────────────── */}
        <SignIn.Step name="verifications" style={card}>
          <Logo />

          {/* Password strategy */}
          <SignIn.Strategy name="password">
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "6px" }}>
              Introduce tu contraseña
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "28px" }}>
              Accede a tu cuenta de Elite Labs
            </p>

            <Clerk.Field name="password" style={{ marginBottom: "16px" }}>
              <Clerk.Label style={labelStyle}>Contraseña</Clerk.Label>
              <div style={{ position: "relative", marginTop: "6px" }}>
                <Lock size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#555570", pointerEvents: "none" }} />
                <Clerk.Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555570", display: "flex", padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Clerk.FieldError style={errorStyle} />
            </Clerk.Field>

            <SignIn.Action submit style={primaryBtn}>
              <Clerk.Loading>
                {(loading) => loading ? "Iniciando..." : "Iniciar sesión"}
              </Clerk.Loading>
            </SignIn.Action>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
              <SignIn.Action navigate="start" style={{ background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer" }}>
                ← Volver
              </SignIn.Action>
            </div>
          </SignIn.Strategy>

          {/* Email code strategy */}
          <SignIn.Strategy name="email_code">
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "6px" }}>
              Revisa tu correo
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "28px" }}>
              Hemos enviado un código de verificación a tu email
            </p>

            <Clerk.Field name="code" style={{ marginBottom: "16px" }}>
              <Clerk.Label style={labelStyle}>Código de verificación</Clerk.Label>
              <div style={{ marginTop: "6px" }}>
                <Clerk.Input
                  type="otp"
                  style={{ ...inputStyle, paddingLeft: "12px", textAlign: "center", letterSpacing: "0.3em", fontSize: "18px" }}
                />
              </div>
              <Clerk.FieldError style={errorStyle} />
            </Clerk.Field>

            <SignIn.Action submit style={primaryBtn}>
              <Clerk.Loading>
                {(loading) => loading ? "Verificando..." : "Verificar"}
              </Clerk.Loading>
            </SignIn.Action>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
              <SignIn.Action resend style={{ background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer" }}>
                Reenviar código
              </SignIn.Action>
            </div>
          </SignIn.Strategy>

          {/* TOTP strategy */}
          <SignIn.Strategy name="totp">
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "6px" }}>
              Autenticación de dos factores
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "28px" }}>
              Introduce el código de tu app de autenticación
            </p>

            <Clerk.Field name="code" style={{ marginBottom: "16px" }}>
              <Clerk.Label style={labelStyle}>Código TOTP</Clerk.Label>
              <div style={{ marginTop: "6px" }}>
                <Clerk.Input
                  type="otp"
                  style={{ ...inputStyle, paddingLeft: "12px", textAlign: "center", letterSpacing: "0.3em", fontSize: "18px" }}
                />
              </div>
              <Clerk.FieldError style={errorStyle} />
            </Clerk.Field>

            <SignIn.Action submit style={primaryBtn}>
              <Clerk.Loading>
                {(loading) => loading ? "Verificando..." : "Verificar"}
              </Clerk.Loading>
            </SignIn.Action>
          </SignIn.Strategy>
        </SignIn.Step>

      </SignIn.Root>
    </div>
  );
}
