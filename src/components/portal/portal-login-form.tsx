"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function PortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    router.push("/portal");
    router.refresh();
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]">
        <PortalThemeToggle />
      </div>

      <div className="text-center">
        <p className="text-sm font-bold tracking-[0.18em] text-[var(--portal-amber)]">
          WISK
        </p>
        <p className="mt-1 text-sm text-[var(--portal-muted)]">Tenant Portal</p>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--portal-text)]">
          Sign in
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-6 shadow-[var(--portal-shadow)]"
      >
        <div className="space-y-2">
          <Label htmlFor="portal-email" className="text-[var(--portal-text)]">
            Email
          </Label>
          <Input
            id="portal-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              "min-h-12 rounded-xl border-[var(--portal-border)] bg-[var(--portal-bg)]",
              error && "border-[var(--portal-error)]"
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portal-password" className="text-[var(--portal-text)]">
            Password
          </Label>
          <Input
            id="portal-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              "min-h-12 rounded-xl border-[var(--portal-border)] bg-[var(--portal-bg)]",
              error && "border-[var(--portal-error)]"
            )}
          />
        </div>

        {error ? (
          <p className="text-sm text-[var(--portal-error)]">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="min-h-14 w-full rounded-xl bg-[var(--portal-amber)] text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-[var(--portal-muted)]">
        Powered by WISK
      </p>
    </div>
  );
}
