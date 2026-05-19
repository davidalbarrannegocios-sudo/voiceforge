import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id, status: "rewarded" },
  });

  if (referrals.length === 0) {
    return NextResponse.json({ claimed: 0 });
  }

  const totalChars = referrals.reduce((sum, r) => sum + r.rewardChars, 0);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: totalChars } },
    }),
    ...referrals.map((r) =>
      prisma.referral.update({
        where: { id: r.id },
        data: { status: "claimed" },
      })
    ),
  ]);

  return NextResponse.json({ claimed: totalChars });
}
