export type ChangelogType = "feature" | "improvement" | "fix";

export type ChangelogEntry = {
  id: string;
  title: string;
  description: string;
  type: ChangelogType;
  published_at: string;
  created_by: string;
};

export const CHANGELOG_TYPE_LABELS: Record<ChangelogType, string> = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
};

export const CHANGELOG_TYPE_BADGE_CLASSES: Record<ChangelogType, string> = {
  feature:
    "border-wisk-teal/30 bg-wisk-teal/10 text-wisk-teal",
  improvement:
    "border-wisk-purple/30 bg-wisk-purple/10 text-wisk-purple",
  fix: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};
