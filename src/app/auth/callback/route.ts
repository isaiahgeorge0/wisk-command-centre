import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback`);
  }

  const cookieStore = await cookies();

  // Build the redirect response first so we can attach cookies to it
  const redirectPath = next.startsWith("/") && next !== "/" ? next : null;

  // We need to determine the destination before creating the response
  // Use a temporary supabase client to exchange the code
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${baseUrl}/sign-in?error=auth_callback`
    );
  }

  // Determine redirect destination
  let destination: string;

  if (redirectPath) {
    // Explicit next param (e.g. password reset flow) — honour it directly
    destination = `${baseUrl}${redirectPath}`;
  } else {
    // Default flow — check personalisation to decide where to send user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient();
      const { data: prefs } = await admin
        .from("user_preferences")
        .select("personalisation_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      const isPersonalised = prefs?.personalisation_completed === true;
      destination = isPersonalised
        ? `${baseUrl}/`
        : `${baseUrl}/set-password`;
    } else {
      destination = `${baseUrl}/sign-in?error=auth_callback`;
    }
  }

  // Build redirect response and copy all cookies onto it
  const response = NextResponse.redirect(destination);

  // Forward all cookies (including the new session cookies) onto the
  // redirect response so the next request sees an authenticated user
  cookieStore.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  });

  return response;
}
