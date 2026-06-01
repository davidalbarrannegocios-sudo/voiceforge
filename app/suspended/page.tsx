"use client";

import { Suspense, useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function SuspendedContent() {
  const { signOut } = useClerk();
  const searchParams = useSearchParams();
  const [until, setUntil] = useState<string | null>(null);

  useEffect(() => {
    const u = searchParams.get("until");
    if (u) setUntil(u);
  }, [searchParams]);

  const untilDate = until ? new Date(until) : null;
  const formatted = untilDate
    ? untilDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0a0a0f" }}
    >
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Image src="/elitelabs.png" alt="Elite Labs" width={38} height={38} className="rounded-xl" />
        <span className="text-white text-xl font-bold">Elite Labs</span>
      </Link>

      <div
        className="w-full max-w-sm rounded-2xl flex flex-col items-center text-center p-8"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(234,179,8,0.12)" }}
        >
          <ShieldAlert size={28} className="text-yellow-400" />
        </div>

        <h1 className="text-white text-2xl font-bold mb-2">Cuenta suspendida</h1>

        {formatted ? (
          <p className="text-gray-400 text-sm mb-6">
            Tu cuenta ha sido suspendida temporalmente hasta el{" "}
            <span className="text-white font-medium">{formatted}</span>.
          </p>
        ) : (
          <p className="text-gray-400 text-sm mb-6">
            Tu cuenta ha sido suspendida temporalmente.
          </p>
        )}

        <p className="text-gray-500 text-xs mb-8">
          Si crees que esto es un error, contacta con soporte y te ayudaremos a resolver el problema.
        </p>

        <a
          href="mailto:soporte@elitelabs.io"
          className="w-full h-10 flex items-center justify-center rounded-lg text-sm font-medium text-white mb-3 transition-colors"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Contactar soporte
        </a>

        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="w-full h-10 flex items-center justify-center rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function SuspendedPage() {
  return (
    <Suspense fallback={null}>
      <SuspendedContent />
    </Suspense>
  );
}
