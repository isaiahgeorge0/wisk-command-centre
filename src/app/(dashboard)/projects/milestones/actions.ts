"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type {
  MilestoneActionResult,
  MilestoneFormInput,
  ProjectMilestone,
} from "@/lib/projects/milestones/types";

const milestoneFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: z.string().trim().min(1, "Date is required"),
});

function revalidateMilestonePaths() {
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/");
}

async function assertProjectOwnership(projectId: string, userId: string) {
  const { supabase } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Project not found");
}

export async function getMilestonesForProject(
  projectId: string
): Promise<ProjectMilestone[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getMilestonesForProject:", error);
    return [];
  }

  return (data ?? []) as ProjectMilestone[];
}

export async function getAllMilestones(): Promise<ProjectMilestone[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAllMilestones:", error);
    return [];
  }

  return (data ?? []) as ProjectMilestone[];
}

export async function createMilestone(
  projectId: string,
  input: MilestoneFormInput
): Promise<MilestoneActionResult<ProjectMilestone>> {
  const parsed = milestoneFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  try {
    await assertProjectOwnership(projectId, userId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Project not found",
    };
  }

  const { data, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: projectId,
      user_id: userId,
      title: parsed.data.title,
      date: parsed.data.date,
      completed: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createMilestone:", error);
    return { success: false, error: error.message };
  }

  revalidateMilestonePaths();
  return { success: true, data: data as ProjectMilestone };
}

export async function toggleMilestone(
  id: string,
  completed: boolean
): Promise<MilestoneActionResult<ProjectMilestone>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("project_milestones")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("toggleMilestone:", error);
    return { success: false, error: error.message };
  }

  revalidateMilestonePaths();
  return { success: true, data: data as ProjectMilestone };
}

export async function deleteMilestone(id: string): Promise<MilestoneActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("project_milestones")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteMilestone:", error);
    return { success: false, error: error.message };
  }

  revalidateMilestonePaths();
  return { success: true };
}
