export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a0a0f" }}
    >
      <Suspense fallback={<div className="text-white animate-pulse text-sm">Cargando...</div>}>
        <SignUp
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorBackground: "#0d0d17",
              colorInputBackground: "#111122",
              colorInputText: "#e5e7eb",
              colorText: "#e5e7eb",
              colorTextSecondary: "#8888a8",
              colorPrimary: "#3b82f6",
              colorDanger: "#f87171",
              borderRadius: "10px",
              fontFamily: "inherit",
            },
            elements: {
              card: {
                background: "#0d0d17",
                border: "1px solid #1e1e2e",
                boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                borderRadius: "20px",
              },
              headerTitle: { color: "#fff" },
              headerSubtitle: { color: "#8888a8" },
              socialButtonsBlockButton: {
                border: "1px solid #2a2a3e",
                background: "transparent",
                color: "#e5e7eb",
              },
              dividerLine: { background: "#1e1e2e" },
              dividerText: { color: "#555570" },
              formFieldLabel: { color: "#8888a8" },
              formFieldInput: {
                background: "#111122",
                border: "1px solid #2a2a3e",
                color: "#e5e7eb",
              },
              formButtonPrimary: {
                background: "#3b82f6",
                color: "#fff",
              },
              footerActionLink: { color: "#93c5fd" },
              footerActionText: { color: "#6b7280" },
              formFieldAction: { color: "#93c5fd" },
              otpCodeFieldInput: {
                background: "#111122",
                border: "1px solid #2a2a3e",
                color: "#e5e7eb",
              },
              alertText: { color: "#f87171" },
            },
          }}
        />
      </Suspense>
    </div>
  );
}
