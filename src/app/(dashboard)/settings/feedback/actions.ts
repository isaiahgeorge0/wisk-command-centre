"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FeedbackType } from "@/lib/feedback/types";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export type FeedbackActionResult =
  | { success: true }
  | { success: false; error: string };

const feedbackSchema = z.object({
  type: z.enum(["bug_report", "feature_request", "general"]),
  message: z
    .string()
    .trim()
    .min(10, "Please enter at least 10 characters"),
});

export async function submitFeedback(
  type: FeedbackType,
  message: string
): Promise<FeedbackActionResult> {
  const parsed = feedbackSchema.safeParse({ type, message });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid feedback",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    type: parsed.data.type,
    message: parsed.data.message,
    status: "new",
  });

  if (error) {
    console.error("submitFeedback:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function dismissFeedbackWelcome(): Promise<FeedbackActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      feedback_welcome_shown: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("dismissFeedbackWelcome:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}
