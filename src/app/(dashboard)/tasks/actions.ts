"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { projectIdToDb } from "@/lib/tasks/form";
import { emptyToNull } from "@/lib/tasks/format";
import type {
  ActionResult,
  ProjectOption,
  TaskFormInput,
  TaskWithProject,
} from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";

const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  priority: z.enum(TASK_PRIORITIES),
  project_id: z.string().optional(),
  due_date: z.string().optional(),
});

type TaskRow = TaskWithProject & {
  projects: { client_name: string } | null;
};

function mapTaskRow(row: TaskRow): TaskWithProject {
  const { projects, ...task } = row;
  return {
    ...task,
    project_name: projects?.client_name ?? null,
  };
}

function toDbPayload(input: TaskFormInput) {
  return {
    title: input.title.trim(),
    priority: input.priority,
    project_id: projectIdToDb(input.project_id),
    due_date: emptyToNull(input.due_date),
  };
}

export async function getTasks(): Promise<TaskWithProject[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(client_name)")
    .eq("user_id", userId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTasks:", error);
    return [];
  }

  return ((data ?? []) as TaskRow[]).map(mapTaskRow);
}

export async function getProjectsForSelect(): Promise<ProjectOption[]> {
  const projects = await getProjects();
  return projects.map((p) => ({
    id: p.id,
    client_name: p.client_name,
  }));
}

export async function createTask(
  input: TaskFormInput
): Promise<ActionResult<TaskWithProject>> {
  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      completed: false,
      ...toDbPayload(parsed.data),
    })
    .select("*, projects(client_name)")
    .single();

  if (error) {
    console.error("createTask:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true, data: mapTaskRow(data as TaskRow) };
}

export async function updateTask(
  id: string,
  input: TaskFormInput
): Promise<ActionResult<TaskWithProject>> {
  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("tasks")
    .update(toDbPayload(parsed.data))
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, projects(client_name)")
    .single();

  if (error) {
    console.error("updateTask:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true, data: mapTaskRow(data as TaskRow) };
}

export async function toggleTaskCompleted(
  id: string,
  completed: boolean
): Promise<ActionResult<TaskWithProject>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, projects(client_name)")
    .single();

  if (error) {
    console.error("toggleTaskCompleted:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true, data: mapTaskRow(data as TaskRow) };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteTask:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true };
}
