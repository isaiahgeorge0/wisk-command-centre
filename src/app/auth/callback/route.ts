import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
      const redirectUrl = next.startsWith("/") ? next : "/";

      // For default (non-password-reset) flows, check whether this user has
      // completed personalisation. New invite users → /set-password.
      if (redirectUrl === "/") {
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

          if (!prefs || prefs.personalisation_completed !== true) {
            return NextResponse.redirect(`${baseUrl}/set-password`);
          }
        }
      }

      return NextResponse.redirect(`${baseUrl}${redirectUrl}`);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback`);
}
