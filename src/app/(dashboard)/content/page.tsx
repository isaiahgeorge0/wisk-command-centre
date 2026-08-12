import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { ContentPageClient } from "@/components/content/content-page-client";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { filterContentGoals } from "@/lib/content/selectors";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ContentPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [{ data: prefs }, posts, goals] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("ai_access")
      .eq("user_id", userId)
      .maybeSingle(),
    getContentPosts(),
    getGoals(),
  ]);

  const contentGoals = filterContentGoals(goals);
  const canAccessWinston = await hasAIAccess(
    userId,
    createAdminClient(),
    prefs?.ai_access ?? false
  );

  return (
    <ContentPageClient
      initialPosts={posts}
      contentGoals={contentGoals}
      canAccessWinston={canAccessWinston}
    />
  );
}
