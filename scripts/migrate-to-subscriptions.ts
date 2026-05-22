/**
 * Run once after deploying the subscription schema:
 *   npx tsx scripts/migrate-to-subscriptions.ts
 *
 * Resets all users to free plan with 0 credits.
 * Clears any legacy stripeCustomerId / stripeSubscriptionId.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log(`Migrating ${count} users to free plan...`);

  const result = await prisma.user.updateMany({
    data: {
      plan: "free",
      credits: 0,
      planExpiresAt: null,
      stripeSubscriptionId: null,
    },
  });

  console.log(`Done. Updated ${result.count} users.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
