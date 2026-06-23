"use client";

import { cn } from "@/lib/utils";

export type OverviewView = "overview" | "properties";

type OverviewViewToggleProps = {
  value: OverviewView;
  onChange: (value: OverviewView) => void;
};

export function OverviewViewToggle({ value, onChange }: OverviewViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-1"
      role="tablist"
      aria-label="Overview view"
    >
      {(
        [
          { id: "overview" as const, label: "Overview" },
          { id: "properties" as const, label: "Properties" },
        ] as const
      ).map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 rounded-md px-4 text-sm font-medium transition-colors md:min-h-9",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
