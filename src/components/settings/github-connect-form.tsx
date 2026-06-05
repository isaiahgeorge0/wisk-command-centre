"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { connectGitHub } from "@/app/(dashboard)/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SafeIntegration } from "@/lib/integrations/types";

type GitHubConnectFormProps = {
  integration: SafeIntegration | undefined;
};

export function GitHubConnectForm({ integration }: GitHubConnectFormProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const login = integration?.metadata?.login as string | undefined;
  const avatarUrl = integration?.metadata?.avatar_url as string | undefined;

  useEffect(() => {
    setToken("");
    setError(null);
  }, [integration?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await connectGitHub(token);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setToken("");
      router.refresh();
    });
  };

  if (integration && login) {
    return (
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-8 rounded-full ring-1 ring-border/60"
          />
        ) : null}
        <p className="text-sm text-foreground">Connected as @{login}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="github-token">GitHub personal access token</Label>
        <Input
          id="github-token"
          type="password"
          autoComplete="off"
          placeholder="Paste a token with repo read access"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={isPending}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={isPending || !token.trim()}>
        {isPending ? "Connecting…" : "Connect GitHub"}
      </Button>
    </form>
  );
}
