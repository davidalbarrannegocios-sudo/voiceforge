"use client";

export const dynamic = "force-dynamic";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
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

      <SignUp.Root>
        {/* ── Step 1: registration fields ─────────────────── */}
        <SignUp.Step name="start" className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <h1 className="text-white text-2xl font-bold">Crea tu cuenta</h1>
            <p className="text-gray-400 text-sm mt-1">Empieza gratis con 5.000 caracteres al mes</p>
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

          {/* First name */}
          <Clerk.Field name="firstName" className="flex flex-col gap-1.5">
            <Clerk.Label className="text-gray-300 text-sm font-medium">Nombre</Clerk.Label>
            <Clerk.Input
              autoComplete="given-name"
              placeholder="Tu nombre"
              className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <Clerk.FieldError className="text-red-400 text-xs" />
          </Clerk.Field>

          {/* Email */}
          <Clerk.Field name="emailAddress" className="flex flex-col gap-1.5">
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

          {/* Password */}
          <Clerk.Field name="password" className="flex flex-col gap-1.5">
            <Clerk.Label className="text-gray-300 text-sm font-medium">Contraseña</Clerk.Label>
            <Clerk.Input
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <Clerk.FieldError className="text-red-400 text-xs" />
          </Clerk.Field>

          <SignUp.Action
            submit
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
          >
            <Clerk.Loading>
              {(loading) => loading ? "Creando cuenta..." : "Crear cuenta"}
            </Clerk.Loading>
          </SignUp.Action>

          <p className="text-center text-gray-400 text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
              Inicia sesión
            </Link>
          </p>
        </SignUp.Step>

        {/* ── Step 2: continue (extra fields if needed) ───── */}
        <SignUp.Step name="continue" className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <h1 className="text-white text-2xl font-bold">Un paso más</h1>
            <p className="text-gray-400 text-sm mt-1">Completa tu perfil</p>
          </div>

          <Clerk.Field name="username" className="flex flex-col gap-1.5">
            <Clerk.Label className="text-gray-300 text-sm font-medium">
              Nombre de usuario
            </Clerk.Label>
            <Clerk.Input
              autoComplete="username"
              className="w-full h-11 px-4 rounded-lg bg-[#111122] border border-white/20 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <Clerk.FieldError className="text-red-400 text-xs" />
          </Clerk.Field>

          <SignUp.Action
            submit
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
          >
            <Clerk.Loading>
              {(loading) => loading ? "Continuando..." : "Continuar"}
            </Clerk.Loading>
          </SignUp.Action>
        </SignUp.Step>

        {/* ── Step 3: email verification ───────────────────── */}
        <SignUp.Step name="verifications" className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <h1 className="text-white text-2xl font-bold">Verifica tu correo</h1>
            <p className="text-gray-400 text-sm mt-1">
              Hemos enviado un código de 6 dígitos a tu email
            </p>
          </div>

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

          <SignUp.Action
            submit
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer border-none"
          >
            <Clerk.Loading>
              {(loading) => loading ? "Verificando..." : "Verificar"}
            </Clerk.Loading>
          </SignUp.Action>

          <div className="text-center">
            <SignUp.Action
              resend
              className="text-gray-500 text-sm hover:text-gray-300 cursor-pointer bg-transparent border-none"
            >
              Reenviar código
            </SignUp.Action>
          </div>
        </SignUp.Step>
      </SignUp.Root>
    </div>
  );
}
