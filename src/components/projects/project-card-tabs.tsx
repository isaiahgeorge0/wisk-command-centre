"use client";

import { cn } from "@/lib/utils";

export type ProjectCardTab = "details" | "tasks" | "milestones";

const TABS: { id: ProjectCardTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "tasks", label: "Tasks" },
  { id: "milestones", label: "Milestones" },
];

type ProjectCardTabsProps = {
  activeTab: ProjectCardTab;
  onChange: (tab: ProjectCardTab) => void;
};

export function ProjectCardTabs({ activeTab, onChange }: ProjectCardTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border/50 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
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
