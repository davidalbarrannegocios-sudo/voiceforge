"use client";

export const dynamic = "force-dynamic";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0a0a0f" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 no-underline">
        <Image src="/elitelabs.png" alt="Elite Labs" width={38} height={38} className="rounded-xl" />
        <span className="text-white text-xl font-bold">Elite Labs</span>
      </Link>

      <SignIn.Root>
        {/* ── Step 1: identifier ──────────────────────────── */}
        <SignIn.Step name="start" className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <h1 className="text-white text-2xl font-bold">Bienvenido de nuevo</h1>
            <p className="text-gray-400 text-sm mt-1">Inicia sesión en tu cuenta</p>
          </div>

          {/* Google */}
          <Clerk.Connection
            name="google"
            className="flex items-center justify-center gap-3 w-full h-11 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <Clerk.Icon className="w-4 h-4" />
            Continuar con Google
          </Clerk.Connection>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-xs">o</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email */}
          <Clerk.Field name="identifier" className="flex flex-col gap-1.5">
            <Clerk.Label className="text-gray-300 text-sm font-medium">
              Correo electrónico
            </Clerk.Label>
            <Clerk.Input
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <Clerk.FieldError className="text-red-400 text-xs" />
          </Clerk.Field>

          <SignIn.Action
            submit
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
          >
            <Clerk.Loading>
              {(loading) => loading ? "Cargando..." : "Continuar"}
            </Clerk.Loading>
          </SignIn.Action>

          <p className="text-center text-gray-400 text-sm">
            ¿No tienes cuenta?{" "}
            <Link href="/sign-up" className="text-blue-400 hover:text-blue-300">
              Regístrate
            </Link>
          </p>
        </SignIn.Step>

        {/* ── Step 2: verifications ───────────────────────── */}
        <SignIn.Step name="verifications" className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <h1 className="text-white text-2xl font-bold">Verificación</h1>
          </div>

          {/* Password */}
          <SignIn.Strategy name="password">
            <p className="text-gray-400 text-sm text-center -mt-2 mb-2">
              Introduce tu contraseña
            </p>
            <Clerk.Field name="password" className="flex flex-col gap-1.5">
              <Clerk.Label className="text-gray-300 text-sm font-medium">Contraseña</Clerk.Label>
              <Clerk.Input
                type="password"
                autoComplete="current-password"
                className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
              <Clerk.FieldError className="text-red-400 text-xs" />
            </Clerk.Field>
            <SignIn.Action
              submit
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
            >
              <Clerk.Loading>
                {(loading) => loading ? "Iniciando..." : "Iniciar sesión"}
              </Clerk.Loading>
            </SignIn.Action>
            <div className="text-center">
              <SignIn.Action
                navigate="start"
                className="text-gray-500 text-sm hover:text-gray-300 cursor-pointer bg-transparent border-none"
              >
                ← Volver
              </SignIn.Action>
            </div>
          </SignIn.Strategy>

          {/* Email code */}
          <SignIn.Strategy name="email_code">
            <p className="text-gray-400 text-sm text-center -mt-2 mb-2">
              Hemos enviado un código a tu correo
            </p>
            <Clerk.Field name="code" className="flex flex-col gap-1.5">
              <Clerk.Label className="text-gray-300 text-sm font-medium">
                Código de verificación
              </Clerk.Label>
              <Clerk.Input
                type="otp"
                className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white text-center tracking-widest focus:outline-none focus:border-blue-500 transition-colors text-lg"
              />
              <Clerk.FieldError className="text-red-400 text-xs" />
            </Clerk.Field>
            <SignIn.Action
              submit
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
            >
              <Clerk.Loading>
                {(loading) => loading ? "Verificando..." : "Verificar"}
              </Clerk.Loading>
            </SignIn.Action>
            <div className="text-center">
              <SignIn.Action
                resend
                className="text-gray-500 text-sm hover:text-gray-300 cursor-pointer bg-transparent border-none"
              >
                Reenviar código
              </SignIn.Action>
            </div>
          </SignIn.Strategy>

          {/* TOTP */}
          <SignIn.Strategy name="totp">
            <p className="text-gray-400 text-sm text-center -mt-2 mb-2">
              Código de autenticación de dos factores
            </p>
            <Clerk.Field name="code" className="flex flex-col gap-1.5">
              <Clerk.Label className="text-gray-300 text-sm font-medium">Código TOTP</Clerk.Label>
              <Clerk.Input
                type="otp"
                className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white text-center tracking-widest focus:outline-none focus:border-blue-500 transition-colors text-lg"
              />
              <Clerk.FieldError className="text-red-400 text-xs" />
            </Clerk.Field>
            <SignIn.Action
              submit
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
            >
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
