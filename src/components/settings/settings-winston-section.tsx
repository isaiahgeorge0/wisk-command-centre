"use client";

import {
  Building2,
  Mail,
  MessageSquare,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { updateWinstonFeatureToggle } from "@/app/(dashboard)/settings/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MonthlyUsage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type SettingsWinstonSectionProps = {
  usage: MonthlyUsage;
  emailPicksEnabled: boolean;
};

type FeatureRowProps = {
  icon: ReactNode;
  label: string;
  tokens: number;
  total: number;
  emptyLabel?: string;
};

type AutoFeatureRowProps = {
  icon: ReactNode;
  label: string;
  tokens: number;
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

function AutoFeatureRow({ icon, label, tokens, emptyLabel }: AutoFeatureRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="shrink-0 text-sm text-muted-foreground">
        {tokens === 0 && emptyLabel
          ? emptyLabel
          : `${tokens.toLocaleString()} tokens`}
      </span>
    </div>
  );
}

export function SettingsWinstonSection({
  usage,
  emailPicksEnabled: initialEmailPicksEnabled,
}: SettingsWinstonSectionProps) {
  const [emailPicksEnabled, setEmailPicksEnabled] = useState(
    initialEmailPicksEnabled
  );
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    chatTokens,
    digestTokens,
    emailDraftTokens,
    emailPicksDraftTokens,
    propertyInsightsTokens,
    userInitiatedTokens,
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

  const handleEmailPicksToggle = (enabled: boolean) => {
    setEmailPicksEnabled(enabled);
    setToggleError(null);

    startTransition(async () => {
      const result = await updateWinstonFeatureToggle("email_picks", enabled);
      if (!result.success) {
        setEmailPicksEnabled(!enabled);
        setToggleError(result.error);
      }
    });
  };

  return (
    <section id="winston">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Winston
      </h2>

      <div className="space-y-4">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Winston features</CardTitle>
            <CardDescription>
              Control which auto-generated Winston features are active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label
                  htmlFor="winston-email-picks-toggle"
                  className="text-sm font-medium text-foreground"
                >
                  Morning & afternoon email picks
                </Label>
                <p className="text-sm text-muted-foreground">
                  Winston drafts responses to your top 3 priority emails twice a
                  day. Uses tokens from your monthly allowance.
                </p>
                {!emailPicksEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Winston will not generate email picks. You can still request
                    drafts manually from individual emails.
                  </p>
                ) : null}
              </div>
              <Switch
                id="winston-email-picks-toggle"
                checked={emailPicksEnabled}
                onCheckedChange={handleEmailPicksToggle}
                disabled={isPending}
                aria-label="Toggle morning and afternoon email picks"
              />
            </div>
            {toggleError ? (
              <p className="text-sm text-destructive">{toggleError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-wisk-turquoise" aria-hidden />
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
                {userInitiatedTokens.toLocaleString()} /{" "}
                {limit.toLocaleString()} tokens this month ({percentage}%)
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    atLimit
                      ? "bg-destructive"
                      : "bg-wisk-turquoise"
                  )}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
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
            </div>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Auto-generated (unlimited)
              </p>
              <AutoFeatureRow
                icon={<Newspaper className="size-4" aria-hidden />}
                label="AI Digest"
                tokens={digestTokens}
              />
              <AutoFeatureRow
                icon={<Mail className="size-4" aria-hidden />}
                label="Email Picks"
                tokens={emailPicksDraftTokens}
                emptyLabel="0 tokens"
              />
              <AutoFeatureRow
                icon={<Building2 className="size-4" aria-hidden />}
                label="Property Insights"
                tokens={propertyInsightsTokens}
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
      </div>
    </section>
  );
}
