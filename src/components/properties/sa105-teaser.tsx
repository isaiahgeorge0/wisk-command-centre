import {
  AlertTriangle,
  Calculator,
  Calendar,
  Download,
  Lightbulb,
  PoundSterling,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const CTA_GRADIENT =
  "linear-gradient(135deg, #8b0010 0%, #e8001d 50%, #cc0016 100%)";

const FEATURES = [
  {
    icon: Calculator,
    title: "Box-by-box breakdown",
    description:
      "Income and expenses mapped directly to official SA105 box numbers.",
  },
  {
    icon: PoundSterling,
    title: "Mortgage interest handled correctly",
    description:
      "Residential finance costs reported the right way, separate from your profit calculation.",
  },
  {
    icon: Lightbulb,
    title: "Replacement relief identified",
    description:
      "Automatically flags maintenance costs that may qualify for Replacement of Domestic Items Relief.",
  },
  {
    icon: AlertTriangle,
    title: "Common mistakes flagged",
    description:
      "Warnings for large repair costs, missing fees, and other things worth double-checking.",
  },
  {
    icon: Calendar,
    title: "Tax year aligned",
    description:
      "Figures calculated for the correct UK tax year, 6 April to 5 April.",
  },
  {
    icon: Download,
    title: "Save as PDF",
    description:
      "Keep a record for your accountant or your own files.",
  },
] as const;

export function SA105Teaser() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-wisk-ferrari/20 bg-wisk-ferrari/10">
          <Calculator className="size-8 text-wisk-ferrari" aria-hidden />
        </div>

        <span className="rounded-full border border-wisk-ferrari/20 bg-wisk-ferrari/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-wisk-ferrari">
          Properties Pro
        </span>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          SA105 Tax Summary
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
          Your UK property income, organised exactly how HMRC expects it for your
          Self Assessment tax return.
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
          This tool summarises your WISK data using the official SA105 box
          structure. It does not file your return or replace professional tax
          advice.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/upgrade/properties-pro"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CTA_GRADIENT }}
          >
            <Sparkles className="size-4" aria-hidden />
            Unlock SA105 Tax Summary
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
