import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPersonalisationCompleted } from "@/lib/auth/middleware-preferences";

const PUBLIC_PATHS = ["/sign-in", "/auth/callback", "/auth/reset-password"];

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
    const personalisationCompleted = await getPersonalisationCompleted(user.id);

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
