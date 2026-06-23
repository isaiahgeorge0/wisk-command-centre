import type { IdeaFilters, IdeaStatus, IdeaStatusFilter } from "@/lib/ideas/types";
import { IDEA_STATUSES } from "@/lib/ideas/types";

export const IDEA_CATEGORY_SUGGESTIONS = [
  "Content",
  "Product",
  "Business",
  "Personal",
] as const;

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  new: "New",
  exploring: "Exploring",
  "in-progress": "In progress",
  parked: "Parked",
  dropped: "Dropped",
};

export const IDEA_STATUS_BADGE_CLASS: Record<IdeaStatus, string> = {
  new: "border-wisk-teal/30 bg-wisk-teal/15 text-wisk-teal",
  exploring: "border-wisk-purple/30 bg-wisk-purple/15 text-wisk-purple",
  "in-progress": "border-amber-500/30 bg-amber-500/15 text-amber-400",
  parked: "border-border bg-muted text-muted-foreground",
  dropped: "border-red-500/20 bg-red-500/10 text-muted-foreground",
};

export const DEFAULT_IDEA_FILTERS: IdeaFilters = {
  search: "",
  category: "all",
  status: "all",
};

export const IDEA_STATUS_FILTER_OPTIONS: {
  value: IdeaStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  ...IDEA_STATUSES.map((status) => ({
    value: status,
    label: IDEA_STATUS_LABELS[status],
  })),
];
