import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isTenantPortalUser } from "@/lib/portal/is-tenant-user";

const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/welcome",
  "/forgot-password",
  "/auth/callback",
  "/auth/callback-client",
  "/auth/reset-password",
  "/api/auth/personalisation-status",
  "/api/auth/update-password",
  "/api/ai-digest/generate",
  "/api/ai-digest/generate-for-user",
  "/api/away-sync/run",
  "/api/morning-briefing/generate",
  "/api/morning-briefing/send",
  "/api/properties/check-certificate-alerts",
  "/api/properties/generate-insights",
  "/api/winston/chat",
  "/api/stripe/webhook",
  "/portal/login",
  "/portal/setup",
  "/api/portal/setup",
  "/api/portal/winston-triage",
  "/monitoring",
  "/contractor",
];

const PORTAL_PUBLIC_PATHS = ["/portal/login", "/portal/setup"];

// Paths accessible to authenticated users before personalisation is complete.
const SETUP_PATHS = ["/welcome"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isSetupPath(pathname: string): boolean {
  return SETUP_PATHS.some((path) => pathname === path);
}

function isPortalPath(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function isPortalPublicPath(pathname: string): boolean {
  return PORTAL_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function withPathnameHeader(response: NextResponse, pathname: string) {
  response.headers.set("x-pathname", pathname);
  return response;
}

/**
 * Returns true only when a user_preferences row exists and
 * personalisation_completed is explicitly true.
 * Missing row, false flag, query error, or thrown exception → false
 * (treat as not personalised → redirect to /welcome).
 */
async function isPersonalisationCompleted(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_preferences")
      .select("personalisation_completed")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "[middleware] personalisation_completed query failed:",
        error.message,
        "userId:",
        userId
      );
      return false;
    }

    if (data === null) {
      console.log(
        "[middleware] no user_preferences row — not personalised, userId:",
        userId
      );
      return false;
    }

    return data.personalisation_completed === true;
  } catch (err) {
    console.error("[middleware] personalisation_completed check error:", err);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const portalPath = isPortalPath(pathname);
  const portalPublic = isPortalPublicPath(pathname);

  if (user) {
    const isPortalTenant = await isTenantPortalUser(user.id);

    if (isPortalTenant) {
      if (pathname === "/portal/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return withPathnameHeader(NextResponse.redirect(url), pathname);
      }

      if (
        !portalPath &&
        !isPublicPath(pathname) &&
        !pathname.startsWith("/api/portal/")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return withPathnameHeader(NextResponse.redirect(url), pathname);
      }

      return withPathnameHeader(supabaseResponse, pathname);
    } else if (portalPath && !portalPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }

    const personalisationCompleted = await isPersonalisationCompleted(user.id);

    if (pathname === "/sign-in") {
      const url = request.nextUrl.clone();
      url.pathname = personalisationCompleted ? "/" : "/welcome";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }

    // Setup paths are only accessible pre-personalisation.
    // Once done, redirect to dashboard.
    if (isSetupPath(pathname) && personalisationCompleted) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }

    // Gate all other app routes behind personalisation.
    if (
      !isSetupPath(pathname) &&
      !isPublicPath(pathname) &&
      !personalisationCompleted
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }
  }

  if (!user && !isPublicPath(pathname)) {
    if (portalPath && !portalPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    if (pathname !== "/") {
      url.searchParams.set("redirectTo", pathname);
    }
    return withPathnameHeader(NextResponse.redirect(url), pathname);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();
    if (!adminEmail || userEmail !== adminEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }
  }

  return withPathnameHeader(supabaseResponse, pathname);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
