import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import {
  DEFAULT_FIELD_VISIBILITY,
  DEFAULT_SERVICE_TYPES,
} from "@/lib/preferences/defaults";
import {
  mergeFieldVisibility,
  mergeServiceTypes,
  rowToUserPreferences,
  type UserPreferences,
  type UserPreferencesRow,
} from "@/lib/preferences/types";

export async function getOrCreateUserPreferences(): Promise<UserPreferences> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: existing, error: selectError } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    return rowToUserPreferences(existing as UserPreferencesRow);
  }

  const { data: created, error: insertError } = await supabase
    .from("user_preferences")
    .insert({
      user_id: userId,
      field_visibility: DEFAULT_FIELD_VISIBILITY,
      service_types: [...DEFAULT_SERVICE_TYPES],
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return rowToUserPreferences(created as UserPreferencesRow);
}

export function parseStoredPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    fieldVisibility: mergeFieldVisibility(row.field_visibility),
    serviceTypes: mergeServiceTypes(row.service_types),
    onboardingCompleted: row.onboarding_completed ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
