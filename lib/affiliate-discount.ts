export interface AffiliateDiscount {
  code: string;
  percentage: number;
  label: string;
}

export function getAffiliateDiscountFromCookies(): AffiliateDiscount | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)affiliate_discount=([^;]*)/);
  if (!m) return null;
  try {
    const d = JSON.parse(decodeURIComponent(m[1]));
    if (d && typeof d.percentage === "number" && d.percentage > 0) return d as AffiliateDiscount;
  } catch {}
  return null;
}

export function applyDiscount(price: number, percentage: number): number {
  return Math.round(price * (1 - percentage / 100) * 10) / 10;
}
