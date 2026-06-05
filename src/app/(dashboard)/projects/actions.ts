"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { emptyToNull, parseProjectValue } from "@/lib/projects/format";
import type { ActionResult, Project, ProjectFormInput } from "@/lib/projects/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";

const projectFormSchema = z.object({
  project_name: z.string().trim().min(1, "Project name is required"),
  client_name: z.string().optional(),
  service_type: z.string().trim().min(1, "Project type is required"),
  status: z.enum(PROJECT_STATUSES),
  next_action: z.string().optional(),
  deadline: z.string().optional(),
  value: z.string().optional(),
  notes: z.string().optional(),
  site_url: z.string().optional(),
  github_repo: z.string().optional(),
});

function toDbPayload(input: ProjectFormInput) {
  return {
    project_name: input.project_name.trim(),
    client_name: emptyToNull(input.client_name),
    service_type: input.service_type.trim(),
    status: input.status,
    next_action: emptyToNull(input.next_action),
    deadline: emptyToNull(input.deadline),
    value: parseProjectValue(input.value),
    notes: emptyToNull(input.notes),
    site_url: emptyToNull(input.site_url),
    github_repo: emptyToNull(input.github_repo),
  };
}


export async function getProjects(): Promise<Project[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProjects:", error);
    return [];
  }

  return (data ?? []) as Project[];
}

export async function createProject(
  input: ProjectFormInput
): Promise<ActionResult<Project>> {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      ...toDbPayload(parsed.data),
    })
    .select()
    .single();

  if (error) {
    console.error("createProject:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/projects");
  return { success: true, data: data as Project };
}

export async function updateProject(
  id: string,
  input: ProjectFormInput
): Promise<ActionResult<Project>> {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("projects")
    .update(toDbPayload(parsed.data))
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateProject:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/projects");
  return { success: true, data: data as Project };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteProject:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/projects");
  return { success: true };
}
