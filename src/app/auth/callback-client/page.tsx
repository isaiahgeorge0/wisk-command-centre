"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void handleCallback();

    async function handleCallback() {
      const supabase = createClient();

      // Collect params from both search string and hash fragment.
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.slice(1); // strip leading #
      const hashParams = new URLSearchParams(hash);

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      console.log("[callback-client] params:", {
        code: !!code,
        tokenHash: !!tokenHash,
        type,
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
      });

      let sessionError: Error | null = null;

      if (accessToken && refreshToken) {
        // Implicit flow — token delivered in URL hash.
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) sessionError = error;
      } else if (tokenHash && type) {
        // PKCE OTP flow (newer Supabase invite format).
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (error) sessionError = error;
      } else if (code) {
        // PKCE code flow.
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) sessionError = error;
      } else {
        sessionError = new Error("No usable auth params found in callback URL");
      }

      if (sessionError) {
        console.error("[callback-client] session error:", sessionError);
        router.replace("/sign-in?error=auth_callback");
        return;
      }

      // Confirm session was established.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("[callback-client] no user after session establishment");
        router.replace("/sign-in?error=auth_callback");
        return;
      }

      // If the flow was a password reset, send straight to the reset form.
      // Check both the next query param and the type in the hash fragment
      // (implicit flow puts type=recovery in the hash).
      const nextParam = searchParams.get("next") ?? "";
      const hashType = hashParams.get("type");
      if (
        nextParam.startsWith("/auth/reset-password") ||
        hashType === "recovery"
      ) {
        router.replace("/auth/reset-password");
        return;
      }

      // Check personalisation status via API route (uses session cookie).
      try {
        const res = await fetch("/api/auth/personalisation-status");
        const json = (await res.json()) as { personalised: boolean };
        router.replace(json.personalised ? "/" : "/set-password");
      } catch {
        // Fallback: send to set-password — safe for new users.
        router.replace("/set-password");
      }
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.55 0.14 300 / 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.65 0.1 180 / 0.06), transparent 50%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <span className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-2xl font-bold tracking-[0.28em] text-transparent uppercase">
          WISK
        </span>
        <div
          className="size-6 animate-spin rounded-full border-2 border-border border-t-wisk-teal"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">
          Setting up your account&hellip;
        </p>
      </div>
    </div>
  );
}
