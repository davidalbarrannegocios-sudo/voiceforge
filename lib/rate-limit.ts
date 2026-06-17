const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

interface Entry {
  count: number;
  resetAt: number;
}

// globalThis ensures the store survives module re-evaluations in the Edge Runtime sandbox
declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Entry> | undefined;
  // eslint-disable-next-line no-var
  var __rateLimitCleanupScheduled: boolean | undefined;
}

if (!globalThis.__rateLimitStore) {
  globalThis.__rateLimitStore = new Map<string, Entry>();
}

// Purge expired entries every minute — guard prevents duplicate intervals
if (!globalThis.__rateLimitCleanupScheduled) {
  globalThis.__rateLimitCleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of globalThis.__rateLimitStore!) {
      if (entry.resetAt <= now) globalThis.__rateLimitStore!.delete(key);
    }
  }, WINDOW_MS);
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const store = globalThis.__rateLimitStore!;
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining,
    retryAfterSeconds,
  };
}
