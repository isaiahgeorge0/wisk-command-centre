"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition } from "react";
import { useTheme } from "next-themes";

import { updateAccountSetup } from "@/app/set-password/actions";
import { AcronymReveal } from "@/components/set-password/acronym-reveal";
import { UsernameField } from "@/components/username/username-field";
import { ThemePreferenceCards } from "@/components/welcome/theme-preference-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { createClient } from "@/lib/supabase/client";
import type { ThemePreference } from "@/lib/preferences/types";

type SetPasswordClientProps = {
  email: string;
  defaultName: string;
};

export function SetPasswordClient({
  email,
  defaultName,
}: SetPasswordClientProps) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const { setTheme } = useTheme();

  const [animationDone, setAnimationDone] = useState(reduced);
  const [displayName, setDisplayName] = useState(defaultName);
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("dark");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, toggleShowPassword] = useReducer((s) => !s, false);
  const [showConfirm, toggleShowConfirm] = useReducer((s) => !s, false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleThemeChange(theme: ThemePreference) {
    setThemePreference(theme);
    setTheme(theme);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!username.trim()) {
      setError("Please choose a username.");
      return;
    }
    if (!usernameAvailable) {
      setError("Please choose an available username.");
      return;
    }
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
      const { error: pwError } = await supabase.auth.updateUser({ password });

      if (pwError) {
        setError("Could not set your password. Please try again.");
        console.error("set-password updateUser:", pwError);
        return;
      }

      const result = await updateAccountSetup({ displayName, username, themePreference });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  const formMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: animationDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
        transition: {
          duration: MOTION_DURATION.normal,
          ease: MOTION_EASE.smooth,
        },
      };

  return (
    <div className="relative min-h-screen bg-background">
      {!animationDone ? (
        <AcronymReveal onComplete={() => setAnimationDone(true)} />
      ) : (
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
                  Complete your account
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  You&apos;re in. Set up your details to get started.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-border/60 bg-card/50 p-6 space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="sp-email">Email</Label>
                  <Input
                    id="sp-email"
                    type="email"
                    value={email}
                    readOnly
                    className="cursor-default opacity-60"
                    tabIndex={-1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sp-name">Display name</Label>
                  <Input
                    id="sp-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isPending}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>

                <UsernameField
                  id="sp-username"
                  value={username}
                  onChange={setUsername}
                  onAvailabilityChange={setUsernameAvailable}
                  disabled={isPending}
                />

                <div className="space-y-2">
                  <Label>Theme preference</Label>
                  <ThemePreferenceCards
                    value={themePreference}
                    onChange={handleThemeChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can change this any time in Settings.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sp-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="sp-password"
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
                  <Label htmlFor="sp-confirm">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="sp-confirm"
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

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    disabled={isPending}
                    className="mt-0.5 size-4 shrink-0 accent-wisk-teal cursor-pointer"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    I agree to the{" "}
                    <a
                      href="https://wiskapp.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:text-wisk-teal transition-colors"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="https://wiskapp.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:text-wisk-teal transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isPending || !agreedToTerms || !usernameAvailable}
                  className="w-full rounded-lg bg-gradient-to-r from-wisk-purple to-wisk-teal px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Setting up…" : "Get started →"}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
