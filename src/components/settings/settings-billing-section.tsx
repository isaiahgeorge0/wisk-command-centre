import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BillingPlan } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

type SettingsBillingSectionProps = {
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

export function SettingsBillingSection({
  plan,
  planLabel,
  currentPeriodEnd,
}: SettingsBillingSectionProps) {
  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);
  const isPaid = plan !== "free";

  return (
    <section id="billing">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Plan &amp; Billing
      </h2>
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
          <CardDescription>
            Your subscription and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-sm",
                plan === "free" && "border-border bg-muted text-foreground",
                plan === "ai" &&
                  "border-wisk-turquoise/30 bg-wisk-turquoise/10 text-wisk-turquoise",
                (plan === "ai_pro" || plan === "max") &&
                  "border-wisk-turquoise/30 bg-wisk-turquoise/10 text-wisk-turquoise"
              )}
            >
              {planLabel}
            </Badge>
          </div>

          {periodEndLabel ? (
            <p className="text-sm text-muted-foreground">
              Current period ends {periodEndLabel}.
            </p>
          ) : null}

          <p className="text-sm">
            <Link
              href="/upgrade"
              className="font-medium text-wisk-turquoise hover:underline"
            >
              {isPaid ? "Manage subscription" : "Upgrade"}
            </Link>
          </p>

          <p className="text-xs text-muted-foreground">
            Billing powered by Stripe — coming soon.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
