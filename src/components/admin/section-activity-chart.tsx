import type { SectionActivity } from "@/lib/admin/platform";

type SectionActivityChartProps = {
  sections: SectionActivity[];
};

export function SectionActivityChart({ sections }: SectionActivityChartProps) {
  const maxCount = Math.max(...sections.map((section) => section.count), 1);

  if (sections.every((section) => section.count === 0)) {
    return (
      <p className="text-sm text-muted-foreground">
        No platform data yet across sections.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const width = `${Math.max((section.count / maxCount) * 100, section.count > 0 ? 8 : 0)}%`;

        return (
          <div key={section.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{section.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {section.count}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className={`h-full rounded-full transition-all ${section.barClass}`}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
