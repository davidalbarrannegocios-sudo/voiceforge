/**
 * Creates the 2 users with active Stripe subscriptions that are missing from DB.
 * Uses original Prisma IDs from Stripe metadata + clerkId from Clerk API.
 *
 * Usage:
 *   npx tsx scripts/recover-missing-users.ts           # dry-run
 *   npx tsx scripts/recover-missing-users.ts --execute # inserts into DB
 *
 * Requires:
 *   - CLERK_SECRET_KEY (PRODUCTION = sk_live_...) in environment
 *   - STRIPE_SECRET_KEY in environment
 */

import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { PLAN_CREDITS } from "../lib/stripe";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");

interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
  created_at: number;
}

async function clerkLookupByEmail(email: string, key: string): Promise<ClerkUser | null> {
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`Clerk API ${res.status}: ${await res.text()}`);
  const users: ClerkUser[] = await res.json();
  return users[0] ?? null;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== MODO EJECUCIÓN ===");
  console.log();

  const clerkKey = process.env.CLERK_SECRET_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!clerkKey) throw new Error("CLERK_SECRET_KEY no encontrado");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY no encontrado");

  const isTestKey = clerkKey.startsWith("sk_test_");
  if (isTestKey) {
    console.error("❌ Estás usando la clave TEST de Clerk (sk_test_...).");
    console.error("   Para recuperar usuarios reales necesitas la clave sk_live_... de Railway.");
    process.exit(1);
  }
  console.log("✅ Clave Clerk de PRODUCCIÓN\n");

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" });

  // Hardcoded from Stripe metadata — these are the users with active subs not in DB
  const MISSING = [
    { email: "israelclavijo92@gmail.com",   originalId: "cmpmhnowa0000rhkhokcx7bpb", plan: "starter", subId: "sub_1TbICv0R6kPOy9LAWh74pAqx", customerId: "cus_UaT69F7CSM1em9" },
    { email: "aterrizajefatal00@gmail.com",  originalId: "cmphfqz060000wt0mpg9df7s7", plan: "elite",   subId: "sub_1Ta0hX0R6kPOy9LAer9pbpEb", customerId: "cus_UZ8yQgT8Lwk4j0" },
  ];

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const u of MISSING) {
    console.log(`Processing: ${u.email}`);

    // Check if already in DB (by email or original ID)
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: u.email }, { id: u.originalId }] },
    });
    if (existing) {
      console.log(`  ⚠ Ya existe en DB (id: ${existing.id}), actualizando plan Stripe...`);
      if (!DRY_RUN) {
        const sub = await stripe.subscriptions.retrieve(u.subId);
        const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
        const periodStart = new Date(sub.items.data[0].current_period_start * 1000);
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            plan: u.plan,
            credits: PLAN_CREDITS[u.plan] ?? 5_000,
            stripeCustomerId: u.customerId,
            stripeSubscriptionId: u.subId,
            billingInterval: "monthly",
            planExpiresAt: periodEnd,
            creditsRenewedAt: periodStart,
          },
        });
        console.log(`  ✓ Plan actualizado a ${u.plan}`);
      } else {
        console.log(`  [DRY] Actualizaría plan a ${u.plan}`);
      }
      skipped++;
      continue;
    }

    // Look up clerkId from production Clerk
    console.log(`  Buscando en Clerk: ${u.email}...`);
    const clerkUser = await clerkLookupByEmail(u.email, clerkKey);
    if (!clerkUser) {
      console.error(`  ✗ No encontrado en Clerk: ${u.email}`);
      errors++;
      continue;
    }
    console.log(`  ✓ Clerk ID: ${clerkUser.id}`);

    // Get Stripe subscription details for period dates
    const sub = await stripe.subscriptions.retrieve(u.subId);
    const periodEnd = new Date(sub.items.data[0].current_period_end * 1000);
    const periodStart = new Date(sub.items.data[0].current_period_start * 1000);
    const credits = PLAN_CREDITS[u.plan] ?? 5_000;

    if (DRY_RUN) {
      console.log(`  [DRY] Crearía: id=${u.originalId} | clerkId=${clerkUser.id} | plan=${u.plan} | credits=${credits.toLocaleString()}`);
      created++;
      continue;
    }

    try {
      await prisma.user.create({
        data: {
          id: u.originalId,
          clerkId: clerkUser.id,
          email: u.email,
          plan: u.plan,
          credits,
          stripeCustomerId: u.customerId,
          stripeSubscriptionId: u.subId,
          billingInterval: "monthly",
          planExpiresAt: periodEnd,
          creditsRenewedAt: periodStart,
          role: "user",
          createdAt: new Date(clerkUser.created_at),
        },
      });
      console.log(`  ✓ Creado: ${u.email} | ${u.plan} | ${credits.toLocaleString()} créditos`);
      created++;
    } catch (err) {
      errors++;
      console.error(`  ✗ Error:`, err instanceof Error ? err.message : String(err));
    }

    console.log();
  }

  console.log("\n=== RESUMEN ===");
  console.log(`${DRY_RUN ? "Se crearían" : "Creados"}:   ${created}`);
  console.log(`Ya existían: ${skipped}`);
  console.log(`Errores:     ${errors}`);

  if (DRY_RUN && (created + skipped) > 0) {
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
