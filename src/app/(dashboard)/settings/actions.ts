"use server";

import { revalidatePath } from "next/cache";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import {
  normalizeServiceTypes,
  type FieldVisibility,
  type ThemePreference,
} from "@/lib/preferences/types";
import { createClient } from "@/lib/supabase/server";
import { formatUsername, validateUsername } from "@/lib/users/username";

const MIN_PASSWORD_LENGTH = 8;

const SECTION_PATHS = [
  "/",
  "/projects",
  "/tasks",
  "/goals",
  "/ideas",
  "/settings",
] as const;

function revalidateApp() {
  for (const path of SECTION_PATHS) {
    revalidatePath(path);
  }
}

export type SettingsActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateProfileName(
  name: string
): Promise<SettingsActionResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Name is required" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error: profileError } = await supabase
    .from("users")
    .update({ name: trimmed })
    .eq("id", userId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { name: trimmed },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  revalidateApp();
  return { success: true };
}

export async function updateDisplayName(
  displayName: string
): Promise<SettingsActionResult> {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return { success: false, error: "Display name is required" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      display_name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateApp();
  return { success: true };
}

export async function updateThemePreference(
  theme: ThemePreference
): Promise<SettingsActionResult> {
  if (theme !== "dark" && theme !== "light") {
    return { success: false, error: "Invalid theme preference" };
  }

  await getOrCreateUserPreferences();
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      theme_preference: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<SettingsActionResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "New passwords do not match" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Not signed in" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: "Current password is incorrect" };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function updateFieldVisibility(
  partial: Partial<FieldVisibility>
): Promise<SettingsActionResult> {
  const prefs = await getOrCreateUserPreferences();
  const merged: FieldVisibility = {
    projects: { ...prefs.fieldVisibility.projects, ...partial.projects },
    tasks: { ...prefs.fieldVisibility.tasks, ...partial.tasks },
    goals: { ...prefs.fieldVisibility.goals, ...partial.goals },
    ideas: { ...prefs.fieldVisibility.ideas, ...partial.ideas },
  };

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      field_visibility: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateApp();
  return { success: true };
}

export async function updateServiceTypes(
  types: string[]
): Promise<SettingsActionResult> {
  const normalized = normalizeServiceTypes(types);
  if (normalized.length === 0) {
    return { success: false, error: "Keep at least one project type" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      service_types: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateApp();
  return { success: true };
}

export type ServiceTypeUsage = {
  projectName: string;
  id: string;
};

export async function getProjectsUsingServiceType(
  serviceType: string
): Promise<ServiceTypeUsage[]> {
  const { supabase, userId } = await getScopedSupabase();
  const trimmed = serviceType.trim();

  const { data, error } = await supabase
    .from("projects")
    .select("id, project_name")
    .eq("user_id", userId)
    .eq("service_type", trimmed)
    .order("project_name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    projectName: row.project_name,
  }));
}

export async function removeServiceType(
  serviceType: string
): Promise<SettingsActionResult> {
  const prefs = await getOrCreateUserPreferences();
  const trimmed = serviceType.trim();

  const affected = await getProjectsUsingServiceType(trimmed);
  if (affected.length > 0) {
    const names = affected.map((p) => p.projectName).join(", ");
    return {
      success: false,
      error: `Cannot delete "${trimmed}" — used by: ${names}`,
    };
  }

  const next = prefs.serviceTypes.filter(
    (t) => t.toLowerCase() !== trimmed.toLowerCase()
  );

  if (next.length === prefs.serviceTypes.length) {
    return { success: false, error: "Project type not found" };
  }

  return updateServiceTypes(next);
}

export async function addServiceType(
  serviceType: string
): Promise<SettingsActionResult> {
  const trimmed = serviceType.trim();
  if (!trimmed) {
    return { success: false, error: "Enter a project type name" };
  }

  const prefs = await getOrCreateUserPreferences();
  const exists = prefs.serviceTypes.some(
    (t) => t.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) {
    return { success: false, error: "That project type already exists" };
  }

  return updateServiceTypes([...prefs.serviceTypes, trimmed]);
}

export async function reorderServiceType(
  serviceType: string,
  direction: "up" | "down"
): Promise<SettingsActionResult> {
  const prefs = await getOrCreateUserPreferences();
  const index = prefs.serviceTypes.findIndex(
    (t) => t.toLowerCase() === serviceType.trim().toLowerCase()
  );

  if (index < 0) {
    return { success: false, error: "Project type not found" };
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= prefs.serviceTypes.length) {
    return { success: true };
  }

  const next = [...prefs.serviceTypes];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item!);

  return updateServiceTypes(next);
}

export async function checkUsernameAvailable(
  username: string
): Promise<SettingsActionResult<{ available: boolean }>> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Invalid username" };
  }

  const { supabase } = await getScopedSupabase();
  const lower = formatUsername(username);

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .ilike("username", lower)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { available: data === null } };
}

export async function setUsername(
  username: string
): Promise<SettingsActionResult> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Invalid username" };
  }

  const lower = formatUsername(username);
  const { supabase, userId } = await getScopedSupabase();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("username", lower)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "This username is already taken" };
  }

  const { error: usersError } = await supabase
    .from("users")
    .update({ username: lower })
    .eq("id", userId);

  if (usersError) {
    if (usersError.code === "23505") {
      return { success: false, error: "This username is already taken" };
    }
    return { success: false, error: usersError.message };
  }

  const { error: prefsError } = await supabase
    .from("user_preferences")
    .update({ username_set: true })
    .eq("user_id", userId);

  if (prefsError) {
    console.error("setUsername prefs:", prefsError);
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateWinstonFeatureToggle(
  feature: "email_picks",
  enabled: boolean
): Promise<SettingsActionResult> {
  if (feature !== "email_picks") {
    return { success: false, error: "Invalid feature" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      winston_email_picks_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
