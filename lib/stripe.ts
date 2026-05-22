import Stripe from "stripe";

export const PLAN_CREDITS: Record<string, number> = {
  free:       10_000,
  starter:    200_000,
  pro:        500_000,
  elite:      1_000_000,
  enterprise: 5_000_000,
};

// -1 = unlimited
export const PLAN_VOICE_SLOTS: Record<string, number> = {
  free:       0,
  starter:    3,
  pro:        10,
  elite:      20,
  enterprise: -1,
};

export const PLANS = {
  starter:    { name: "Starter",    price: 7,   characters: 200_000   },
  pro:        { name: "Pro",        price: 13,  characters: 500_000   },
  elite:      { name: "Elite",      price: 25,  characters: 1_000_000 },
  enterprise: { name: "Enterprise", price: 110, characters: 5_000_000 },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Server-only: resolve priceId from environment variables */
export function getPriceId(planKey: string): string {
  const map: Record<string, string | undefined> = {
    starter:    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    pro:        process.env.STRIPE_PRICE_PRO_MONTHLY,
    elite:      process.env.STRIPE_PRICE_ELITE_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };
  return map[planKey] ?? "";
}

export function getPlanFromPriceId(priceId: string): string | null {
  const map: Record<string, string | undefined> = {
    starter:    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    pro:        process.env.STRIPE_PRICE_PRO_MONTHLY,
    elite:      process.env.STRIPE_PRICE_ELITE_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };
  for (const [key, id] of Object.entries(map)) {
    if (id && id === priceId) return key;
  }
  return null;
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
