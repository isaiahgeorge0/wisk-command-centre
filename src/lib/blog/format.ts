import type { BlogFormInput, BlogPost } from "@/lib/blog/types";

export function tagsToString(tags: string[] | null | undefined): string {
  return tags?.join(", ") ?? "";
}

export function parseTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function todayDateISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToISO(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  // datetime-local input expects "YYYY-MM-DDTHH:mm"
  return iso.slice(0, 16);
}

export function postToFormInput(post: BlogPost): BlogFormInput {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    cover_image_url: post.cover_image_url ?? "",
    tags: tagsToString(post.tags),
    author_name: post.author_name,
    published: post.published,
    published_at: isoToDateInput(post.published_at) || todayDateISO(),
    scheduled_for: isoToDatetimeLocal(post.scheduled_for),
  };
}

export function emptyBlogForm(authorName: string): BlogFormInput {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    tags: "",
    author_name: authorName,
    published: false,
    published_at: todayDateISO(),
    scheduled_for: "",
  };
}
