import { getIntegrations } from "@/app/(dashboard)/settings/integrations/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { ProjectsPageClient } from "@/components/projects/projects-page-client";

export default async function ProjectsPage() {
  const [projects, tasks, integrations] = await Promise.all([
    getProjects(),
    getTasks(),
    getIntegrations(),
  ]);

  return (
    <ProjectsPageClient
      initialProjects={projects}
      initialTasks={tasks}
      integrations={integrations}
    />
  );
}
