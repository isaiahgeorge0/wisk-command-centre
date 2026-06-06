import type { Project, ProjectFilters } from "./types";

// ─── Date helper ─────────────────────────────────────────────────────────────

function toDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Filter + sort ────────────────────────────────────────────────────────────

export function applyProjectFilters(
  projects: Project[],
  filters: ProjectFilters
): Project[] {
  let result = projects.filter((project) => {
    // Search — matches project name, client name, or service type
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchesName = project.project_name.toLowerCase().includes(q);
      const matchesClient = project.client_name?.toLowerCase().includes(q) ?? false;
      const matchesType = project.service_type?.toLowerCase().includes(q) ?? false;
      if (!matchesName && !matchesClient && !matchesType) return false;
    }

    // Status
    if (filters.status !== "all" && project.status !== filters.status) return false;

    // Service type
    if (
      filters.service_type !== "all" &&
      project.service_type !== filters.service_type
    ) return false;

    return true;
  });

  // Sort
  const dir = filters.sort_direction === "asc" ? 1 : -1;

  result = [...result].sort((a, b) => {
    switch (filters.sort_key) {
      case "deadline": {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return dir * (toDateOnly(a.deadline).getTime() - toDateOnly(b.deadline).getTime());
      }
      case "value": {
        const av = a.value ?? -1;
        const bv = b.value ?? -1;
        return dir * (av - bv);
      }
      case "project_name": {
        return dir * a.project_name.localeCompare(b.project_name);
      }
      case "updated_at": {
        return dir * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
      }
      case "created_at":
      default: {
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    }
  });

  return result;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

export type GroupedProjects = {
  active: Project[];
  paused: Project[];
  completedAndArchived: Project[];
};

export function groupProjects(projects: Project[]): GroupedProjects {
  return {
    active: projects.filter((p) => p.status === "active"),
    paused: projects.filter((p) => p.status === "paused"),
    completedAndArchived: projects.filter(
      (p) => p.status === "completed" || p.status === "archived"
    ),
  };
}

// ─── Active filter count ──────────────────────────────────────────────────────

export function countActiveProjectFilters(filters: ProjectFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.status !== "all") count++;
  if (filters.service_type !== "all") count++;
  return count;
}

// ─── Unique service types for filter dropdown ─────────────────────────────────

export function getUniqueServiceTypes(projects: Project[]): string[] {
  const types = projects
    .map((p) => p.service_type)
    .filter((t): t is string => !!t);
  return [...new Set(types)].sort();
}
