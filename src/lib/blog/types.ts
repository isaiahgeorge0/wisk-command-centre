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
};

export type BlogActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export const BLOG_STATUS_LABELS = {
  published: "Published",
  draft: "Draft",
} as const;

export const BLOG_STATUS_BADGE_CLASSES = {
  published:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  draft:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
} as const;
