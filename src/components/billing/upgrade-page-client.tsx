"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BillingPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

const AI_WAITLIST_MAILTO =
  "mailto:hello@wiskapp.com?subject=WISK%20AI%20Waitlist";
const AI_PRO_WAITLIST_MAILTO =
  "mailto:hello@wiskapp.com?subject=WISK%20AI%20Pro%20Waitlist";

type UpgradePageClientProps = {
  plan: BillingPlan;
  planLabel: string;
  currentPeriodEnd: string | null;
};

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function UpgradePageClient({
  plan,
  planLabel,
  currentPeriodEnd,
}: UpgradePageClientProps) {
  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);

  return (
    <PageTransition>
      <div className="mb-10 max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <div
            className="flex size-10 items-center justify-center rounded-2xl shadow-sm md:size-12"
            style={{
              backgroundImage:
                "linear-gradient(to bottom right, color-mix(in srgb, #14b8a6 30%, transparent), color-mix(in srgb, #a855f7 30%, transparent))",
            }}
          >
            <Sparkles className="size-6 text-white" />
          </div>
          <div>
            <h1
              className="text-xl font-semibold tracking-tight md:text-3xl"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #14b8a6, #a855f7)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Upgrade to WISK AI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlock Winston and AI-powered insights for your business.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-wisk-teal/30 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-wisk-teal">WISK AI</CardTitle>
            <CardDescription>
              <span className="text-2xl font-semibold text-foreground">
                £9
              </span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>AI Digest — weekly business summary</li>
              <li>WISK Chat — ask Winston anything</li>
              <li>Smart suggestions across your workspace</li>
              <li>100,000 tokens per month</li>
            </ul>
          </CardContent>
          <CardFooter>
            <a
              href={AI_WAITLIST_MAILTO}
              className={cn(
                buttonVariants(),
                "w-full bg-wisk-teal text-white hover:bg-wisk-teal/90"
              )}
            >
              Join waitlist
            </a>
          </CardFooter>
        </Card>

        <Card className="relative border-wisk-purple/30 bg-card/80 shadow-sm">
          <Badge
            variant="secondary"
            className="absolute top-4 right-4 border-wisk-purple/30 bg-wisk-purple/10 text-wisk-purple"
          >
            Coming soon
          </Badge>
          <CardHeader>
            <CardTitle className="text-wisk-purple">WISK AI Pro</CardTitle>
            <CardDescription>
              <span className="text-2xl font-semibold text-foreground">
                £19
              </span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Everything in WISK AI</li>
              <li>Email integration (Gmail + Outlook)</li>
              <li>Higher usage limits</li>
              <li>Priority support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <a
              href={AI_PRO_WAITLIST_MAILTO}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Join waitlist
            </a>
          </CardFooter>
        </Card>
      </div>

      <Card className="mt-8 border-border/60 bg-card/60">
        <CardContent className="space-y-2 px-6 py-5 text-sm">
          <p className="font-medium text-foreground">Your current plan</p>
          {plan === "free" ? (
            <p className="text-muted-foreground">
              You&apos;re on the free Core plan.
            </p>
          ) : plan === "ai" ? (
            <p className="text-muted-foreground">
              You&apos;re on WISK AI. Billing coming soon.
            </p>
          ) : (
            <p className="text-muted-foreground">
              You&apos;re on {planLabel}. Billing coming soon.
            </p>
          )}
          {periodEndLabel ? (
            <p className={cn("text-muted-foreground")}>
              Current period ends {periodEndLabel}.
            </p>
          ) : null}
          <p className="pt-2 text-xs text-muted-foreground">
            Paid checkout via Stripe is coming soon.{" "}
            <Link href="/settings?tab=preferences" className="text-wisk-teal hover:underline">
              Manage in Settings
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageTransition>
  );
}
