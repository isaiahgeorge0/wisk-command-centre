"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ActionResult, Idea, IdeaFormInput } from "@/lib/ideas/types";
import { IDEA_STATUSES } from "@/lib/ideas/types";

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const ideaFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(IDEA_STATUSES).optional(),
});

function toDbPayload(input: IdeaFormInput) {
  return {
    title: input.title.trim(),
    description: emptyToNull(input.description),
    category: emptyToNull(input.category),
    status: input.status ?? "new",
  };
}

export async function getIdeas(): Promise<Idea[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getIdeas:", error);
    return [];
  }

  return (data ?? []) as Idea[];
}

export async function createIdea(
  input: IdeaFormInput
): Promise<ActionResult<Idea>> {
  const parsed = ideaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      user_id: userId,
      ...toDbPayload(parsed.data),
    })
    .select()
    .single();

  if (error) {
    console.error("createIdea:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/ideas");
  return { success: true, data: data as Idea };
}

export async function updateIdea(
  id: string,
  input: IdeaFormInput
): Promise<ActionResult<Idea>> {
  const parsed = ideaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("ideas")
    .update(toDbPayload(parsed.data))
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateIdea:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/ideas");
  return { success: true, data: data as Idea };
}

export async function deleteIdea(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteIdea:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/ideas");
  return { success: true };
}

export async function convertIdeaToProject(
  ideaId: string
): Promise<ActionResult<{ projectId: string }>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .single();

  if (ideaError || !idea) {
    console.error("convertIdeaToProject - fetch idea:", ideaError);
    return { success: false, error: "Idea not found." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      project_name: idea.title,
      service_type: idea.category ?? "",
      status: "active",
      notes: idea.description ?? null,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("convertIdeaToProject - create project:", projectError);
    return { success: false, error: "Could not create project. Please try again." };
  }

  revalidatePath("/ideas");
  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, data: { projectId: project.id } };
}

export async function convertIdeaToContent(
  ideaId: string
): Promise<ActionResult<{ postId: string }>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .single();

  if (ideaError || !idea) {
    console.error("convertIdeaToContent - fetch idea:", ideaError);
    return { success: false, error: "Idea not found." };
  }

  const { data: post, error: postError } = await supabase
    .from("content_posts")
    .insert({
      user_id: userId,
      title: idea.title,
      description: idea.description ?? null,
      status: "idea",
      platforms: [],
      platform: "Other",
      content_type: "Other",
    })
    .select("id")
    .single();

  if (postError || !post) {
    console.error("convertIdeaToContent - create post:", postError);
    return { success: false, error: "Could not create content post. Please try again." };
  }

  revalidatePath("/ideas");
  revalidatePath("/content");
  revalidatePath("/");

  return { success: true, data: { postId: post.id } };
}
