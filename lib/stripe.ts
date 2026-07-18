import Stripe from "stripe";

export const PLAN_CREDITS: Record<string, number> = {
  free:       5_000,
  // current plans
  creator:    250_000,
  plus:       1_000_000,
  pro:        2_000_000,
  elite:      15_000_000,
  // legacy plans (unchanged — webhooks still use these)
  starter:    200_000,
  enterprise: 5_000_000,
  lifetime:   20_000_000,
};

// -1 = unlimited
export const PLAN_VOICE_SLOTS: Record<string, number> = {
  free:       1,
  creator:    3,
  plus:       10,
  pro:        15,
  elite:      20,
  // legacy
  starter:    3,
  enterprise: -1,
  lifetime:   -1,
};

// Active sellable plans (used for checkout validation)
export const PLANS = {
  creator:    { name: "Creator",    price: 8,   characters: 250_000    },
  plus:       { name: "Plus",       price: 26,  characters: 1_000_000  },
  pro:        { name: "Pro",        price: 49,  characters: 2_000_000  },
  elite:      { name: "Elite",      price: 315, characters: 15_000_000 },
  // legacy — kept so activate-subscription still validates them
  starter:    { name: "Starter",    price: 7,   characters: 200_000    },
  enterprise: { name: "Enterprise", price: 110, characters: 5_000_000  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Server-only: resolve priceId from environment variables */
export function getPriceId(planKey: string, billing: "monthly" | "annual" = "monthly"): string {
  const monthly: Record<string, string | undefined> = {
    creator:    process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
    plus:       process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,
    pro:        process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    elite:      process.env.STRIPE_ELITE_MONTHLY_PRICE_ID,
    // legacy (kept for existing subscribers)
    starter:    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };
  const annual: Record<string, string | undefined> = {
    creator:    process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID,
    plus:       process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
    pro:        process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    elite:      process.env.STRIPE_ELITE_ANNUAL_PRICE_ID,
    // legacy
    starter:    process.env.STRIPE_PRICE_STARTER_ANNUAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  };
  if (billing === "annual") return annual[planKey] ?? monthly[planKey] ?? "";
  return monthly[planKey] ?? "";
}

export function getPlanFromPriceId(priceId: string): string | null {
  const maps: Record<string, string | undefined>[] = [
    {
      creator:    process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
      plus:       process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,
      pro:        process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      elite:      process.env.STRIPE_ELITE_MONTHLY_PRICE_ID,
      // legacy
      starter:    process.env.STRIPE_PRICE_STARTER_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    },
    {
      creator:    process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID,
      plus:       process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
      pro:        process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      elite:      process.env.STRIPE_ELITE_ANNUAL_PRICE_ID,
      // legacy
      starter:    process.env.STRIPE_PRICE_STARTER_ANNUAL,
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
