import type { Project } from "@/lib/projects/types";

export function getRecentProjectTypes(
  projects: Project[],
  limit = 3
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const sorted = [...projects].sort((a, b) => {
    const aTime = a.updated_at ?? a.created_at;
    const bTime = b.updated_at ?? b.created_at;
    return bTime.localeCompare(aTime);
  });

  for (const project of sorted) {
    const type = project.service_type?.trim();
    if (!type) continue;

    const key = type.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(type);

    if (result.length >= limit) break;
  }

  return result;
}

export function buildProjectTypeDatalistOptions(
  query: string,
  recentProjectTypes: string[],
  savedProjectTypes: string[]
): string[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    const recent = recentProjectTypes.slice(0, 3);
    const recentKeys = new Set(recent.map((type) => type.toLowerCase()));
    const rest = savedProjectTypes.filter(
      (type) => !recentKeys.has(type.toLowerCase())
    );
    return [...recent, ...rest];
  }

  const recentMatches = recentProjectTypes.filter((type) =>
    type.toLowerCase().includes(normalizedQuery)
  );
  const recentKeys = new Set(recentMatches.map((type) => type.toLowerCase()));
  const otherMatches = savedProjectTypes.filter(
    (type) =>
      type.toLowerCase().includes(normalizedQuery) &&
      !recentKeys.has(type.toLowerCase())
  );

  return [...recentMatches, ...otherMatches];
}
