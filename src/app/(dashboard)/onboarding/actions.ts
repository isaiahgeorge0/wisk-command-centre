"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export type OnboardingActionResult =
  | { success: true }
  | { success: false; error: string };

const REVALIDATE_PATHS = ["/", "/settings"] as const;

function revalidateOnboardingPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function completeOnboarding(): Promise<OnboardingActionResult> {
  const prefs = await getOrCreateUserPreferences();
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({ onboarding_completed: true })
    .eq("id", prefs.id)
    .eq("user_id", userId);

  if (error) {
    console.error("completeOnboarding:", error);
    return { success: false, error: error.message };
  }

  revalidateOnboardingPaths();
  return { success: true };
}

export async function resetOnboarding(): Promise<OnboardingActionResult> {
  const prefs = await getOrCreateUserPreferences();
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({ onboarding_completed: false })
    .eq("id", prefs.id)
    .eq("user_id", userId);

  if (error) {
    console.error("resetOnboarding:", error);
    return { success: false, error: error.message };
  }

  revalidateOnboardingPaths();
  return { success: true };
}
