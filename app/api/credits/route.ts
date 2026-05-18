import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  // Auto-create user on first visit after sign-up
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        credits: 0,
      },
    });
  }

  return NextResponse.json({ credits: user.credits });
}
