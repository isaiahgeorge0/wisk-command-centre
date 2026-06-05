import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { ProjectsPageClient } from "@/components/projects/projects-page-client";

export default async function ProjectsPage() {
  const [projects, tasks] = await Promise.all([getProjects(), getTasks()]);

  return <ProjectsPageClient initialProjects={projects} initialTasks={tasks} />;
}
