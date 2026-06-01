/**
 * Restores plans and credits from active Stripe subscriptions.
 * Run AFTER recover-from-clerk.ts so users exist in DB.
 *
 * Usage:
 *   npx tsx scripts/recover-subscriptions-from-stripe.ts           # dry-run
 *   npx tsx scripts/recover-subscriptions-from-stripe.ts --execute # applies changes
 *
 * Requires STRIPE_SECRET_KEY and STRIPE_PRICE_* in .env.local or env.
 */

import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { PLAN_CREDITS } from "../lib/stripe";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");

function buildPriceMap(): Record<string, string> {
  const entries: [string, string | undefined][] = [
    ["starter",    process.env.STRIPE_PRICE_STARTER_MONTHLY],
    ["starter",    process.env.STRIPE_PRICE_STARTER_ANNUAL],
    ["pro",        process.env.STRIPE_PRICE_PRO_MONTHLY],
    ["pro",        process.env.STRIPE_PRICE_PRO_ANNUAL],
    ["elite",      process.env.STRIPE_PRICE_ELITE_MONTHLY],
    ["elite",      process.env.STRIPE_PRICE_ELITE_ANNUAL],
    ["enterprise", process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY],
    ["enterprise", process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL],
  ];
  const map: Record<string, string> = {};
  for (const [plan, id] of entries) {
    if (id) map[id] = plan;
  }
  return map;
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== DRY RUN — no se escribirá nada ==="
      : "=== MODO EJECUCIÓN — actualizando planes ==="
  );
  console.log();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY no encontrado en el entorno");

  const isLive = stripeKey.startsWith("sk_live_");
  console.log(`Stripe: ${isLive ? "✅ LIVE" : "⚠️  TEST"}\n`);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" });
  const priceToplan = buildPriceMap();

  console.log("Price IDs configurados:");
  for (const [id, plan] of Object.entries(priceToplan)) {
    console.log(`  ${id} → ${plan}`);
  }
  console.log();

  // Fetch all active and trialing subscriptions
  console.log("Obteniendo suscripciones activas de Stripe...");
  const subscriptions: Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.list({
    status: "active",
    limit: 100,
    expand: ["data.customer"],
  })) {
    subscriptions.push(sub);
  }
  // Also get trialing
  for await (const sub of stripe.subscriptions.list({
    status: "trialing",
    limit: 100,
    expand: ["data.customer"],
  })) {
    subscriptions.push(sub);
  }

  console.log(`Suscripciones activas/trialing encontradas: ${subscriptions.length}\n`);

  let updated = 0;
  let notFound = 0;
  let unknownPlan = 0;
  let errors = 0;
  const updatedList: { email: string; plan: string; interval: string }[] = [];
  const notFoundList: string[] = [];

  for (const sub of subscriptions) {
    const customer = sub.customer as Stripe.Customer;
    const customerEmail = customer.email;
    const stripeCustomerId = customer.id;
    const subscriptionId = sub.id;

    if (!customerEmail) {
      console.warn(`  ⚠ Customer ${stripeCustomerId} sin email, ignorando.`);
      notFound++;
      continue;
    }

    // Determine plan from price ID
    const priceId = sub.items.data[0]?.price?.id;
    const planKey = priceId ? priceToplan[priceId] : undefined;

    if (!planKey) {
      console.warn(`  ⚠ Plan desconocido para priceId=${priceId ?? "n/a"} (${customerEmail})`);
      unknownPlan++;
      continue;
    }

    const credits = PLAN_CREDITS[planKey] ?? 5_000;
    const interval = sub.items.data[0]?.plan?.interval === "year" ? "annual" : "monthly";
    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const periodStart = new Date(sub.items.data[0].current_period_start * 1000);

    // Find user in DB by email (stripeCustomerId was lost)
    const user = await prisma.user.findFirst({ where: { email: customerEmail } });

    if (!user) {
      console.warn(`  ✗ Usuario no encontrado en DB: ${customerEmail}`);
      notFound++;
      notFoundList.push(customerEmail);
      continue;
    }

    console.log(
      `  ${DRY_RUN ? "[DRY]" : "→"} ${customerEmail}: ${user.plan} → ${planKey} | ${credits.toLocaleString()} créditos | ${interval}`
    );

    if (!DRY_RUN) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: planKey,
            credits,
            stripeCustomerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            billingInterval: interval,
            planExpiresAt: periodEnd,
            creditsRenewedAt: periodStart,
          },
        });
        updated++;
        updatedList.push({ email: customerEmail, plan: planKey, interval });
      } catch (err) {
        errors++;
        console.error(
          `  ✗ Error actualizando ${customerEmail}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    } else {
      updated++;
      updatedList.push({ email: customerEmail, plan: planKey, interval });
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Suscripciones procesadas:     ${subscriptions.length}`);
  console.log(`${DRY_RUN ? "Se actualizarían" : "Actualizados"}:          ${updated}`);
  console.log(`No encontrados en DB:         ${notFound}`);
  console.log(`Plan no reconocido:           ${unknownPlan}`);
  console.log(`Errores:                      ${errors}`);

  if (updatedList.length > 0) {
    console.log("\nPlanes restaurados:");
    for (const u of updatedList) {
      console.log(`  ${u.email} → ${u.plan} (${u.interval})`);
    }
  }

  if (notFoundList.length > 0) {
    console.log("\n⚠  Emails con suscripción activa pero sin cuenta en DB:");
    for (const e of notFoundList) console.log(`  - ${e}`);
    console.log("  → Asegúrate de ejecutar recover-from-clerk.ts --execute primero.");
  }

  if (DRY_RUN && updated > 0) {
    console.log("\nRe-ejecuta con --execute para aplicar los cambios.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
