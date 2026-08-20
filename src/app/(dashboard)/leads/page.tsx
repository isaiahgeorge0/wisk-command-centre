import { getLeadsWithActivity } from "@/app/(dashboard)/leads/actions";
import { LeadsPageClient } from "@/components/leads/leads-page-client";
import { hasAIAccess, hasResearchAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function LeadsPage() {
  const { supabase, userId } = await getScopedSupabase();
  const admin = createAdminClient();

  const [{ data: prefs }, leads] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("ai_access")
      .eq("user_id", userId)
      .maybeSingle(),
    getLeadsWithActivity(),
  ]);

  const canAccessWinston = await hasAIAccess(
    userId,
    admin,
    prefs?.ai_access ?? false
  );
  const canAccessResearch = await hasResearchAccess(userId, admin);

  return (
    <LeadsPageClient
      initialLeads={leads}
      canAccessWinston={canAccessWinston}
      canAccessResearch={canAccessResearch}
    />
  );
}
