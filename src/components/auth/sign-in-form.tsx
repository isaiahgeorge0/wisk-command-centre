"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SignInBridgeOverlay } from "@/components/auth/sign-in-bridge-overlay";
import { MOTION_DURATION } from "@/lib/motion/config";
import { createClient } from "@/lib/supabase/client";
import { lookupEmailByUsername } from "@/app/sign-in/actions";
import { cn } from "@/lib/utils";

const LIME_FILTER =
  "brightness(0) saturate(100%) invert(93%) sepia(55%) saturate(900%) hue-rotate(33deg) brightness(105%)";

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 transition-colors focus:border-wisk-lime/50 focus:outline-none focus:ring-1 focus:ring-wisk-lime/30 disabled:opacity-60";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduced = useReducedMotion() ?? false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

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

  const resolveEmail = async (): Promise<string | null> => {
    const input = email.trim();
    const isUsername = input.startsWith("@") || !input.includes("@");
    if (!isUsername) return input;

    const usernameRaw = input.startsWith("@") ? input.slice(1) : input;
    const lookup = await lookupEmailByUsername(usernameRaw);
    if (!lookup.success) {
      setError(lookup.error);
      return null;
    }
    return lookup.email;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const resolvedEmail = await resolveEmail();
    if (!resolvedEmail) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
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

  const handleMagicLink = async () => {
    setError(null);
    setMagicSent(false);

    if (!email.trim()) {
      setError("Enter your email or username to get a magic link.");
      document.getElementById("signin-email")?.focus();
      return;
    }

    setMagicLoading(true);

    const resolvedEmail = await resolveEmail();
    if (!resolvedEmail) {
      setMagicLoading(false);
      return;
    }

    const supabase = createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: resolvedEmail,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });

    setMagicLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setMagicSent(true);
  };

  const handleBridgeComplete = () => {
    setShowBridge(false);
    navigateAfterSignIn();
  };

  const busy = loading || isTransitioning || magicLoading;

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
        className="relative z-10 mx-auto w-full max-w-sm"
        animate={
          isTransitioning && !reduced
            ? { opacity: 0, scale: 0.97 }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: MOTION_DURATION.fast }}
      >
        <motion.img
          src="/wisk-logo-white.png"
          alt="WISK"
          className="mx-auto mb-8 h-8 w-auto"
          style={{ filter: LIME_FILTER }}
          initial={reduced ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        />

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-center text-2xl font-bold text-white">
            Welcome back.
          </h1>
          <p className="mt-1 mb-8 text-center text-sm text-white/40">
            Sign in to your command centre.
          </p>

          <div className="rounded-2xl border border-white/8 bg-[#1a2235] px-8 py-8">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="signin-email"
                  className="text-xs uppercase tracking-wide text-white/50"
                >
                  Email
                </label>
                <input
                  id="signin-email"
                  type="text"
                  autoComplete="username email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  required
                  className={FIELD_CLASS}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signin-password"
                    className="text-xs uppercase tracking-wide text-white/50"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-wisk-lime hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    required
                    className={cn(FIELD_CLASS, "pr-12")}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {authError === "auth_callback" ? (
                <p className="text-sm text-red-400">
                  Sign-in link expired or invalid. Please try again.
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              {magicSent ? (
                <p className="text-sm text-wisk-lime">
                  Magic link sent — check your inbox.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c3ff32] py-3.5 text-sm font-bold text-[#141b27] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/8" />
              <span className="text-xs text-white/30">or</span>
              <span className="h-px flex-1 bg-white/8" />
            </div>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {magicLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending link…
                </>
              ) : (
                "Sign in with magic link"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-white/40">
            New to WISK?{" "}
            <Link href="/sign-up" className="text-wisk-lime hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </>
  );
}
