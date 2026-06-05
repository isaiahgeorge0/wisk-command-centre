"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { connectVercel } from "@/app/(dashboard)/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VercelProjectSummary } from "@/lib/integrations/types";

type VercelConnectFormProps = {
  onConnected: (projects: VercelProjectSummary[]) => void;
};

export function VercelConnectForm({ onConnected }: VercelConnectFormProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await connectVercel(token);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setToken("");
      onConnected(result.data?.projects ?? []);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="vercel-token">Vercel API token</Label>
        <Input
          id="vercel-token"
          type="password"
          autoComplete="off"
          placeholder="Paste token from vercel.com/account/tokens"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={isPending}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={isPending || !token.trim()}>
        {isPending ? "Connecting…" : "Connect Vercel"}
      </Button>
    </form>
  );
}
