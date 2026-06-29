import {
  Building2,
  Calculator,
  Download,
  FileText,
  PieChart,
  PoundSterling,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

const FEATURES = [
  {
    icon: FileText,
    title: "Tax year reports",
    description:
      "Generate reports aligned to the UK tax year (6 April – 5 April).",
  },
  {
    icon: Building2,
    title: "Per-property breakdown",
    description:
      "Detailed income, costs, yield, and payment history per property.",
  },
  {
    icon: PieChart,
    title: "Portfolio summary",
    description:
      "Combined view across your entire portfolio in one report.",
  },
  {
    icon: Download,
    title: "Save as PDF",
    description:
      "Print or save any report as a PDF directly from your browser.",
  },
  {
    icon: PoundSterling,
    title: "SA105 ready",
    description:
      "Organised exactly how HMRC needs it for your self-assessment. (Coming soon)",
  },
  {
    icon: Calculator,
    title: "Yield and ROI",
    description:
      "Gross yield, net yield, and return on investment included in every report.",
  },
] as const;

export function ReportsTeaser() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <FileText className="size-8 text-amber-500" aria-hidden />
        </div>

        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-500">
          Properties Pro
        </span>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Financial Reports
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
          Professional financial reports for your portfolio — ready for your
          accountant or self-assessment.
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
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
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
            Unlock Financial Reports
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
