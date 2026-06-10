import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  // Password reset is the one flow that must stay server-side —
  // it uses a code that needs to be exchanged before the redirect.
  const isPasswordReset = next.startsWith("/auth/reset-password");

  if (code && isPasswordReset) {
    const cookieStore = await cookies();

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
      console.error("[auth/callback] password reset exchange error:", error);
      return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback`);
    }

    const response = NextResponse.redirect(`${baseUrl}${next}`);

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

  // All other flows (invite, magic link, etc.) — hand off to the
  // client-side handler so the browser manages its own cookies.
  const clientUrl = new URL(`${baseUrl}/auth/callback-client`);
  searchParams.forEach((value, key) => {
    clientUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(clientUrl.toString());
}
