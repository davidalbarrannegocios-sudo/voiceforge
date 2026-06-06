import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  const plans = [
    { name: "Plus",  monthly: 800,   annual: 8160   },
    { name: "Pro",   monthly: 5500,  annual: 56100  },
    { name: "Elite", monthly: 31500, annual: 321300 },
  ];

  for (const plan of plans) {
    const product = await stripe.products.create({ name: `Elite Labs ${plan.name}` });

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly,
      currency: "usd",
      recurring: { interval: "month" },
    });

    const annual = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.annual,
      currency: "usd",
      recurring: { interval: "year" },
    });

    console.log(`${plan.name} mensual: ${monthly.id}`);
    console.log(`${plan.name} anual:   ${annual.id}`);
  }
}

main().catch(console.error);
