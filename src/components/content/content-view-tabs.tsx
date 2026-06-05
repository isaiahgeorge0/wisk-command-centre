"use client";

import { cn } from "@/lib/utils";

export type ContentViewTab = "calendar" | "board";

const TABS: { id: ContentViewTab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "board", label: "Board" },
];

type ContentViewTabsProps = {
  activeTab: ContentViewTab;
  onChange: (tab: ContentViewTab) => void;
};

export function ContentViewTabs({ activeTab, onChange }: ContentViewTabsProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-border/50 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
