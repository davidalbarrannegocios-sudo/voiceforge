import { prisma } from "@/lib/prisma";

type LogLevel = "info" | "warn" | "error" | "debug";

export async function log(
  level: LogLevel,
  category: string,
  message: string,
  details?: unknown,
  userId?: string
) {
  const detailsStr = details ? JSON.stringify(details) : undefined;

  if (level === "error") {
    console.error(`[${category}] ${message}`, details ?? "");
  } else {
    console.log(`[${level.toUpperCase()}][${category}] ${message}`, details ?? "");
  }

  prisma.appLog
    .create({
      data: {
        level,
        category,
        message,
        details: detailsStr,
        userId,
      },
    })
    .catch(() => {});
}
