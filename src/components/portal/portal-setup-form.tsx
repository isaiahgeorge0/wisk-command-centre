"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-center text-sm font-bold tracking-[0.2em] text-amber-500 uppercase">
        WISK Tenant Portal
      </p>
      <h1 className="mt-4 text-center text-2xl font-semibold text-foreground">
        Set up your account
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Hi {tenantName} — create a password for your tenancy at {propertyAddress}.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-xl border border-border/60 bg-card/50 p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="setup-email">Email</Label>
          <Input
            id="setup-email"
            type="email"
            value={email}
            readOnly
            className="min-h-11 bg-muted/40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-password">Password</Label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-confirm">Confirm password</Label>
          <Input
            id="setup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="min-h-11"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          className="min-h-11 w-full bg-amber-500 text-white hover:bg-amber-500/90"
          disabled={loading}
        >
          {loading ? "Setting up…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
