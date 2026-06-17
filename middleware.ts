import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/blog(.*)",
  "/about(.*)",
  "/support",
  "/gallery(.*)",
  "/privacy",
  "/terms",
  "/voices(.*)",
  "/descubrir(.*)",
  "/docs(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/suspended(.*)",
  "/r/(.*)",
  "/sitemap.xml",
  "/api/webhooks/stripe",
  "/api/public-voices(.*)",
  "/api/voice-image",
  "/api/demo-voice",
  "/api/v1/(.*)",
  "/api/referral/check",
  "/api/cookie-consent",
  "/api/cookie-consent/link",
  "/api/visit",
  "/api/cron/(.*)",
  "/api/build-id",
  "/api/announcements",
  "/studio(.*)",
]);

const isRateLimitExempt = createRouteMatcher([
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
  "/api/fish-voices(.*)",
  "/api/fish-voice/(.*)",
  "/api/public-voices(.*)",
  "/api/voice-image(.*)",
  "/api/ai33-voices-eleven(.*)",
  "/api/voices/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // /api/clone handles large multipart uploads; exclude from middleware entirely.
  // Auth is enforced inside the route handler via currentUser().
  if (req.nextUrl.pathname === "/api/clone") return;

  // Rate limiting — applied before auth, only for /api/* routes that are not webhooks/crons
  if (
    req.nextUrl.pathname.startsWith("/api/") &&
    !isRateLimitExempt(req)
  ) {
    const cfIp = req.headers.get("cf-connecting-ip");
    const xffIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const ip = cfIp ?? xffIp ?? "unknown";

    const { allowed, remaining, retryAfterSeconds } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiadas peticiones, inténtalo de nuevo en un momento" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Check suspension via Clerk publicMetadata (no DB call needed)
  const meta = sessionClaims?.publicMetadata as { suspendedUntil?: string } | undefined;
  if (meta?.suspendedUntil && new Date(meta.suspendedUntil) > new Date()) {
    const url = new URL("/suspended", req.url);
    url.searchParams.set("until", meta.suspendedUntil);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
