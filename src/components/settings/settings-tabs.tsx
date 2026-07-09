"use client";

import { cn } from "@/lib/utils";

export type SettingsTab =
  | "profile"
  | "preferences"
  | "service-types"
  | "integrations"
  | "help";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "service-types", label: "Project types" },
  { id: "integrations", label: "Integrations" },
  { id: "help", label: "Help" },
];

type SettingsTabsProps = {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border/60 pb-px">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "border-wisk-turquoise text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function tabFromSearchParam(value: string | null): SettingsTab {
  if (
    value === "preferences" ||
    value === "service-types" ||
    value === "integrations" ||
    value === "help"
  ) {
    return value;
  }
  return "profile";
}
