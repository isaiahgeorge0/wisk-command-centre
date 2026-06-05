import type { Project } from "@/lib/projects/types";

type ProjectDisplayFields = Pick<Project, "project_name" | "client_name">;

export function getProjectDisplayName(
  project: ProjectDisplayFields
): string {
  return project.project_name;
}

export function getProjectClientLabel(
  project: ProjectDisplayFields
): string | null {
  const client = project.client_name?.trim();
  return client ? client : null;
}
