import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
      <Suspense fallback={
        <div className="text-white animate-pulse">Cargando...</div>
      }>
        <SignIn fallbackRedirectUrl="/dashboard" />
      </Suspense>
    </div>
  );
}
