import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_PATHS = [
  "/sign-in",
  "/set-password",
  "/forgot-password",
  "/auth/callback",
  "/auth/callback-client",
  "/auth/reset-password",
  "/api/auth/personalisation-status",
];

// Paths accessible to authenticated users before personalisation is complete.
const SETUP_PATHS = ["/welcome", "/set-password"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isSetupPath(pathname: string): boolean {
  return SETUP_PATHS.some((path) => pathname === path);
}

function withPathnameHeader(response: NextResponse, pathname: string) {
  response.headers.set("x-pathname", pathname);
  return response;
}

/**
 * Returns true only when a user_preferences row exists and
 * personalisation_completed is explicitly true.
 * Missing row, false flag, query error, or thrown exception → false
 * (treat as not personalised → redirect to /set-password).
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

  if (user) {
    const personalisationCompleted = await isPersonalisationCompleted(user.id);

    if (pathname === "/sign-in") {
      const url = request.nextUrl.clone();
      url.pathname = personalisationCompleted ? "/" : "/set-password";
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
      url.pathname = "/set-password";
      return withPathnameHeader(NextResponse.redirect(url), pathname);
    }
  }

  if (!user && !isPublicPath(pathname)) {
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
