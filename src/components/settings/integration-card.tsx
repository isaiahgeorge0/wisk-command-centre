"use client";

import { Code2, Triangle } from "lucide-react";

import {
  INTEGRATION_PROVIDER_DESCRIPTIONS,
  INTEGRATION_PROVIDER_LABELS,
} from "@/lib/integrations/constants";
import type { IntegrationProvider, SafeIntegration } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<IntegrationProvider, typeof Triangle> = {
  vercel: Triangle,
  github: Code2,
};

type IntegrationCardProps = {
  provider: IntegrationProvider;
  integration: SafeIntegration | undefined;
  children: React.ReactNode;
};

export function IntegrationCard({
  provider,
  integration,
  children,
}: IntegrationCardProps) {
  const Icon = PROVIDER_ICONS[provider];
  const connected = Boolean(integration);

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            provider === "vercel" && "bg-foreground text-background",
            provider === "github" && "bg-muted text-foreground"
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">
              {INTEGRATION_PROVIDER_LABELS[provider]}
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                connected
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {INTEGRATION_PROVIDER_DESCRIPTIONS[provider]}
          </p>
          {connected && integration ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Connected{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date(integration.connected_at))}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
