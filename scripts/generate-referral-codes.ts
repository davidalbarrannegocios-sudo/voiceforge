/**
 * Genera códigos de referido para todos los usuarios que no tengan uno.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/generate-referral-codes.ts           # dry-run
 *   DATABASE_URL="..." npx tsx scripts/generate-referral-codes.ts --execute  # aplica
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

async function uniqueCode(existing: Set<string>): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const c = randCode();
    if (!existing.has(c)) { existing.add(c); return c; }
  }
  throw new Error("No se pudo generar código único");
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN — sin escrituras ===" : "=== EJECUTANDO ===");

  const usersWithout = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, email: true },
  });

  const usersWithCode = await prisma.user.findMany({
    where: { referralCode: { not: null } },
    select: { referralCode: true },
  });

  const existingCodes = new Set(usersWithCode.map(u => u.referralCode!));

  console.log(`Usuarios sin código:   ${usersWithout.length}`);
  console.log(`Usuarios con código:   ${usersWithCode.length}`);
  console.log(`Total:                 ${usersWithout.length + usersWithCode.length}\n`);

  if (usersWithout.length === 0) {
    console.log("✓ Todos los usuarios ya tienen código de referido.");
    return;
  }

  if (DRY_RUN) {
    console.log("Primeros 10 que recibirían código:");
    usersWithout.slice(0, 10).forEach(u => console.log(`  ${u.email}`));
    if (usersWithout.length > 10) console.log(`  ... y ${usersWithout.length - 10} más`);
    console.log(`\nEjecuta con --execute para generar ${usersWithout.length} códigos.`);
    return;
  }

  let updated = 0;
  let errors = 0;

  for (const user of usersWithout) {
    try {
      const code = await uniqueCode(existingCodes);
      await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
      console.log(`  ✓ ${user.email.padEnd(40)} → ${code}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ${user.email}: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Errores:      ${errors}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
