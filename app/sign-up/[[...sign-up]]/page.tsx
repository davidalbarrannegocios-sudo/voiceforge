export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-8"
      style={{ background: "#0a0a0f" }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/elitelabs.png" alt="Elite Labs" width={38} height={38} className="rounded-xl" />
        <span className="text-white text-xl font-bold">Elite Labs</span>
      </Link>

      <Suspense fallback={<div className="text-white animate-pulse text-sm">Cargando...</div>}>
        <SignUp
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#13151f",
              colorInputBackground: "#1a1a2e",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#9ca3af",
              borderRadius: "0.75rem",
              fontFamily: "inherit",
            },
            elements: {
              card: "shadow-2xl border border-white/10 bg-[#13151f]",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton: "border border-white/20 bg-white/5 hover:bg-white/10 text-white",
              formFieldInput: "bg-[#1a1a2e] border-white/20 text-white",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white shadow-none",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              footer: "opacity-0 pointer-events-none h-0 overflow-hidden",
            },
          }}
        />
      </Suspense>
    </div>
  );
}
