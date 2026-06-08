export const ELITE_TEXT_PLANS = {
  text_pro: {
    name: 'Text Pro',
    tokens: 750_000,
    priceMonthly: 18,
    scripts20min: 150,
    minutes: 3000,
    model: 'claude-sonnet-4-5',
    stripePriceId: process.env.STRIPE_TEXT_PRO_PRICE_ID ?? '',
  },
  text_elite: {
    name: 'Text Elite',
    tokens: 3_000_000,
    priceMonthly: 60,
    scripts20min: 600,
    minutes: 12000,
    model: 'claude-sonnet-4-5',
    stripePriceId: process.env.STRIPE_TEXT_ELITE_PRICE_ID ?? '',
  },
} as const

export type EliteTextPlanKey = keyof typeof ELITE_TEXT_PLANS

export function getTokenPercentage(used: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}
