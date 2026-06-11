"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordClient() {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, toggleShowPassword] = useReducer((s) => !s, false);
  const [showConfirm, toggleShowConfirm] = useReducer((s) => !s, false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.log("[reset-password] component mounted, starting auth check");
    const supabase = createClient();
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 500; // ms between retries

    async function checkAuth() {
      attempts++;
      console.log(`[reset-password] attempt ${attempts}`);
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log(`[reset-password] attempt ${attempts} result:`, {
        hasUser: !!user,
        userId: user?.id?.slice(0, 8),
        error: error?.message,
      });

      if (user) {
        setCheckingAuth(false);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(checkAuth, delay);
        return;
      }

      // All retries exhausted — no session found
      router.replace("/sign-in");
    }

    void checkAuth();
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(
          updateError.message || "Could not update your password. Please try again."
        );
        console.error("reset-password updateUser:", updateError);
        return;
      }

      router.push("/?password_updated=true");
      router.refresh();
    });
  }

  const formMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: MOTION_DURATION.normal,
          ease: MOTION_EASE.smooth,
        },
      };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.55 0.14 300 / 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.65 0.1 180 / 0.06), transparent 50%)",
          }}
        />

        <div className="relative z-10 w-full max-w-md">
          <motion.div {...formMotion}>
            <div className="mb-8 flex flex-col items-center text-center">
              <span className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-2xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-3xl">
                WISK
              </span>
              <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Choose a new password
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Enter a new password for your WISK account.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-xl border border-border/60 bg-card/50 p-6"
            >
              <div className="space-y-2">
                <Label htmlFor="rp-password">New password</Label>
                <div className="relative">
                  <Input
                    id="rp-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={toggleShowPassword}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rp-confirm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="rp-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={toggleShowConfirm}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-gradient-to-r from-wisk-purple to-wisk-teal px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Updating…" : "Update password"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
