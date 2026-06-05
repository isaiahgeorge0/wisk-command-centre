"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import {
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  type ContentStatus,
} from "@/lib/content/types";
import { emptyToNull, parseTagsInput, todayDateISO } from "@/lib/content/format";
import type { ActionResult, ContentFormInput, ContentPost } from "@/lib/content/types";

const contentFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  platform: z.enum(CONTENT_PLATFORMS),
  content_type: z.enum(CONTENT_TYPES),
  status: z.enum(CONTENT_STATUSES),
  scheduled_date: z.string().optional(),
  published_date: z.string().optional(),
  hook: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  goal_id: z.string().optional(),
});

function revalidateContentPaths() {
  revalidatePath("/content");
  revalidatePath("/calendar");
  revalidatePath("/goals");
  revalidatePath("/");
}

function toDbPayload(input: ContentFormInput) {
  return {
    title: input.title.trim(),
    platform: input.platform,
    content_type: input.content_type,
    status: input.status,
    scheduled_date: emptyToNull(input.scheduled_date),
    published_date: emptyToNull(input.published_date),
    hook: emptyToNull(input.hook),
    description: emptyToNull(input.description),
    tags: parseTagsInput(input.tags),
    goal_id: emptyToNull(input.goal_id),
  };
}

function publishedDateForStatus(
  status: ContentStatus,
  existingPublishedDate: string | null
): string | null | undefined {
  if (status === "published" && !existingPublishedDate) {
    return todayDateISO();
  }
  return undefined;
}

export async function getContentPosts(): Promise<ContentPost[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getContentPosts:", error);
    return [];
  }

  return (data ?? []) as ContentPost[];
}

export async function createContentPost(
  input: ContentFormInput
): Promise<ActionResult<ContentPost>> {
  const parsed = contentFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();
  const payload = toDbPayload(parsed.data);
  const publishedDate =
    parsed.data.status === "published"
      ? payload.published_date ?? todayDateISO()
      : payload.published_date;

  const { data, error } = await supabase
    .from("content_posts")
    .insert({
      user_id: userId,
      ...payload,
      published_date: publishedDate,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createContentPost:", error);
    return { success: false, error: error.message };
  }

  revalidateContentPaths();
  return { success: true, data: data as ContentPost };
}

export async function updateContentPost(
  id: string,
  input: ContentFormInput
): Promise<ActionResult<ContentPost>> {
  const parsed = contentFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("content_posts")
    .select("published_date")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Content post not found" };
  }

  const payload = {
    ...toDbPayload(parsed.data),
    published_date:
      publishedDateForStatus(parsed.data.status, existing.published_date) ??
      toDbPayload(parsed.data).published_date ??
      existing.published_date,
  };

  const { data, error } = await supabase
    .from("content_posts")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("updateContentPost:", error);
    return { success: false, error: error.message };
  }

  revalidateContentPaths();
  return { success: true, data: data as ContentPost };
}

export async function updateContentPostStatus(
  id: string,
  status: ContentStatus
): Promise<ActionResult<ContentPost>> {
  if (!CONTENT_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("content_posts")
    .select("published_date")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Content post not found" };
  }

  const updatePayload: Record<string, unknown> = { status };
  const publishedDate = publishedDateForStatus(status, existing.published_date);
  if (publishedDate) {
    updatePayload.published_date = publishedDate;
  }

  const { data, error } = await supabase
    .from("content_posts")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("updateContentPostStatus:", error);
    return { success: false, error: error.message };
  }

  revalidateContentPaths();
  return { success: true, data: data as ContentPost };
}

export async function deleteContentPost(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteContentPost:", error);
    return { success: false, error: error.message };
  }

  revalidateContentPaths();
  return { success: true };
}

export async function getPublishedPostCountsByGoalIds(
  goalIds: string[]
): Promise<Record<string, number>> {
  if (goalIds.length === 0) return {};

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("content_posts")
    .select("goal_id")
    .eq("user_id", userId)
    .eq("status", "published")
    .in("goal_id", goalIds);

  if (error) {
    console.error("getPublishedPostCountsByGoalIds:", error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.goal_id) continue;
    counts[row.goal_id] = (counts[row.goal_id] ?? 0) + 1;
  }

  return counts;
}
