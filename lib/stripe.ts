import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const PLANS = {
  starter: {
    name: "Starter",
    price: 9,
    credits: 100,
    priceId: process.env.STRIPE_PRICE_STARTER!,
    description: "~50 min de audio",
  },
  pro: {
    name: "Pro",
    price: 29,
    credits: 400,
    priceId: process.env.STRIPE_PRICE_PRO!,
    description: "~200 min de audio",
  },
  studio: {
    name: "Studio",
    price: 79,
    credits: 1200,
    priceId: process.env.STRIPE_PRICE_STUDIO!,
    description: "~600 min de audio",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
