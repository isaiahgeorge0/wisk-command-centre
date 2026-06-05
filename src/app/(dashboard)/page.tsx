import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { getIdeas } from "@/app/(dashboard)/ideas/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getLeads } from "@/app/(dashboard)/leads/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { buildOverviewSnapshot } from "@/lib/overview/selectors";

export default async function OverviewPage() {
  const [projects, tasks, goals, ideas, leads, contentPosts] = await Promise.all([
    getProjects(),
    getTasks(),
    getGoals(),
    getIdeas(),
    getLeads(),
    getContentPosts(),
  ]);

  const snapshot = buildOverviewSnapshot(
    projects,
    tasks,
    goals,
    ideas,
    leads,
    contentPosts
  );

  return <OverviewPageClient snapshot={snapshot} />;
}
