import type { ContentPlatform, ContentStatus, ContentType, RecurrenceRule } from "@/lib/content/types";

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In progress",
  scheduled: "Scheduled",
  published: "Published",
};

export const PIPELINE_STATUSES: ContentStatus[] = [
  "idea",
  "planned",
  "in_progress",
  "scheduled",
  "published",
];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  Video: "Video",
  Reel: "Reel",
  Short: "Short",
  Post: "Post",
  Story: "Story",
  Article: "Article",
  Thread: "Thread",
  Other: "Other",
};

export const PLATFORM_BADGE_CLASS: Record<ContentPlatform, string> = {
  TikTok: "border-wisk-coral/30 bg-wisk-coral/15 text-wisk-coral",
  Instagram: "border-wisk-purple/30 bg-wisk-purple/15 text-wisk-purple",
  YouTube: "border-red-500/30 bg-red-500/15 text-red-400",
  LinkedIn: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  "Twitter/X": "border-sky-500/30 bg-sky-500/15 text-sky-400",
  Facebook: "border-blue-700/30 bg-blue-700/15 text-blue-300",
  Other: "border-border bg-muted text-muted-foreground",
};

export const PLATFORM_DOT_CLASS: Record<ContentPlatform, string> = {
  TikTok: "bg-wisk-coral",
  Instagram: "bg-wisk-purple",
  YouTube: "bg-red-500",
  LinkedIn: "bg-blue-500",
  "Twitter/X": "bg-sky-500",
  Facebook: "bg-blue-700",
  Other: "bg-muted-foreground",
};

export const PLATFORM_TOGGLE_SELECTED_CLASS: Record<ContentPlatform, string> = {
  TikTok: "border-wisk-coral/50 bg-wisk-coral/20 text-wisk-coral",
  Instagram: "border-wisk-purple/50 bg-wisk-purple/20 text-wisk-purple",
  YouTube: "border-red-500/50 bg-red-500/20 text-red-400",
  LinkedIn: "border-blue-500/50 bg-blue-500/20 text-blue-400",
  "Twitter/X": "border-sky-500/50 bg-sky-500/20 text-sky-400",
  Facebook: "border-blue-700/50 bg-blue-700/20 text-blue-300",
  Other: "border-border bg-muted text-muted-foreground",
};

export const PLATFORM_PILL_CLASS: Record<ContentPlatform, string> = {
  TikTok: "bg-wisk-coral/90 text-white",
  Instagram: "bg-wisk-purple/90 text-white",
  YouTube: "bg-red-500/90 text-white",
  LinkedIn: "bg-blue-500/90 text-white",
  "Twitter/X": "bg-sky-500/90 text-white",
  Facebook: "bg-blue-700/90 text-white",
  Other: "bg-muted-foreground/80 text-white",
};

export const CONTENT_STATUS_BADGE_CLASS: Record<ContentStatus, string> = {
  idea: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  planned: "border-wisk-purple/30 bg-wisk-purple/15 text-wisk-purple",
  in_progress: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  scheduled: "border-wisk-teal/30 bg-wisk-teal/15 text-wisk-teal",
  published: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
};

export const CONTENT_GOAL_CATEGORY = "Content";

export const RECURRENCE_OPTIONS: { value: RecurrenceRule | ""; label: string }[] = [
  { value: "", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
