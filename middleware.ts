import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/voices(.*)",
  "/descubrir(.*)",
  "/docs(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/suspended(.*)",
  "/r/(.*)",
  "/api/webhooks/stripe",
  "/api/public-voices",
  "/api/demo-voice",
  "/api/v1/(.*)",
  "/api/referral/check",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
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
