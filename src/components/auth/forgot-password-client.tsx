"use client";

import { createBrowserClient } from "@supabase/ssr";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  SignInEntrance,
  SignInEntranceItem,
} from "@/components/auth/sign-in-entrance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const resetClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: "implicit" } }
      );
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

      const { error: resetError } =
        await resetClient.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/auth/callback-client?next=/auth/reset-password`,
        });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSubmittedEmail(email.trim());
    });
  }

  if (submittedEmail) {
    return (
      <SignInEntrance>
        <SignInEntranceItem>
          <Link
            href="/sign-in"
            className="bg-wisk-lime bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl"
          >
            WISK
          </Link>
        </SignInEntranceItem>

        <SignInEntranceItem className="mt-8 w-full">
          <div className="w-full rounded-xl border border-border/60 bg-card/50 p-6 text-center">
            <CheckCircle2
              className="mx-auto size-10 text-wisk-lime"
              aria-hidden
            />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Check your inbox
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-foreground">{submittedEmail}</span>
              . Click the link in the email to choose a new password.
            </p>

            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-left">
              <AlertCircle
                className="mt-0.5 size-4 shrink-0 text-amber-400"
                aria-hidden
              />
              <p className="text-sm text-amber-200/80">
                For security reasons, please open the reset link on the same
                device and browser you&apos;re using now.
              </p>
            </div>

            <Link
              href="/sign-in"
              className="mt-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to sign in
            </Link>
          </div>
        </SignInEntranceItem>
      </SignInEntrance>
    );
  }

  return (
    <SignInEntrance>
      <SignInEntranceItem>
        <Link
          href="/sign-in"
          className="bg-wisk-lime bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl"
        >
          WISK
        </Link>
      </SignInEntranceItem>

      <SignInEntranceItem className="mt-4">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </SignInEntranceItem>

      <SignInEntranceItem className="mt-8 w-full">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-xl border border-border/60 bg-card/50 p-6 text-left"
        >
          <div className="grid gap-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 w-full rounded-lg bg-wisk-lime px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </button>

          <Link
            href="/sign-in"
            className="mt-4 block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to sign in
          </Link>
        </form>
      </SignInEntranceItem>
    </SignInEntrance>
  );
}
