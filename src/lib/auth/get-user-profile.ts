import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
};

export async function getUserProfile(): Promise<UserProfile> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load user profile");
  }

  return data;
}
