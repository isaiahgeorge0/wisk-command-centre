"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import type { ThemePreference } from "@/lib/preferences/types";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export type WelcomeActionResult =
  | { success: true }
  | { success: false; error: string };

export async function completePersonalisation(input: {
  displayName: string;
  themePreference: ThemePreference;
}): Promise<WelcomeActionResult> {
  const trimmedName = input.displayName.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter your name." };
  }

  await getAuthContext();
  await getOrCreateUserPreferences();
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      display_name: trimmedName,
      theme_preference: input.themePreference,
      personalisation_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("completePersonalisation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/welcome");
  revalidatePath("/settings");
  redirect("/");
}
