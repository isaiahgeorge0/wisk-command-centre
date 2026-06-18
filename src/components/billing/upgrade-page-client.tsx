"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const searchParams = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("cancelled") === "true") setShowCancelled(true);
  }, [searchParams]);

  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);
  const hasActivePlan = plan !== "free";

  async function openPortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error("customer-portal failed:", data.error);
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("customer-portal error:", err);
      setPortalLoading(false);
    }
  }

  return (
    <PageTransition>
      {/* ── Cancelled banner ──────────────────────────────────────────────────── */}
      {showCancelled && (
        <div
          ref={bannerRef}
          className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground"
        >
          <p className="flex-1">No worries — you can upgrade any time.</p>
          <button
            onClick={() => setShowCancelled(false)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────────────────── */}
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
                backgroundImage: "linear-gradient(to right, #14b8a6, #a855f7)",
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

      {/* ── Pricing cards ─────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* WISK AI */}
        <Card className="border-wisk-teal/30 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-wisk-teal">WISK AI</CardTitle>
            <CardDescription>
              <span className="text-2xl font-semibold text-foreground">£9</span>
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
            {hasActivePlan ? (
              <Button
                className="w-full bg-wisk-teal text-white hover:bg-wisk-teal/90"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Manage subscription
              </Button>
            ) : (
              <Link
                href="/upgrade/ai"
                className={cn(
                  buttonVariants(),
                  "w-full bg-wisk-teal text-white hover:bg-wisk-teal/90"
                )}
              >
                Get started
              </Link>
            )}
          </CardFooter>
        </Card>

        {/* WISK AI Pro */}
        <Card className="relative border-wisk-purple/30 bg-card/80 shadow-sm">
          {!hasActivePlan && (
            <Badge
              variant="secondary"
              className="absolute top-4 right-4 border-wisk-purple/30 bg-wisk-purple/10 text-wisk-purple"
            >
              Most powerful
            </Badge>
          )}
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
            {hasActivePlan ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Manage subscription
              </Button>
            ) : (
              <Link
                href="/upgrade/ai-pro"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Get started
              </Link>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* ── Current plan card ─────────────────────────────────────────────────── */}
      <Card className="mt-8 border-border/60 bg-card/60">
        <CardContent className="space-y-2 px-6 py-5 text-sm">
          <p className="font-medium text-foreground">Your current plan</p>
          {plan === "free" ? (
            <p className="text-muted-foreground">
              You&apos;re on the free Core plan.
            </p>
          ) : (
            <p className="text-muted-foreground">You&apos;re on {planLabel}.</p>
          )}
          {periodEndLabel ? (
            <p className="text-muted-foreground">
              Current period ends {periodEndLabel}.
            </p>
          ) : null}
          {hasActivePlan && (
            <p className="pt-1">
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className={cn(
                  buttonVariants({ variant: "link" }),
                  "h-auto p-0 text-wisk-teal"
                )}
              >
                {portalLoading && (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                )}
                Manage billing
              </button>
            </p>
          )}
          {!hasActivePlan && (
            <p className="pt-2 text-xs text-muted-foreground">
              Secure checkout via Stripe.{" "}
              <Link
                href="/settings?tab=preferences"
                className="text-wisk-teal hover:underline"
              >
                Manage in Settings
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}
