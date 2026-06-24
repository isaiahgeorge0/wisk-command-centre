"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PortalSetupFormProps = {
  token: string;
  email: string;
  tenantName: string;
  propertyAddress: string;
};

export function PortalSetupForm({
  token,
  email,
  tenantName,
  propertyAddress,
}: PortalSetupFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      const response = await fetch("/api/portal/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        email?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not complete setup.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email ?? email,
        password,
      });

      if (signInError) {
        setError("Account created. Please sign in.");
        router.push("/portal/login");
        return;
      }

      router.push("/portal");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
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
          Welcome
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--portal-muted)]">
          Hi {tenantName} — set up your account for{" "}
          <span className="font-medium text-[var(--portal-text)]">
            {propertyAddress}
          </span>
          .
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-6 shadow-[var(--portal-shadow)]"
      >
        <div className="space-y-2">
          <Label htmlFor="setup-email" className="text-[var(--portal-text)]">
            Email
          </Label>
          <Input
            id="setup-email"
            type="email"
            value={email}
            readOnly
            className="min-h-12 rounded-xl border-[var(--portal-border)] bg-[var(--portal-bg)]/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-password" className="text-[var(--portal-text)]">
            Password
          </Label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              "min-h-12 rounded-xl border-[var(--portal-border)] bg-[var(--portal-bg)]",
              error && "border-[var(--portal-error)]"
            )}
          />
          <p className="text-xs text-[var(--portal-muted)]">
            At least 8 characters
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-confirm" className="text-[var(--portal-text)]">
            Confirm password
          </Label>
          <Input
            id="setup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Setting up…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-[var(--portal-muted)]">
        Powered by WISK
      </p>
    </div>
  );
}
