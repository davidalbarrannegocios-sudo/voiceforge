/**
 * Reconstructs Generation records from Cloudflare R2 audio files.
 *
 * Usage:
 *   npx tsx scripts/recover-generations-from-r2.ts           # dry-run
 *   npx tsx scripts/recover-generations-from-r2.ts --execute # inserts into DB
 *
 * Requires DATABASE_URL, DIRECT_URL, R2_* and R2_PUBLIC_URL in environment.
 *
 * What it recovers:
 *   - generated/{oldUserId}/*.mp3|wav  → Generation records (status=done)
 *   - dialogues/{oldUserId}/*.mp3      → Generation records (voiceId="dialogue")
 *
 * What it cannot recover:
 *   - Original text (set to placeholder)
 *   - Credits used (set to 0)
 *   - Voice name / voice ID (set to "recovered" / "dialogue")
 */

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--execute");

// ── Old Prisma ID → email mapping ─────────────────────────────────────────────
// Confirmed via Stripe metadata (3), exact CUID timestamp (5), ±3min CUID match (6)
const OLD_ID_TO_EMAIL: Record<string, string> = {
  // Stripe metadata (certain)
  cmpe458q7000012ni3wx3f1pd: "albarranjimenezd@gmail.com",
  cmphfqz060000wt0mpg9df7s7: "aterrizajefatal00@gmail.com",
  cmpmhnowa0000rhkhokcx7bpb: "israelclavijo92@gmail.com",
  // Exact CUID timestamp match
  cmpijgtpi0000qf4jaxv11z7i: "voiceiadelegado@gmail.com",
  cmpk1q0xp000013hvrwqglec6: "pol.masip.marti2@gmail.com",
  cmpj88sht0000xscqv2ocal22: "diogonzalez1992@gmail.com",
  cmpucl57v000ni4xtd5hkw2g8: "danielhh12345@outlook.com",
  cmps7jbho0008120mykpsingh:  "jazz.youtube.1941@gmail.com",
  // ±3 min CUID match (high confidence, single-file users)
  cmpijc1fm000054w38wxqtu77: "parabuscar14@gmail.com",
  cmpo6sgop0015yb4ar2llrygp: "linxibusiness1@gmail.com",
  cmpqthzpx0006lvfp0czymb5u: "gabrielbasterragomez@gmail.com",
  cmpuc013a0002i4xt6nxmg3ie: "somarurou50@gmail.com",
  cmpucbyu40004i4xtqn4zk44b: "netpointtv@gmail.com",
  cmpvfvn9c0004g0yo9865i4y6: "play4proyecto@gmail.com",
  // NOT resolvable: cmpbf1bsm (deleted Clerk account), cmprhn9mx (676min diff), cmpveavrv (44min)
};

interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
}

async function listAll(r2: S3Client, bucket: string, prefix: string): Promise<R2Object[]> {
  const all: R2Object[] = [];
  let cont: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000, ContinuationToken: cont })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.LastModified) {
        all.push({ key: obj.Key, size: obj.Size ?? 0, lastModified: obj.LastModified });
      }
    }
    cont = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (cont);
  return all;
}

function isAudio(key: string): boolean {
  return /\.(mp3|wav|ogg|m4a)$/i.test(key);
}

