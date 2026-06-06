"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  SignInEntrance,
  SignInEntranceItem,
} from "@/components/auth/sign-in-entrance";
import { SignInBridgeOverlay } from "@/components/auth/sign-in-bridge-overlay";
import { AccessRequestDialog } from "@/components/auth/access-request-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOTION_DURATION } from "@/lib/motion/config";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduced = useReducedMotion();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showBridge, setShowBridge] = useState(false);

  const authError = searchParams.get("error");

  const navigateAfterSignIn = () => {
    const redirectTo = searchParams.get("redirectTo");
    const destination =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/";
    router.push(destination);
    router.refresh();
  };

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

    if (reduced) {
      navigateAfterSignIn();
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setShowBridge(true);
    }, 200);
  };

  const handleBridgeComplete = () => {
    setShowBridge(false);
    navigateAfterSignIn();
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
    <>
      <AnimatePresence>
        {showBridge ? (
          <SignInBridgeOverlay
            key="sign-in-bridge"
            visible={showBridge}
            onComplete={handleBridgeComplete}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        animate={
          isTransitioning && !reduced
            ? { opacity: 0, scale: 0.97 }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: MOTION_DURATION.fast }}
      >
        <SignInEntrance>
          <SignInEntranceItem>
            <Link
              href="/sign-in"
              className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl"
            >
              WISK
            </Link>
          </SignInEntranceItem>
          <SignInEntranceItem className="mt-4">
            <p className="text-sm text-muted-foreground sm:text-base">
              Your business. Centralised.
            </p>
          </SignInEntranceItem>

          <SignInEntranceItem className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowForm(true);
                setError(null);
              }}
              disabled={isTransitioning}
            >
              Sign in
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAccessOpen(true)}
              disabled={isTransitioning}
            >
              Request access
            </Button>
          </SignInEntranceItem>

          {showForm ? (
            <SignInEntranceItem className="mt-8 w-full">
              <form
                onSubmit={handleSignIn}
                className="w-full rounded-xl border border-border/60 bg-card/50 p-6 text-left"
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
                      disabled={loading || isTransitioning}
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
                      disabled={loading || isTransitioning}
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

                <Button
                  type="submit"
                  className="mt-6 w-full"
                  disabled={loading || isTransitioning}
                >
                  {loading ? "Signing in…" : "Continue"}
                </Button>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || isTransitioning}
                  className="mt-3 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </button>
              </form>
            </SignInEntranceItem>
          ) : null}

          <AccessRequestDialog open={accessOpen} onOpenChange={setAccessOpen} />
        </SignInEntrance>
      </motion.div>
    </>
  );
}
