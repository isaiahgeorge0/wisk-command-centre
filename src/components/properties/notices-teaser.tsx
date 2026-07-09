import {
  Calendar,
  CheckCircle2,
  Download,
  FileWarning,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const CTA_GRADIENT =
  "linear-gradient(135deg, #8b0010 0%, #e8001d 50%, #cc0016 100%)";

const FEATURES = [
  {
    icon: FileWarning,
    title: "Section 8 notices",
    description:
      "Official Form 3A with verbatim statutory wording for the grounds you select.",
  },
  {
    icon: TrendingUp,
    title: "Section 13 rent increases",
    description:
      "Official Form 4A with correctly calculated notice periods and dates.",
  },
  {
    icon: CheckCircle2,
    title: "Eligibility checks",
    description:
      "Automatic warnings if arrears thresholds or protected periods aren't met.",
  },
  {
    icon: Calendar,
    title: "Correct notice periods",
    description:
      "Notice periods and court dates calculated automatically for each ground.",
  },
  {
    icon: Download,
    title: "Save as PDF",
    description:
      "Print or save your completed notice directly from your browser.",
  },
  {
    icon: ShieldAlert,
    title: "Built on official guidance",
    description:
      "Based on the current Renters' Rights Act 2025 government forms and statutory wording.",
  },
] as const;

export function NoticesTeaser() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-wisk-ferrari/20 bg-wisk-ferrari/10">
          <FileWarning className="size-8 text-wisk-ferrari" aria-hidden />
        </div>

        <span className="rounded-full border border-wisk-ferrari/20 bg-wisk-ferrari/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-wisk-ferrari">
          Properties Pro
        </span>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Legal Notice Templates
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
          Prepare Section 8 and Section 13 notices using the official government
          forms — pre-filled with your tenant and property data.
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
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-lg text-xs text-muted-foreground">
          This tool prepares official forms using your data. It does not provide
          legal advice — always verify with a solicitor for contested cases.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/upgrade/properties-pro"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CTA_GRADIENT }}
          >
            <Sparkles className="size-4" aria-hidden />
            Unlock Legal Notice Templates
          </Link>
          <Link
            href="/properties/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    </div>
  );
}
