import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { getIdeas } from "@/app/(dashboard)/ideas/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getLeads } from "@/app/(dashboard)/leads/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import { buildOverviewSnapshot } from "@/lib/overview/selectors";

export default async function OverviewPage() {
  const [projects, tasks, goals, ideas, leads, contentPosts, profile, preferences] =
    await Promise.all([
      getProjects(),
      getTasks(),
      getGoals(),
      getIdeas(),
      getLeads(),
      getContentPosts(),
      getUserProfile(),
      getOrCreateUserPreferences(),
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

  return <OverviewPageClient snapshot={snapshot} />;
}
