import { prisma } from "@/lib/prisma";

/**
 * Returns the effective plan for feature-gating purposes.
 * Team members inherit "enterprise" regardless of their own user.plan.
 * The stored user.plan is never modified — only this function's result changes feature access.
 */
export async function getEffectivePlan(userId: string, userPlan: string): Promise<string> {
  if (userPlan === "enterprise") return "enterprise";
  const membership = await prisma.teamMember.findUnique({ where: { userId } });
  return membership ? "enterprise" : userPlan;
}
