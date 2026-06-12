"use client";

import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MonthlyUsage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type SettingsWinstonSectionProps = {
  usage: MonthlyUsage;
};

export function SettingsWinstonSection({ usage }: SettingsWinstonSectionProps) {
  const {
    chatTokens,
    digestTokens,
    total,
    limit,
    percentage,
    resetDate,
  } = usage;

  const atLimit = percentage >= 100;
  const resetFormatted = new Date(resetDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section id="winston">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Winston
      </h2>
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-wisk-teal" aria-hidden />
            Winston Usage
          </CardTitle>
          <CardDescription>
            Your AI usage for the current calendar month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p
              className={cn(
                "mb-2 text-sm",
                atLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {total.toLocaleString()} / {limit.toLocaleString()} tokens this
              month ({percentage}%)
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  atLimit
                    ? "bg-destructive"
                    : "bg-gradient-to-r from-wisk-purple to-wisk-teal"
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">Chat:</span>{" "}
              {chatTokens.toLocaleString()} tokens
            </p>
            <p>
              <span className="text-foreground">Weekly Digest:</span>{" "}
              {digestTokens.toLocaleString()} tokens
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Resets on {resetFormatted}
          </p>

          {atLimit ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              You&apos;ve reached your monthly limit. Chat is paused until your
              allowance resets.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
