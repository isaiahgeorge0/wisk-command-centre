import { Sparkles } from "lucide-react";
import Link from "next/link";

type PropertiesProTeaserProps = {
  title: string;
  description: string;
  features: string[];
};

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

export function PropertiesProTeaser({
  title,
  description,
  features,
}: PropertiesProTeaserProps) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 px-6 py-8">
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-500">
        Properties Pro
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-2.5">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full bg-amber-500"
              aria-hidden
            />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/upgrade/properties-pro"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: CTA_GRADIENT }}
      >
        <Sparkles className="size-4" aria-hidden />
        Unlock with Properties Pro
      </Link>
    </div>
  );
}
