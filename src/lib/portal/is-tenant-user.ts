import { createAdminClient } from "@/lib/supabase/admin";

export async function isTenantPortalUser(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id")
    .eq("portal_user_id", userId)
    .eq("portal_enabled", true)
    .maybeSingle();

  return Boolean(data);
}
