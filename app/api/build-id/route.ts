import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Read once at module load time — stable for the lifetime of this process.
// Fallback is also fixed at module load (not per-request), so it never changes
// between requests within the same build.
const STABLE_BUILD_ID: string = (() => {
  // Try several candidate paths for .next/BUILD_ID
  const candidates = [
    path.join(process.cwd(), ".next", "BUILD_ID"),
    path.join(process.cwd(), "BUILD_ID"),             // inside standalone, cwd is .next/standalone
    path.join(__dirname, "..", "..", "..", "BUILD_ID"), // relative to this route file
  ];
  for (const p of candidates) {
    try {
      const content = fs.readFileSync(p, "utf8").trim();
      if (content) return content;
    } catch { /* try next candidate */ }
  }
  // Stable fallback: fixed at process start, never changes between requests
  return `pid-${process.pid}-${process.hrtime.bigint().toString(36)}`;
})();

export async function GET() {
  return NextResponse.json({ buildId: STABLE_BUILD_ID });
}
