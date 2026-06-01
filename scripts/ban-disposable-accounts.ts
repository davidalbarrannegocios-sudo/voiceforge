/**
 * Finds and bans Prisma users registered with disposable email domains.
 *
 * Usage:
 *   npx tsx scripts/ban-disposable-accounts.ts          # dry-run (no changes)
 *   npx tsx scripts/ban-disposable-accounts.ts --execute # actually deletes
 *
 * Requires CLERK_SECRET_KEY in the environment (reads .env.local automatically
 * when run via tsx from the project root).
 */

import { PrismaClient } from "@prisma/client";
import { DISPOSABLE_DOMAINS } from "../lib/disposable-email-domains";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN — no changes will be made ===" : "=== EXECUTE MODE ===");

  // Fetch all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, clerkId: true, plan: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const affected = users.filter((u) => {
    const domain = u.email.split("@")[1]?.toLowerCase().trim();
    return domain && DISPOSABLE_DOMAINS.has(domain);
  });

  if (affected.length === 0) {
    console.log("✓ No accounts found with disposable email domains.");
    return;
  }

  console.log(`\nFound ${affected.length} account(s) with disposable emails:\n`);
  for (const u of affected) {
    console.log(`  - ${u.email} | plan=${u.plan} | clerkId=${u.clerkId} | created=${u.createdAt.toISOString().split("T")[0]}`);
  }

  if (DRY_RUN) {
    console.log(`\nRe-run with --execute to delete these ${affected.length} account(s).`);
    return;
  }

  // Attempt to ban via Clerk API if CLERK_SECRET_KEY is present
  let clerkBanned = 0;
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (clerkKey) {
    console.log("\nBanning accounts via Clerk API...");
    for (const u of affected) {
      if (!u.clerkId) continue;
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${u.clerkId}/ban`, {
          method: "POST",
          headers: { Authorization: `Bearer ${clerkKey}` },
        });
        if (res.ok) {
          console.log(`  ✓ Banned ${u.clerkId} (${u.email})`);
          clerkBanned++;
        } else {
          console.warn(`  ✗ Clerk ban failed for ${u.clerkId}: ${res.status}`);
        }
      } catch (err) {
        console.warn(`  ✗ Clerk error for ${u.clerkId}:`, err);
      }
    }
  } else {
    console.warn("\nCLERK_SECRET_KEY not set — skipping Clerk ban, only deleting from DB.");
  }

  // Delete from Prisma
  console.log("\nDeleting from database...");
  const ids = affected.map((u) => u.id);
  const { count } = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`✓ Deleted ${count} user(s) from the database.`);
  if (clerkKey) console.log(`✓ Banned ${clerkBanned}/${affected.length} user(s) in Clerk.`);
  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
