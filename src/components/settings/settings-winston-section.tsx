"use client";

import { Building2, Mail, MessageSquare, Newspaper, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

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
  usage: MonthlyUsage & {
    emailDraftTokens?: number;
    propertyInsightsTokens?: number;
  };
};

type FeatureRowProps = {
  icon: ReactNode;
  label: string;
  tokens: number;
  total: number;
  emptyLabel?: string;
};

function FeatureRow({ icon, label, tokens, total, emptyLabel }: FeatureRowProps) {
  const proportion = total > 0 ? Math.round((tokens / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {tokens === 0 && emptyLabel
            ? emptyLabel
            : `${tokens.toLocaleString()} tokens`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full rounded-full bg-muted-foreground/40 transition-all duration-500"
          style={{ width: `${proportion}%` }}
        />
      </div>
    </div>
  );
}

export function SettingsWinstonSection({ usage }: SettingsWinstonSectionProps) {
  const {
    chatTokens,
    digestTokens,
    emailDraftTokens = 0,
    propertyInsightsTokens = 0,
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

          <div className="space-y-4">
            <FeatureRow
              icon={<Newspaper className="size-4" aria-hidden />}
              label="AI Digest"
              tokens={digestTokens}
              total={total}
            />
            <FeatureRow
              icon={<MessageSquare className="size-4" aria-hidden />}
              label="WISK Chat"
              tokens={chatTokens}
              total={total}
            />
            <FeatureRow
              icon={<Mail className="size-4" aria-hidden />}
              label="Email Drafts"
              tokens={emailDraftTokens}
              total={total}
              emptyLabel="0 tokens"
            />
            <FeatureRow
              icon={<Building2 className="size-4" aria-hidden />}
              label="Property Insights"
              tokens={propertyInsightsTokens}
              total={total}
              emptyLabel="0 tokens"
            />
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
