/**
 * Manual DB backup — exports critical tables to JSON files with timestamp.
 *
 * Usage:
 *   npx tsx scripts/backup-db.ts
 *
 * Output: backups/YYYY-MM-DD_HH-mm-ss/
 *   users.json, generations.json, purchases.json, credit-packs.json,
 *   referrals.json, cloned-voices.json, support-tickets.json,
 *   withdrawal-requests.json, affiliate-applications.json
 *
 * Requires DATABASE_URL and DIRECT_URL in environment (or .env / .env.local).
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const TABLES = [
  { name: "users",                  fetch: () => prisma.user.findMany() },
  { name: "generations",            fetch: () => prisma.generation.findMany() },
  { name: "purchases",              fetch: () => prisma.purchase.findMany() },
  { name: "credit-packs",           fetch: () => prisma.creditPack.findMany() },
  { name: "referrals",              fetch: () => prisma.referral.findMany() },
  { name: "cloned-voices",          fetch: () => prisma.clonedVoice.findMany() },
  { name: "support-tickets",        fetch: () => prisma.supportTicket.findMany() },
  { name: "withdrawal-requests",    fetch: () => prisma.withdrawalRequest.findMany() },
  { name: "affiliate-applications", fetch: () => prisma.affiliateApplication.findMany() },
];

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace("T", "_")
    .replace(/:/g, "-")
    .slice(0, 19);
}

async function main() {
  const ts = timestamp();
  const outDir = path.resolve(process.cwd(), "backups", ts);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Backup → ${outDir}\n`);

  let totalRows = 0;

  for (const table of TABLES) {
    process.stdout.write(`  ${table.name.padEnd(26)}`);
    const rows = await table.fetch();
    const file = path.join(outDir, `${table.name}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf-8");
    console.log(`${rows.length} rows`);
    totalRows += rows.length;
  }

  // Write a manifest with metadata
  const manifest = {
    createdAt: new Date().toISOString(),
    tables: TABLES.map((t) => t.name),
    totalRows,
    outDir,
  };
  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Backup completo — ${totalRows} filas totales en ${outDir}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Backup failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
