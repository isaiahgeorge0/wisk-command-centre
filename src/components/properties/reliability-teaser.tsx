import {
  Award,
  BarChart2,
  Clock,
  Flame,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Reliability score",
    description:
      "0–100 score based on payment history, timeliness, and consistency.",
  },
  {
    icon: Award,
    title: "Grade rating",
    description: "A to F grade for instant at-a-glance tenant assessment.",
  },
  {
    icon: TrendingDown,
    title: "At-risk alerts",
    description:
      "Immediately see which tenants have D or F grades and need attention.",
  },
  {
    icon: Clock,
    title: "Days late tracking",
    description:
      "Average days late across all payments, not just whether they paid.",
  },
  {
    icon: Flame,
    title: "Payment streaks",
    description:
      "Track consecutive on-time months to reward and identify your best tenants.",
  },
  {
    icon: BarChart2,
    title: "Portfolio distribution",
    description:
      "Grade breakdown across your entire tenant portfolio at a glance.",
  },
] as const;

export function ReliabilityTeaser() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <ShieldCheck className="size-8 text-amber-500" aria-hidden />
        </div>

        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-500">
          Properties Pro
        </span>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Tenant Reliability Scoring
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
          Know exactly which tenants are reliable and which need attention —
          before it becomes a problem.
        </p>

        <div className="mt-10 grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-4 text-left"
            >
              <Icon className="size-5 text-amber-500" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-foreground">
                {title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/upgrade/properties-pro"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CTA_GRADIENT }}
          >
            <Sparkles className="size-4" aria-hidden />
            Unlock Tenant Reliability
          </Link>
          <Link
            href="/properties/tenants"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Tenants
          </Link>
        </div>
      </div>
    </div>
  );
}
