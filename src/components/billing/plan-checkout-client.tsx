"use client";

import { useState } from "react";
import { ArrowLeft, Check, Loader2, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanDetails = {
  key: "ai" | "ai_pro";
  name: string;
  price: number;
  priceId: string;
  features: string[];
  dayOneUnlocks: string[];
};

type PlanCheckoutClientProps = {
  plan: PlanDetails;
  showUpsell: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCENT: Record<"ai" | "ai_pro", { text: string; border: string; bg: string }> = {
  ai: {
    text: "text-wisk-teal",
    border: "border-wisk-teal/30",
    bg: "bg-wisk-teal/10",
  },
  ai_pro: {
    text: "text-wisk-purple",
    border: "border-wisk-purple/30",
    bg: "bg-wisk-purple/10",
  },
};

// ─── Feature item ─────────────────────────────────────────────────────────────

function FeatureItem({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: (typeof ACCENT)["ai"];
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          accent.bg,
          accent.border,
          "border"
        )}
      >
        <Check className={cn("size-3", accent.text)} aria-hidden />
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanCheckoutClient({ plan, showUpsell }: PlanCheckoutClientProps) {
  const [loading, setLoading] = useState(false);
  const accent = ACCENT[plan.key];

  // Gradient colours per plan
  const gradientFrom = plan.key === "ai" ? "#14b8a6" : "#a855f7";
  const gradientTo = plan.key === "ai" ? "#a855f7" : "#6366f1";

  async function handleGetStarted() {
    if (loading || !plan.priceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error("create-checkout failed:", data.error);
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("create-checkout error:", err);
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      {/* ── Back link ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to plans
        </Link>
      </div>

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight md:text-3xl"
          style={{
            backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {plan.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review your plan before continuing to checkout.
        </p>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ── LEFT — Plan details ───────────────────────────────────────────── */}
        <div className="space-y-8">
          {/* Features */}
          <Card className={cn("bg-card/80 shadow-sm", accent.border)}>
            <CardHeader className="pb-4">
              <CardTitle className={cn("flex items-center gap-2 text-base", accent.text)}>
                <Sparkles className="size-4" aria-hidden />
                What&apos;s included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <FeatureItem key={feature} accent={accent}>
                    {feature}
                  </FeatureItem>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Day-one unlocks */}
          <Card className="border-border/60 bg-card/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Zap className="size-4 text-amber-500" aria-hidden />
                What you get from day one
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.dayOneUnlocks.map((unlock) => (
                  <li key={unlock} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                      <Check className="size-3 text-amber-500" aria-hidden />
                    </span>
                    <span className="text-sm text-muted-foreground">{unlock}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT — Order summary + upsell ───────────────────────────────────── */}
        <div className="space-y-4">
          {/* Order summary */}
          <Card className={cn("bg-card/80 shadow-sm", accent.border)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan row */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("font-semibold", accent.text)}>{plan.name}</p>
                  <p className="text-xs text-muted-foreground">Billed monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    £{plan.price}
                  </p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Due today</p>
                  <p className="text-sm font-semibold text-foreground">£{plan.price}</p>
                </div>

                <Button
                  className={cn(
                    "w-full font-medium",
                    plan.key === "ai"
                      ? "bg-wisk-teal text-white hover:bg-wisk-teal/90"
                      : "bg-wisk-purple text-white hover:bg-wisk-purple/90"
                  )}
                  onClick={handleGetStarted}
                  disabled={loading || !plan.priceId}
                >
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  ) : null}
                  {loading ? "Redirecting to Stripe…" : "Get started"}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Secure payment via Stripe. Cancel any time.
              </p>
            </CardContent>
          </Card>

          {/* Upsell — AI only */}
          {showUpsell && (
            <Card className="border-wisk-purple/20 bg-wisk-purple/5 shadow-sm">
              <CardContent className="px-5 py-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-wisk-purple">
                  Most popular upgrade
                </p>
                <p className="text-sm font-medium text-foreground">WISK AI Pro</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  For £10 more per month, also get email integration (Gmail +
                  Outlook) and higher usage limits.
                </p>
                <Link
                  href="/upgrade/ai-pro"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-wisk-purple transition-opacity hover:opacity-80"
                >
                  Upgrade to AI Pro instead
                  <ArrowLeft className="size-3.5 rotate-180" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
