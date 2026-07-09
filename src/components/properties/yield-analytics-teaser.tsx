import {
  AlertTriangle,
  BarChart2,
  Building2,
  LineChart,
  PoundSterling,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const CTA_GRADIENT =
  "linear-gradient(135deg, #8b0010 0%, #e8001d 50%, #cc0016 100%)";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Gross yield",
    description:
      "Contracted rent as a percentage of current property value.",
  },
  {
    icon: PoundSterling,
    title: "Net yield",
    description:
      "Yield after mortgage, insurance, and maintenance costs.",
  },
  {
    icon: BarChart2,
    title: "Return on investment",
    description:
      "Annual net income as a percentage of your purchase price.",
  },
  {
    icon: Building2,
    title: "Per-property breakdown",
    description:
      "Side-by-side yield comparison across every property in your portfolio.",
  },
  {
    icon: LineChart,
    title: "12-month income chart",
    description:
      "Visual breakdown of portfolio income vs costs over the past year.",
  },
  {
    icon: AlertTriangle,
    title: "Vacancy loss tracker",
    description: "See exactly how much empty periods are costing you.",
  },
] as const;

export function YieldAnalyticsTeaser() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-wisk-ferrari/20 bg-wisk-ferrari/10">
          <TrendingUp className="size-8 text-wisk-ferrari" aria-hidden />
        </div>

        <span className="rounded-full border border-wisk-ferrari/20 bg-wisk-ferrari/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-wisk-ferrari">
          Properties Pro
        </span>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Yield Analytics
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
          Understand exactly how hard your properties are working for you.
          Track gross yield, net yield, ROI, and vacancy loss across your
          entire portfolio.
        </p>

        <div className="mt-10 grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-wisk-ferrari/15 bg-card/60 px-4 py-4 text-left"
            >
              <Icon className="size-5 text-wisk-ferrari" aria-hidden />
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
            Unlock Yield Analytics
          </Link>
          <Link
            href="/properties/finances"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Finances
          </Link>
        </div>
      </div>
    </div>
  );
}
