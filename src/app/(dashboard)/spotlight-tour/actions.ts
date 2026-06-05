"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export type SpotlightTourActionResult =
  | { success: true }
  | { success: false; error: string };

const REVALIDATE_PATHS = ["/", "/settings", "/projects"] as const;

function revalidateSpotlightTourPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function completeProjectTour(): Promise<SpotlightTourActionResult> {
  const prefs = await getOrCreateUserPreferences();
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({ project_tour_completed: true })
    .eq("id", prefs.id)
    .eq("user_id", userId);

  if (error) {
    console.error("completeProjectTour:", error);
    return { success: false, error: error.message };
  }

  revalidateSpotlightTourPaths();
  return { success: true };
}