// Rough duration estimate from file size at 128 kbps
function estimateDuration(bytes: number): number | null {
  if (bytes < 1000) return null;
  return Math.round((bytes * 8) / 128_000 * 10) / 10;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN — no se escribirá nada ===" : "=== MODO EJECUCIÓN ===");
  console.log();

  const bucket    = process.env.R2_BUCKET_NAME!;
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!bucket || !publicUrl) throw new Error("R2_BUCKET_NAME o R2_PUBLIC_URL no configurados");

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  // ── Fetch all audio files from R2 ─────────────────────────────────────────
  console.log("Listando archivos en R2...");
  const [genObjects, dialogueObjects] = await Promise.all([
    listAll(r2, bucket, "generated/"),
    listAll(r2, bucket, "dialogues/"),
  ]);

  // Filter: skip preview/ subfolder and non-audio files
  const genFiles      = genObjects.filter(o => !o.key.startsWith("generated/preview/") && isAudio(o.key));
  const dialogueFiles = dialogueObjects.filter(o => isAudio(o.key));
  console.log(`  generated/ audio files: ${genFiles.length}`);
  console.log(`  dialogues/ audio files: ${dialogueFiles.length}\n`);

  // ── Build email → new Prisma user ID map from DB ──────────────────────────
  const dbUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailToNewId: Record<string, string> = {};
  for (const u of dbUsers) emailToNewId[u.email] = u.id;

  // ── Load existing Generation audioUrls to avoid duplicates ───────────────
  const existing = new Set(
    (await prisma.generation.findMany({ select: { audioUrl: true } }))
      .map(g => g.audioUrl)
      .filter(Boolean) as string[]
  );
  console.log(`Generaciones ya en DB: ${existing.size}\n`);

  // ── Process files ─────────────────────────────────────────────────────────
  type FileEntry = { obj: R2Object; oldUserId: string; email: string | null; newUserId: string | null; audioUrl: string; type: "tts" | "dialogue" };

  function parseFile(obj: R2Object, type: "tts" | "dialogue"): FileEntry {
    const parts     = obj.key.split("/");
    const oldUserId = parts[1];
    const email     = OLD_ID_TO_EMAIL[oldUserId] ?? null;
    const newUserId = email ? (emailToNewId[email] ?? null) : null;
    const audioUrl  = `${publicUrl}/${obj.key}`;
    return { obj, oldUserId, email, newUserId, audioUrl, type };
  }

  const allEntries: FileEntry[] = [
    ...genFiles.map(o => parseFile(o, "tts")),
    ...dialogueFiles.map(o => parseFile(o, "dialogue")),
  ];

  // ── Stats ─────────────────────────────────────────────────────────────────
  const skippedExisting  = allEntries.filter(e => existing.has(e.audioUrl)).length;
  const skippedNoUser    = allEntries.filter(e => !existing.has(e.audioUrl) && !e.newUserId).length;
  const toInsert         = allEntries.filter(e => !existing.has(e.audioUrl) && e.newUserId);

  // Group toInsert by email for summary
  const byEmail: Record<string, { tts: number; dialogue: number }> = {};
  for (const e of toInsert) {
    const key = e.email!;
    if (!byEmail[key]) byEmail[key] = { tts: 0, dialogue: 0 };
    byEmail[key][e.type]++;
  }

  const unknownIds = new Set(
    allEntries.filter(e => !existing.has(e.audioUrl) && !e.newUserId).map(e => e.oldUserId)
  );

  console.log("=== PLAN DE INSERCIÓN ===");
  console.log(`Total archivos de audio en R2:  ${allEntries.length}`);
  console.log(`Ya en DB (skip):                ${skippedExisting}`);
  console.log(`Usuario desconocido (skip):     ${skippedNoUser}  → IDs: ${[...unknownIds].join(", ")}`);
  console.log(`A insertar:                     ${toInsert.length}\n`);

  console.log("Por usuario:");
  for (const [email, counts] of Object.entries(byEmail).sort((a,b) => (b[1].tts + b[1].dialogue) - (a[1].tts + a[1].dialogue))) {
    console.log(`  ${email.padEnd(40)} tts=${counts.tts}  dialogues=${counts.dialogue}  total=${counts.tts + counts.dialogue}`);
  }

  if (DRY_RUN) {
    console.log(`\nRe-ejecuta con --execute para insertar ${toInsert.length} registros.`);
    return;
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  console.log("\nInsertando...");
  let inserted = 0;
  let errors   = 0;

  // Batch in chunks of 50 to avoid overwhelming the DB
  const BATCH = 50;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    const data = chunk.map(e => ({
      userId:          e.newUserId!,
      text:            "[Historial recuperado desde R2 — texto original no disponible]",
      voiceId:         e.type === "dialogue" ? "dialogue" : "recovered",
      audioUrl:        e.audioUrl,
      durationSeconds: estimateDuration(e.obj.size),
      creditsUsed:     0,
      status:          "done",
      createdAt:       e.obj.lastModified,
    }));

    try {
      await prisma.generation.createMany({ data, skipDuplicates: true });
      inserted += chunk.length;
      process.stdout.write(`\r  Insertados: ${inserted}/${toInsert.length}`);
    } catch (err) {
      errors += chunk.length;
      console.error(`\n  Error en batch ${i}-${i + BATCH}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n\n=== RESUMEN FINAL ===`);
  console.log(`Insertados:  ${inserted}`);
  console.log(`Errores:     ${errors}`);
  console.log(`Skipped:     ${skippedExisting + skippedNoUser}`);

  // Final count by user
  console.log("\nRegistros por usuario en DB:");
  const finalCounts = await prisma.generation.groupBy({
    by: ["userId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  const idToEmail = Object.fromEntries(dbUsers.map(u => [u.id, u.email]));
  for (const row of finalCounts) {
    console.log(`  ${(idToEmail[row.userId] ?? row.userId).padEnd(40)} ${row._count.id} registros`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
