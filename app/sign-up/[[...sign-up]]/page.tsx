"use client";

export const dynamic = "force-dynamic";

import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { isDisposableEmail } from "@/lib/disposable-email-domains";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

export default function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "verify">("start");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleGoogle() {
    if (!isLoaded) return;
    await signUp.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/dashboard",
    });
  }

  function handleEmailBlur() {
    if (email && isDisposableEmail(email)) {
      setEmailError("Este tipo de email temporal no está permitido. Usa un email real.");
    } else {
      setEmailError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    if (isDisposableEmail(email)) {
      setEmailError("Este tipo de email temporal no está permitido. Usa un email real.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp.create({ firstName, emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Código incorrecto");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch {
      // silent
    }
  }

  const inputClass = "w-full h-12 px-4 rounded-lg border text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors text-sm";
  const inputStyle = { background: "#111111", borderColor: "rgba(255,255,255,0.10)" };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0a0a0f" }}>
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Image src="/elitelabs.png" alt="Elite Labs" width={38} height={38} className="rounded-xl" />
        <span className="text-white text-xl font-bold">Elite Labs</span>
      </Link>

      <div className="w-full max-w-sm">
        {step === "start" ? (
          <>
            <h1 className="text-white text-3xl font-bold mb-1">Crea tu cuenta</h1>
            <p className="text-gray-400 text-sm mb-8">Empieza gratis con 5.000 caracteres al mes</p>

            <button
              onClick={handleGoogle}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors mb-6"
            >
              <GoogleIcon />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-xs">o</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-300 text-sm font-medium">Nombre</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre"
                    className={`${inputClass} pl-10`}
                    style={inputStyle}
                    required
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-300 text-sm font-medium">Correo electrónico</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                    onBlur={handleEmailBlur}
                    placeholder="tu@email.com"
                    className={`${inputClass} pl-10`}
                    style={{ ...inputStyle, borderColor: emailError ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.10)" }}
                    required
                    autoComplete="email"
                  />
                </div>
                {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-300 text-sm font-medium">Contraseña</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputClass} pl-10 pr-12`}
                    style={inputStyle}
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading || !isLoaded || !!emailError}
                className="h-12 rounded-lg bg-white hover:bg-gray-200 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-white text-3xl font-bold mb-1">Verifica tu correo</h1>
            <p className="text-gray-400 text-sm mb-8">
              Hemos enviado un código a <span className="text-white">{email}</span>
            </p>

            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-300 text-sm font-medium">Código de verificación</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className={`${inputClass} text-center tracking-widest text-lg`}
                  style={inputStyle}
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-lg bg-white hover:bg-gray-200 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
              >
                {loading ? "Verificando..." : "Verificar email"}
              </button>
            </form>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => { setStep("start"); setError(""); }}
                className="text-gray-500 text-sm hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer"
              >
                ← Volver
              </button>
              <button
                onClick={handleResend}
                className="text-gray-300 text-sm hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer"
              >
                Reenviar código
              </button>
            </div>
          </>
        )}

        <p className="text-center text-gray-400 text-sm mt-8">
          ¿Ya tienes cuenta?{" "}
          <Link href="/sign-in" className="text-gray-300 hover:text-gray-300">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
