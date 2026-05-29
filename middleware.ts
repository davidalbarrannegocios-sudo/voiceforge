import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/docs(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/r/(.*)",
  "/api/webhooks/stripe",
  "/api/public-voices",
  "/api/demo-voice",
  "/api/v1/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to /sign-in WITHOUT redirect_url so Clerk always
      // uses NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard after login
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
