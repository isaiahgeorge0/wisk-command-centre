"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";

import { completePersonalisation } from "@/app/(dashboard)/welcome/actions";
import { ThemePreferenceCards } from "@/components/welcome/theme-preference-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import type { ThemePreference } from "@/lib/preferences/types";

type WelcomePageClientProps = {
  defaultName: string;
  defaultTheme: ThemePreference;
};

const fadeUp = (delay: number, reduced: boolean) =>
  reduced
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: MOTION_DURATION.normal,
          ease: MOTION_EASE.smooth,
          delay,
        },
      };

export function WelcomePageClient({
  defaultName,
  defaultTheme,
}: WelcomePageClientProps) {
  const reduced = useReducedMotion() ?? false;
  const { setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(defaultName);
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(defaultTheme);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTheme(defaultTheme);
  }, [defaultTheme, setTheme]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await completePersonalisation({
        displayName,
        themePreference,
      });

      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
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
        <motion.div
          className="flex flex-col items-center text-center"
          {...fadeUp(0, reduced)}
        >
          <span className="bg-wisk-lime bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl">
            WISK
          </span>
        </motion.div>

        <motion.h1
          className="mt-8 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          {...fadeUp(0.1, reduced)}
        >
          Let&apos;s set things up
        </motion.h1>

        <motion.p
          className="mt-2 text-center text-sm text-muted-foreground sm:text-base"
          {...fadeUp(0.2, reduced)}
        >
          Personalise your experience before you dive in.
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
          {...fadeUp(0.3, reduced)}
        >
          <div className="space-y-2">
            <Label htmlFor="welcome-display-name">What should we call you?</Label>
            <Input
              id="welcome-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isPending}
              required
              autoComplete="name"
            />
          </div>

          <motion.div className="space-y-2" {...fadeUp(0.4, reduced)}>
            <Label>Theme preference</Label>
            <ThemePreferenceCards
              value={themePreference}
              onChange={setThemePreference}
            />
            <p className="text-xs text-muted-foreground">
              You can change this any time in Settings
            </p>
          </motion.div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <motion.div {...fadeUp(0.6, reduced)}>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving…" : "Let's go →"}
            </Button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}
