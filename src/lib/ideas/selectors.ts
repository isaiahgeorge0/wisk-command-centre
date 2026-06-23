import type { Idea, IdeaFilters, IdeaStatus } from "@/lib/ideas/types";
import { IDEA_STATUSES } from "@/lib/ideas/types";

export function normalizeIdeaStatus(status: string | null): IdeaStatus {
  if (status && IDEA_STATUSES.includes(status as IdeaStatus)) {
    return status as IdeaStatus;
  }
  return "new";
}

function matchesIdeaSearch(idea: Idea, query: string): boolean {
  const q = query.toLowerCase();
  if (idea.title.toLowerCase().includes(q)) return true;
  return idea.description?.toLowerCase().includes(q) ?? false;
}

export function applyIdeaFilters(ideas: Idea[], filters: IdeaFilters): Idea[] {
  const query = filters.search.trim();

  return ideas.filter((idea) => {
    if (query && !matchesIdeaSearch(idea, query)) return false;

    if (filters.status !== "all") {
      if (normalizeIdeaStatus(idea.status) !== filters.status) return false;
    }

    if (filters.category !== "all") {
      if ((idea.category ?? "") !== filters.category) return false;
    }

    return true;
  });
}

export function countActiveIdeaFilters(filters: IdeaFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.status !== "all") count++;
  if (filters.category !== "all") count++;
  return count;
}

export function getUniqueIdeaCategories(ideas: Idea[]): string[] {
  const categories = ideas
    .map((idea) => idea.category)
    .filter((category): category is string => Boolean(category?.trim()));
  return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
}
