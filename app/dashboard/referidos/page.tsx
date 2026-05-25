"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReferidosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard?tab=referral");
  }, [router]);
  return null;
}
