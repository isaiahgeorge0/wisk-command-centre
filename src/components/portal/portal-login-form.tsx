"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-center text-sm font-bold tracking-[0.2em] text-amber-500 uppercase">
        WISK Tenant Portal
      </p>
      <h1 className="mt-4 text-center text-2xl font-semibold text-foreground">
        Sign in
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Access your tenancy details and maintenance requests.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-xl border border-border/60 bg-card/50 p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="portal-email">Email</Label>
          <Input
            id="portal-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portal-password">Password</Label>
          <Input
            id="portal-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Contact your landlord if you have trouble signing in.
      </p>
    </div>
  );
}
