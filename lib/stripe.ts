import Stripe from "stripe";

export const PLANS = {
  starter: {
    name: "Starter",
    price: 7,
    characters: 200000,
    priceId: process.env.STRIPE_PRICE_STARTER ?? "",
  },
  pro: {
    name: "Pro",
    price: 13,
    characters: 500000,
    priceId: process.env.STRIPE_PRICE_PRO ?? "",
  },
  elite: {
    name: "Elite",
    price: 25,
    characters: 1000000,
    priceId: process.env.STRIPE_PRICE_ELITE ?? "",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

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
