import Stripe from "stripe";

export const PLAN_CREDITS: Record<string, number> = {
  free:       10_000,
  starter:    200_000,
  pro:        500_000,
  elite:      1_000_000,
  enterprise: 5_000_000,
  lifetime:   20_000_000,
};

// -1 = unlimited
export const PLAN_VOICE_SLOTS: Record<string, number> = {
  free:       1,
  starter:    3,
  pro:        10,
  elite:      20,
  enterprise: -1,
  lifetime:   -1,
};

export const PLANS = {
  starter:    { name: "Starter",    price: 7,   characters: 200_000   },
  pro:        { name: "Pro",        price: 13,  characters: 500_000   },
  elite:      { name: "Elite",      price: 25,  characters: 1_000_000 },
  enterprise: { name: "Enterprise", price: 110, characters: 5_000_000 },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Server-only: resolve priceId from environment variables */
export function getPriceId(planKey: string, billing: "monthly" | "annual" = "monthly"): string {
  const monthly: Record<string, string | undefined> = {
    starter:    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    pro:        process.env.STRIPE_PRICE_PRO_MONTHLY,
    elite:      process.env.STRIPE_PRICE_ELITE_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };
  const annual: Record<string, string | undefined> = {
    starter:    process.env.STRIPE_PRICE_STARTER_ANNUAL,
    pro:        process.env.STRIPE_PRICE_PRO_ANNUAL,
    elite:      process.env.STRIPE_PRICE_ELITE_ANNUAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  };
  if (billing === "annual") return annual[planKey] ?? monthly[planKey] ?? "";
  return monthly[planKey] ?? "";
}

export function getPlanFromPriceId(priceId: string): string | null {
  const maps: Record<string, string | undefined>[] = [
    {
      starter:    process.env.STRIPE_PRICE_STARTER_MONTHLY,
      pro:        process.env.STRIPE_PRICE_PRO_MONTHLY,
      elite:      process.env.STRIPE_PRICE_ELITE_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    },
    {
      starter:    process.env.STRIPE_PRICE_STARTER_ANNUAL,
      pro:        process.env.STRIPE_PRICE_PRO_ANNUAL,
      elite:      process.env.STRIPE_PRICE_ELITE_ANNUAL,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
    },
  ];
  for (const map of maps) {
    for (const [key, id] of Object.entries(map)) {
      if (id && id === priceId) return key;
    }
  }
  return null;
}

export const CREDIT_PACKS = {
  "100k": { credits: 100_000,   price: 5,  label: "100.000 créditos"   },
  "300k": { credits: 300_000,   price: 12, label: "300.000 créditos"   },
  "600k": { credits: 600_000,   price: 19, label: "600.000 créditos"   },
  "1m":   { credits: 1_000_000, price: 30, label: "1.000.000 créditos" },
} as const;

export type PackKey = keyof typeof CREDIT_PACKS;

export function getPackPriceId(packKey: string): string {
  const map: Record<string, string | undefined> = {
    "100k": process.env.STRIPE_PRICE_CREDITS_100K,
    "300k": process.env.STRIPE_PRICE_CREDITS_300K,
    "600k": process.env.STRIPE_PRICE_CREDITS_600K,
    "1m":   process.env.STRIPE_PRICE_CREDITS_1M,
  };
  return map[packKey] ?? "";
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}
