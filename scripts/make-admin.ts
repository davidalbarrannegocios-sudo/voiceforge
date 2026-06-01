import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id} (${user.email}) — current role: ${user.role}`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
    select: { id: true, email: true, role: true },
  });

  console.log(`Updated: role is now "${updated.role}"`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
