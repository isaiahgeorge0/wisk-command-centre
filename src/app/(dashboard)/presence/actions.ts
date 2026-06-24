"use server";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export async function updateLandlordLastSeen(): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();
  await supabase
    .from("user_preferences")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId);
}
