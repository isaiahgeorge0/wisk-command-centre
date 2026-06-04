import type { Project, ProjectFormInput } from "@/lib/projects/types";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects/types";

export const EMPTY_PROJECT_FORM: ProjectFormInput = {
  client_name: "",
  service_type: "",
  status: "active",
  next_action: "",
  deadline: "",
  value: "",
  notes: "",
  site_url: "",
};

export function projectToFormInput(project: Project): ProjectFormInput {
  return {
    client_name: project.client_name,
    service_type: project.service_type ?? "",
    status: isProjectStatus(project.status) ? project.status : "active",
    next_action: project.next_action ?? "",
    deadline: project.deadline ?? "",
    value: project.value != null ? String(project.value) : "",
    notes: project.notes ?? "",
    site_url: project.site_url ?? "",
  };
}

function isProjectStatus(status: string | null): status is ProjectStatus {
  return PROJECT_STATUSES.includes(status as ProjectStatus);
}
