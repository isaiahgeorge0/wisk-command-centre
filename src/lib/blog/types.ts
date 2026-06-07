export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  tags: string[] | null;
  author_name: string;
  published: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogFormInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  tags: string;
  author_name: string;
  published: boolean;
  published_at: string;
  scheduled_for?: string;
};

export type BlogPostStatus = "draft" | "scheduled" | "published";

export function getBlogPostStatus(post: BlogPost): BlogPostStatus {
  if (post.published) return "published";
  if (post.scheduled_for) return "scheduled";
  return "draft";
}

export type BlogActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export const BLOG_STATUS_LABELS: Record<BlogPostStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
};

export const BLOG_STATUS_BADGE_CLASSES: Record<BlogPostStatus, string> = {
  published:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  scheduled:
    "border-wisk-purple/30 bg-wisk-purple/10 text-wisk-purple",
  draft:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};
