export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

const appearance = {
  layout: {
    logoPlacement: "none" as const,
    showOptionalFields: false,
  },
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#0a0a0f",
    colorInputBackground: "#111122",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#9ca3af",
    colorDanger: "#f87171",
    borderRadius: "0.5rem",
    spacingUnit: "1rem",
    fontSize: "1rem",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full max-w-md",
    card: "bg-transparent shadow-none p-0 w-full",
    headerTitle: "text-white text-3xl font-bold text-center",
    headerSubtitle: "text-gray-400 text-center",
    socialButtonsBlockButton:
      "border border-white/20 bg-white/5 hover:bg-white/10 text-white w-full h-12 rounded-lg transition-colors",
    socialButtonsBlockButtonText: "text-white font-medium",
    dividerLine: "bg-white/10",
    dividerText: "text-gray-500",
    formFieldLabel: "text-gray-300 font-medium",
    formFieldInput:
      "bg-[#111122] border border-white/20 text-white h-12 rounded-lg px-4 w-full focus:border-blue-500 focus:outline-none",
    formButtonPrimary:
      "bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-lg w-full font-semibold text-base transition-colors shadow-none",
    footerActionLink: "text-blue-400 hover:text-blue-300",
    footerActionText: "text-gray-500",
    formFieldAction: "text-blue-400 hover:text-blue-300",
    otpCodeFieldInput: "bg-[#111122] border-white/20 text-white",
    alertText: "text-[#f87171]",
    formResendCodeLink: "text-blue-400",
    footer: "hidden",
  },
};

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-8"
      style={{ background: "#0a0a0f" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/elitelabs.png"
          alt="Elite Labs"
          width={40}
          height={40}
          className="rounded-xl"
        />
        <span className="text-white font-bold text-xl">Elite Labs</span>
      </Link>

      <Suspense fallback={<div className="text-white animate-pulse text-sm">Cargando...</div>}>
        <SignUp fallbackRedirectUrl="/dashboard" appearance={appearance} />
      </Suspense>
    </div>
  );
}
