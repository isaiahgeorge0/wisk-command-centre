"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  dateInputToISO,
  parseTagsInput,
  todayDateISO,
} from "@/lib/blog/format";
import { SLUG_PATTERN } from "@/lib/blog/slug";
import type { BlogActionResult, BlogFormInput, BlogPost } from "@/lib/blog/types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const blogFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(SLUG_PATTERN, "Slug must use lowercase letters, numbers, and hyphens"),
  excerpt: z.string().trim().min(1, "Excerpt is required"),
  content: z.string().trim().min(1, "Content is required"),
  cover_image_url: z.string().optional(),
  tags: z.string().optional(),
  author_name: z.string().trim().min(1, "Author name is required"),
  published: z.boolean(),
  published_at: z.string().optional(),
  scheduled_for: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || !val.trim()) return true;
        return new Date(val) > new Date();
      },
      { message: "Scheduled time must be in the future" }
    ),
});

function revalidateBlogPaths(id?: string) {
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/new");
  if (id) {
    revalidatePath(`/admin/blog/${id}/edit`);
  }
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function slugDuplicateError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "A post with this slug already exists. Choose a different slug.";
  }
  return error.message;
}

function normalizeFormInput(
  data: z.infer<typeof blogFormSchema>
): BlogFormInput {
  return {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    cover_image_url: data.cover_image_url ?? "",
    tags: data.tags ?? "",
    author_name: data.author_name,
    published: data.published,
    published_at: data.published_at ?? "",
    scheduled_for: data.scheduled_for ?? "",
  };
}

function toDbPayload(
  input: BlogFormInput,
  options?: {
    publishedAtOverride?: string | null;
    scheduledForOverride?: string | null;
  }
) {
  const publishedAt =
    options?.publishedAtOverride !== undefined
      ? options.publishedAtOverride
      : input.published && input.published_at
        ? dateInputToISO(input.published_at)
        : null;

  const scheduledFor =
    options?.scheduledForOverride !== undefined
      ? options.scheduledForOverride
      : emptyToNull(input.scheduled_for);

  return {
    title: input.title.trim(),
    slug: input.slug.trim(),
    excerpt: input.excerpt.trim(),
    content: input.content,
    cover_image_url: emptyToNull(input.cover_image_url),
    tags: parseTagsInput(input.tags ?? ""),
    author_name: input.author_name.trim(),
    published: input.published,
    published_at: publishedAt,
    scheduled_for: scheduledFor,
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getBlogPosts:", error);
    return [];
  }

  return (data ?? []) as BlogPost[];
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getBlogPost:", error);
    return null;
  }

  return (data as BlogPost | null) ?? null;
}

export async function createBlogPost(
  input: BlogFormInput
): Promise<BlogActionResult<BlogPost>> {
  await requireAdmin();
  const parsed = blogFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = createAdminClient();
  const payload = toDbPayload(normalizeFormInput(parsed.data));

  if (payload.published && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }
  // Publishing immediately clears any pending schedule
  if (payload.published) {
    payload.scheduled_for = null;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("createBlogPost:", error);
    return { success: false, error: slugDuplicateError(error) };
  }

  revalidateBlogPaths();
  return { success: true, data: data as BlogPost };
}

export async function updateBlogPost(
  id: string,
  input: BlogFormInput
): Promise<BlogActionResult<BlogPost>> {
  await requireAdmin();
  const parsed = blogFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = createAdminClient();
  const payload = toDbPayload(normalizeFormInput(parsed.data));

  if (payload.published && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }
  // Publishing immediately clears any pending schedule
  if (payload.published) {
    payload.scheduled_for = null;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("updateBlogPost:", error);
    return { success: false, error: slugDuplicateError(error) };
  }

  revalidateBlogPaths(id);
  return { success: true, data: data as BlogPost };
}

export async function publishBlogPost(
  id: string
): Promise<BlogActionResult<BlogPost>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("blog_posts")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Blog post not found" };
  }

  const publishedAt =
    existing.published_at ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("blog_posts")
    .update({
      published: true,
      published_at: publishedAt,
      scheduled_for: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("publishBlogPost:", error);
    return { success: false, error: error.message };
  }

  revalidateBlogPaths(id);
  return { success: true, data: data as BlogPost };
}

export async function unpublishBlogPost(
  id: string
): Promise<BlogActionResult<BlogPost>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .update({ published: false, scheduled_for: null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("unpublishBlogPost:", error);
    return { success: false, error: error.message };
  }

  revalidateBlogPaths(id);
  return { success: true, data: data as BlogPost };
}

export async function cancelBlogPostSchedule(
  id: string
): Promise<BlogActionResult<BlogPost>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .update({ scheduled_for: null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("cancelBlogPostSchedule:", error);
    return { success: false, error: error.message };
  }

  revalidateBlogPaths(id);
  return { success: true, data: data as BlogPost };
}

export async function deleteBlogPost(id: string): Promise<BlogActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("deleteBlogPost:", error);
    return { success: false, error: error.message };
  }

  revalidateBlogPaths();
  return { success: true };
}

export async function saveBlogPostDraft(
  id: string | null,
  input: BlogFormInput
): Promise<BlogActionResult<BlogPost>> {
  const draftInput = { ...input, published: false };

  if (id) {
    return updateBlogPost(id, draftInput);
  }

  return createBlogPost(draftInput);
}

export async function publishBlogPostFromForm(
  id: string | null,
  input: BlogFormInput
): Promise<BlogActionResult<BlogPost>> {
  const publishInput = {
    ...input,
    published: true,
    published_at: input.published_at || todayDateISO(),
    scheduled_for: "",
  };

  if (id) {
    return updateBlogPost(id, publishInput);
  }

  return createBlogPost(publishInput);
}

export async function scheduleBlogPostFromForm(
  id: string | null,
  input: BlogFormInput,
  scheduledFor: string
): Promise<BlogActionResult<BlogPost>> {
  if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
    return { success: false, error: "Scheduled time must be in the future" };
  }

  const scheduleInput: BlogFormInput = {
    ...input,
    published: false,
    published_at: "",
    scheduled_for: scheduledFor,
  };

  if (id) {
    return updateBlogPost(id, scheduleInput);
  }

  return createBlogPost(scheduleInput);
}
