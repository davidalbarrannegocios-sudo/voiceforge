import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function main() {
  // Nuevo plan Plus (1M chars, $26/mes)
  const plusProduct = await stripe.products.create({
    name: 'Elite Labs Plus'
  })
  const plusMonthly = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 2600,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  const plusAnnual = await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 26520, // $26 × 12 × 0.85 = $265.20/año
    currency: 'usd',
    recurring: { interval: 'year' },
  })

  // Pro actualizado ($49/mes)
  const proProduct = await stripe.products.create({
    name: 'Elite Labs Pro'
  })
  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4900,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  const proAnnual = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 49980, // $49 × 12 × 0.85 = $499.80/año
    currency: 'usd',
    recurring: { interval: 'year' },
  })

  console.log('STRIPE_PLUS_MONTHLY_PRICE_ID=', plusMonthly.id)
  console.log('STRIPE_PLUS_ANNUAL_PRICE_ID=', plusAnnual.id)
  console.log('STRIPE_PRO_MONTHLY_PRICE_ID=', proMonthly.id)
  console.log('STRIPE_PRO_ANNUAL_PRICE_ID=', proAnnual.id)
}
main()
