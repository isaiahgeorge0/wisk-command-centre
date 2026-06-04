import { getProjects } from "@/app/projects/actions";
import { ProjectsPageClient } from "@/components/projects/projects-page-client";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return <ProjectsPageClient initialProjects={projects} />;
}
