import Stripe from "stripe";

export const PLAN_CREDITS: Record<string, number> = {
  free:    10_000,
  starter: 200_000,
  pro:     500_000,
  elite:   1_000_000,
};

export const PLAN_VOICE_SLOTS: Record<string, number> = {
  free:    0,
  starter: 3,
  pro:     10,
  elite:   20,
};

export const PLANS = {
  starter: {
    name: "Starter",
    price: 7,
    characters: 200_000,
    priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
  },
  pro: {
    name: "Pro",
    price: 13,
    characters: 500_000,
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  },
  elite: {
    name: "Elite",
    price: 25,
    characters: 1_000_000,
    priceId: process.env.STRIPE_PRICE_ELITE_MONTHLY ?? "",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanFromPriceId(priceId: string): string | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key;
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
