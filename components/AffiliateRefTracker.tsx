"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function AffiliateRefTrackerInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("ref");
    if (!code) return;
    fetch("/api/set-affiliate-ref", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [searchParams]);

  return null;
}

export function AffiliateRefTracker() {
  return (
    <Suspense fallback={null}>
      <AffiliateRefTrackerInner />
    </Suspense>
  );
}
