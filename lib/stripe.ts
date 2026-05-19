import Stripe from "stripe";

export const PLANS = {
  basico: {
    name: "Básico",
    price: 6,
    characters: 250000,
    priceId: process.env.STRIPE_PRICE_BASICO!,
  },
  pro: {
    name: "Pro",
    price: 12,
    characters: 600000,
    priceId: process.env.STRIPE_PRICE_PRO!,
  },
  premium: {
    name: "Premium",
    price: 24,
    characters: 1400000,
    priceId: process.env.STRIPE_PRICE_PREMIUM!,
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
