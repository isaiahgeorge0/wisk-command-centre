import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { getIdeas } from "@/app/(dashboard)/ideas/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getLeads } from "@/app/(dashboard)/leads/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import { buildOverviewSnapshot } from "@/lib/overview/selectors";
import { buildSuggestions } from "@/lib/suggestions";

export default async function OverviewPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [projects, tasks, goals, ideas, leads, contentPosts, profile, preferences, suggestions] =
    await Promise.all([
      getProjects(),
      getTasks(),
      getGoals(),
      getIdeas(),
      getLeads(),
      getContentPosts(),
      getUserProfile(),
      getOrCreateUserPreferences(),
      buildSuggestions(userId, supabase),
    ]);

  const displayName = resolveDisplayName({
    displayName: preferences.displayName,
    profileName: profile.name,
    email: profile.email,
  });

  const snapshot = buildOverviewSnapshot(
    projects,
    tasks,
    goals,
    ideas,
    leads,
    contentPosts,
    new Date(),
    displayName
  );

  return <OverviewPageClient snapshot={snapshot} suggestions={suggestions} />;
}
