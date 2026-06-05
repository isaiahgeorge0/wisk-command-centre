"use server";

import { revalidatePath } from "next/cache";

import type { ChangelogEntry } from "@/lib/changelog/types";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import { createClient } from "@/lib/supabase/server";

export async function getPublishedChangelog(
  limit = 10
): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("changelog_entries")
    .select("id, title, description, type, published_at, created_by")
    .lte("published_at", now)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getPublishedChangelog:", error);
    return [];
  }

  return (data ?? []) as ChangelogEntry[];
}

export async function getUnreadChangelogCount(): Promise<number> {
  const preferences = await getOrCreateUserPreferences();
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("changelog_entries")
    .select("id", { count: "exact", head: true })
    .lte("published_at", now);

  if (preferences.lastSeenChangelog) {
    query = query.gt("published_at", preferences.lastSeenChangelog);
  }

  const { count, error } = await query;

  if (error) {
    console.error("getUnreadChangelogCount:", error);
    return 0;
  }

  return count ?? 0;
}

export async function markChangelogSeen(): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      last_seen_changelog: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("markChangelogSeen:", error);
    return;
  }

  revalidatePath("/");
}
