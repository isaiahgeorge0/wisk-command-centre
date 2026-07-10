import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type === "recovery") {
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

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (error) {
      console.error("[auth/callback] password reset verifyOtp error:", error);
      return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback`);
    }

    const response = NextResponse.redirect(`${baseUrl}/auth/reset-password`);

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

  if (tokenHash && type === "signup") {
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

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup",
    });

    if (error) {
      console.error("[auth/callback] signup verification error:", error);
      return NextResponse.redirect(
        `${baseUrl}/sign-in?error=confirmation_failed`
      );
    }

    // Redirect to welcome/onboarding after successful confirmation
    const response = NextResponse.redirect(`${baseUrl}/welcome`);

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

  if (tokenHash && type === "email_change") {
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

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email_change",
    });

    if (error) {
      console.error("[auth/callback] email change error:", error);
      return NextResponse.redirect(
        `${baseUrl}/sign-in?error=email_change_failed`
      );
    }

    return NextResponse.redirect(`${baseUrl}/settings`);
  }

  // Recovery flow where Supabase's verify endpoint already exchanged the
  // token before landing here — the session is established but there's no
  // code or token_hash in the URL. Check for an active session and, if
  // present, forward the cookies and land on the reset-password page.
  if (isPasswordReset) {
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const response = NextResponse.redirect(`${baseUrl}/auth/reset-password`);

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

    // No session established — fall through to client-side handler which
    // will attempt its own token exchange.
  }

  // All other flows (invite, magic link, etc.) — hand off to the
  // client-side handler so the browser manages its own cookies.
  const clientUrl = new URL(`${baseUrl}/auth/callback-client`);
  searchParams.forEach((value, key) => {
    clientUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(clientUrl.toString());
}
