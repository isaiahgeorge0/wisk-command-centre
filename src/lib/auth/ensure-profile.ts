import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const name =
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      name,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("ensureUserProfile:", error);
    throw new Error("Failed to ensure user profile");
  }
}
