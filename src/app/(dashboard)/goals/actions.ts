"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { emptyToNull, parseGoalNumber } from "@/lib/goals/format";
import type { ActionResult, Goal, GoalFormInput } from "@/lib/goals/types";
import { GOAL_STATUSES } from "@/lib/goals/types";

const goalFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  target: z
    .string()
    .min(1, "Target is required")
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    }, "Target must be greater than 0"),
  unit: z.string().trim().min(1, "Unit is required"),
  current: z.string().optional(),
  category: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(GOAL_STATUSES).optional(),
});

function toDbPayload(input: GoalFormInput, includeCurrent = true) {
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    target: parseGoalNumber(input.target),
    unit: input.unit.trim(),
    category: emptyToNull(input.category),
    deadline: emptyToNull(input.deadline),
    status: input.status ?? "active",
  };

  if (includeCurrent) {
    payload.current = parseGoalNumber(input.current) ?? 0;
  }

  return payload;
}

export async function getGoals(): Promise<Goal[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getGoals:", error);
    return [];
  }

  return (data ?? []) as Goal[];
}

export async function createGoal(
  input: GoalFormInput
): Promise<ActionResult<Goal>> {
  const parsed = goalFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      current: 0,
      ...toDbPayload({ ...parsed.data, status: parsed.data.status ?? "active" }, false),
    })
    .select()
    .single();

  if (error) {
    console.error("createGoal:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/goals");
  return { success: true, data: data as Goal };
}

export async function updateGoal(
  id: string,
  input: GoalFormInput
): Promise<ActionResult<Goal>> {
  const parsed = goalFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("goals")
    .update(toDbPayload(parsed.data))
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateGoal:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/goals");
  return { success: true, data: data as Goal };
}

export async function updateGoalCurrent(
  id: string,
  current: number
): Promise<ActionResult<Goal>> {
  if (!Number.isFinite(current) || current < 0) {
    return { success: false, error: "Current must be a valid non-negative number" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("goals")
    .update({ current })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateGoalCurrent:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/goals");
  return { success: true, data: data as Goal };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteGoal:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/goals");
  return { success: true };
}
