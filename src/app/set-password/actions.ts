"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ThemePreference } from "@/lib/preferences/types";
import { formatUsername, validateUsername } from "@/lib/users/username";

export type AccountSetupResult =
  | { success: true }
  | { success: false; error: string };

export async function updateAccountSetup(input: {
  displayName: string;
  username: string;
  themePreference: ThemePreference;
}): Promise<AccountSetupResult> {
  const trimmedName = input.displayName.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter your name." };
  }

  const usernameValidation = validateUsername(input.username);
  if (!usernameValidation.valid) {
    return {
      success: false,
      error: usernameValidation.error ?? "Invalid username.",
    };
  }

  const lower = formatUsername(input.username);
  const { supabase, userId } = await getScopedSupabase();

  // Check username availability
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("username", lower)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "That username is already taken. Please choose another." };
  }

  const { error: usersError } = await supabase
    .from("users")
    .update({ name: trimmedName, username: lower })
    .eq("id", userId);

  if (usersError) {
    if (usersError.code === "23505") {
      return { success: false, error: "That username is already taken. Please choose another." };
    }
    console.error("updateAccountSetup users:", usersError);
    return { success: false, error: "Could not save your details. Please try again." };
  }

  const { error: prefsError } = await supabase
    .from("user_preferences")
    .update({
      display_name: trimmedName,
      theme_preference: input.themePreference,
      personalisation_completed: true,
      username_set: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (prefsError) {
    console.error("updateAccountSetup prefs:", prefsError);
    return { success: false, error: "Could not save your preferences. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}
