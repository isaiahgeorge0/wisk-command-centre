import { getAuthContext } from "@/lib/auth/get-auth-context";

export async function getScopedSupabase() {
  const { supabase, user } = await getAuthContext();
  return { supabase, userId: user.id };
}
