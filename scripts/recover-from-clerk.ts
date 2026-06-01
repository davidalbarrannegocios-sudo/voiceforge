/**
 * Recovers all users from Clerk into the Supabase DB.
 *
 * Usage:
 *   npx tsx scripts/recover-from-clerk.ts           # dry-run (no writes)
 *   npx tsx scripts/recover-from-clerk.ts --execute # actually inserts
 *
 * Requires CLERK_SECRET_KEY (production = sk_live_...) in .env.local or env.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}
interface ClerkUser {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
  created_at: number; // Unix ms
}

async function fetchAllClerkUsers(key: string): Promise<ClerkUser[]> {
  const all: ClerkUser[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Clerk API ${res.status}: ${body}`);
    }
    const batch: ClerkUser[] = await res.json();
    if (batch.length === 0) break;
    all.push(...batch);
    process.stdout.write(`\r  Obteniendo usuarios de Clerk: ${all.length}...`);
    if (batch.length < limit) break;
    offset += limit;
  }
  console.log(); // newline after progress
  return all;
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== DRY RUN — no se escribirá nada ==="
      : "=== MODO EJECUCIÓN — insertando en DB ==="
  );
  console.log();

  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) throw new Error("CLERK_SECRET_KEY no encontrado en el entorno");

  const isTestKey = clerkKey.startsWith("sk_test_");
  if (isTestKey) {
    console.warn("⚠️  ADVERTENCIA: Estás usando una clave de PRUEBA de Clerk (sk_test_...).");
    console.warn("   Los usuarios recuperados serán del entorno de DESARROLLO, no producción.");
    console.warn("   Si tu app tiene usuarios reales, usa la clave sk_live_... de Railway.\n");
  } else {
    console.log("✅ Clave Clerk de PRODUCCIÓN detectada.\n");
  }

  console.log("Obteniendo usuarios de Clerk...");
  const clerkUsers = await fetchAllClerkUsers(clerkKey);
  console.log(`Total usuarios en Clerk: ${clerkUsers.length}\n`);

  if (clerkUsers.length === 0) {
    console.log("No se encontraron usuarios en Clerk. ¿Es la clave correcta?");
    return;
  }

  // Load existing clerkIds to avoid duplicates
  const existingClerkIds = new Set(
    (await prisma.user.findMany({ select: { clerkId: true } })).map((u) => u.clerkId)
  );
  console.log(`Usuarios ya en DB: ${existingClerkIds.size}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  const createdList: { email: string; clerkId: string }[] = [];

  for (const cu of clerkUsers) {
    const email = cu.email_addresses[0]?.email_address;
    if (!email) {
      console.warn(`  ⚠ Sin email para ${cu.id}, ignorando.`);
      skipped++;
      continue;
    }

    if (existingClerkIds.has(cu.id)) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] Crearía: ${email} (clerkId: ${cu.id})`);
      created++;
      continue;
    }

    try {
      await prisma.user.create({
        data: {
          clerkId: cu.id,
          email,
          credits: 5_000,
          plan: "free",
          role: "user",
          createdAt: new Date(cu.created_at),
        },
      });
      created++;
      createdList.push({ email, clerkId: cu.id });
      console.log(`  ✓ ${email}`);
    } catch (err) {
      errors++;
      console.error(
        `  ✗ Error con ${email}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Total en Clerk:       ${clerkUsers.length}`);
  console.log(`${DRY_RUN ? "Se crearían" : "Creados"}:         ${created}`);
  console.log(`Ya existían (skip):   ${skipped}`);
  console.log(`Errores:              ${errors}`);

  if (DRY_RUN && created > 0) {
    console.log("\nRe-ejecuta con --execute para insertar estos usuarios.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
