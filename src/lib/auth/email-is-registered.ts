import { createAdminClient } from "@/lib/supabase/admin";

/** Returns true if the email belongs to an existing WISK account. */
export async function emailIsRegistered(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await admin
    .from("users")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (error) {
    console.error("emailIsRegistered:", error);
    return false;
  }

  return data !== null;
}
