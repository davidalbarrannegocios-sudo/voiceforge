export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

const appearance = {
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#0d0d17",
    colorInputBackground: "#111122",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#9ca3af",
    colorDanger: "#f87171",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    card: "shadow-2xl border border-[#1e1e2e] bg-[#0d0d17]",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButton: "border border-[#2a2a3e] bg-transparent hover:bg-white/5 text-white",
    dividerLine: "bg-[#1e1e2e]",
    dividerText: "text-[#555570]",
    formFieldLabel: "text-[#8888a8]",
    formFieldInput: "bg-[#111122] border-[#2a2a3e] text-white placeholder:text-[#555570] focus:border-blue-500",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white shadow-none",
    footerActionLink: "text-[#93c5fd] hover:text-blue-300",
    footerActionText: "text-gray-500",
    formFieldAction: "text-[#93c5fd] hover:text-blue-300",
    otpCodeFieldInput: "bg-[#111122] border-[#2a2a3e] text-white",
    alertText: "text-[#f87171]",
    formResendCodeLink: "text-[#93c5fd]",
  },
} as const;

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "#0a0a0f" }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <Image
          src="/elitelabs.png"
          alt="Elite Labs"
          width={36}
          height={36}
          className="rounded-xl"
        />
        <span className="text-white font-bold text-lg">Elite Labs</span>
      </Link>

      <Suspense fallback={<div className="text-white animate-pulse text-sm">Cargando...</div>}>
        <SignUp fallbackRedirectUrl="/dashboard" appearance={appearance} />
      </Suspense>
    </div>
  );
}
