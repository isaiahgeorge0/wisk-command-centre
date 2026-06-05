export const CONTENT_PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "LinkedIn",
  "Twitter/X",
  "Facebook",
  "Other",
] as const;

export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const CONTENT_TYPES = [
  "Video",
  "Reel",
  "Short",
  "Post",
  "Story",
  "Article",
  "Thread",
  "Other",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = [
  "idea",
  "planned",
  "in_progress",
  "scheduled",
  "published",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ContentPost = {
  id: string;
  user_id: string;
  title: string;
  platform: ContentPlatform | string;
  platforms: ContentPlatform[] | string[] | null;
  content_type: ContentType | string;
  status: ContentStatus | string;
  scheduled_date: string | null;
  published_date: string | null;
  hook: string | null;
  description: string | null;
  tags: string[] | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentFormInput = {
  title: string;
  platforms: ContentPlatform[];
  content_type: ContentType;
  status: ContentStatus;
  scheduled_date?: string;
  published_date?: string;
  hook?: string;
  description?: string;
  tags?: string;
  goal_id?: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type ContentCalendarEntry = {
  post: ContentPost;
  date: string;
  kind: "scheduled" | "published";
};
