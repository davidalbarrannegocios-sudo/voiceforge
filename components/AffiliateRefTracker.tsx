"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function AffiliateRefTrackerInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("ref");
    if (!code) return;

    fetch(`/api/referral/check?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(data => {
        const maxAge = 30 * 24 * 60 * 60;
        // Client-readable cookie for discount display on any page without auth
        document.cookie = `ref_code=${encodeURIComponent(code)}; max-age=${maxAge}; path=/`;
        if (data.hasDiscount) {
          document.cookie = `affiliate_discount=${encodeURIComponent(JSON.stringify({
            code,
            percentage: data.percentage,
            label: data.label,
          }))}; max-age=${maxAge}; path=/`;
        }
      })
      .catch(() => {});
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
