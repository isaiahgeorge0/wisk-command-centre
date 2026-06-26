"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export async function dismissUpgradeBanner(): Promise<void> {
  const { supabase, userId } = await getScopedSupabase();

  await supabase
    .from("user_preferences")
    .update({ upgrade_banner_dismissed_at: new Date().toISOString() })
    .eq("user_id", userId);

  revalidatePath("/");
}
