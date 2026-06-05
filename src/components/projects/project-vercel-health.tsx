"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { fetchVercelProjectHealthAction } from "@/app/(dashboard)/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import type { VercelDeploymentHealth } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

type ProjectVercelHealthProps = {
  projectId: string;
  enabled: boolean;
};

const STATE_LABELS: Record<VercelDeploymentHealth["state"], string> = {
  ready: "Success",
  error: "Failed",
  building: "Building",
  queued: "Queued",
  unknown: "Unknown",
};

const STATE_CLASS: Record<VercelDeploymentHealth["state"], string> = {
  ready: "bg-emerald-500/15 text-emerald-500",
  error: "bg-red-500/15 text-red-400",
  building: "bg-amber-500/15 text-amber-500",
  queued: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

export function ProjectVercelHealth({
  projectId,
  enabled,
}: ProjectVercelHealthProps) {
  const [health, setHealth] = useState<VercelDeploymentHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    if (!enabled) return;

    startTransition(async () => {
      const result = await fetchVercelProjectHealthAction(projectId);
      if (!result.success) {
        setError(result.error);
        setHealth(null);
        return;
      }
      setError(null);
      setHealth(result.data ?? null);
    });
  }, [enabled, projectId]);

  useEffect(() => {
    if (!enabled) return;

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [enabled, load]);

  if (!enabled) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Site health
          </p>
          {health ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATE_CLASS[health.state],
                  health.state === "building" && "animate-pulse"
                )}
              >
                {STATE_LABELS[health.state]}
              </span>
              {health.createdAt ? (
                <span className="text-xs text-muted-foreground">
                  Last deployed{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(health.createdAt))}
                </span>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          ) : null}
          {!health && !error && isPending ? (
            <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh site health"
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation();
            load();
          }}
        >
          <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}
