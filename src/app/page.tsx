import { getIdeas } from "@/app/ideas/actions";
import { getGoals } from "@/app/goals/actions";
import { getProjects } from "@/app/projects/actions";
import { getTasks } from "@/app/tasks/actions";
import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { buildOverviewSnapshot } from "@/lib/overview/selectors";

export default async function OverviewPage() {
  const [projects, tasks, goals, ideas] = await Promise.all([
    getProjects(),
    getTasks(),
    getGoals(),
    getIdeas(),
  ]);

  const snapshot = buildOverviewSnapshot(projects, tasks, goals, ideas);

  return <OverviewPageClient snapshot={snapshot} />;
}
