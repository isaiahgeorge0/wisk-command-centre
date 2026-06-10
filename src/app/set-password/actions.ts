"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ThemePreference } from "@/lib/preferences/types";

export type AccountSetupResult =
  | { success: true }
  | { success: false; error: string };

export async function updateAccountSetup(input: {
  displayName: string;
  themePreference: ThemePreference;
}): Promise<AccountSetupResult> {
  const trimmedName = input.displayName.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter your name." };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error: usersError } = await supabase
    .from("users")
    .update({ name: trimmedName })
    .eq("id", userId);

  if (usersError) {
    console.error("updateAccountSetup users:", usersError);
    return { success: false, error: "Could not save your details. Please try again." };
  }

  const { error: prefsError } = await supabase
    .from("user_preferences")
    .update({
      display_name: trimmedName,
      theme_preference: input.themePreference,
      personalisation_completed: true,
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
