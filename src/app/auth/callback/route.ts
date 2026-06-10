import { NextResponse } from "next/server";

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
      return NextResponse.redirect(`${baseUrl}${redirectUrl}`);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_callback`);
}
