"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AccessRequestDialog } from "@/components/auth/access-request-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  const redirectTo = searchParams.get("redirectTo") || "/";
  const authError = searchParams.get("error");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo.startsWith("/") ? redirectTo : "/");
    router.refresh();
  };

  const handleForgotPassword = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Enter your email above, then click Forgot password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Check your email for a password reset link.");
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <Link
        href="/sign-in"
        className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl"
      >
        WISK
      </Link>
      <p className="mt-4 text-sm text-muted-foreground sm:text-base">
        Your business. Centralised.
      </p>

      <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => {
            setShowForm(true);
            setError(null);
          }}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setAccessOpen(true)}
        >
          Request access
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSignIn}
          className="mt-8 w-full rounded-xl border border-border/60 bg-card/50 p-6 text-left"
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {authError === "auth_callback" ? (
            <p className="mt-3 text-sm text-destructive">
              Sign-in link expired or invalid. Please try again.
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-wisk-teal">{message}</p>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </Button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="mt-3 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot password?
          </button>
        </form>
      ) : null}

      <AccessRequestDialog open={accessOpen} onOpenChange={setAccessOpen} />
    </div>
  );
}
