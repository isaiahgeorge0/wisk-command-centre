import {
  DEFAULT_FIELD_VISIBILITY,
  DEFAULT_SERVICE_TYPES,
} from "@/lib/preferences/defaults";

export type ProjectFieldVisibility = {
  serviceType: boolean;
  deadline: boolean;
  value: boolean;
  nextAction: boolean;
  siteUrl: boolean;
  notes: boolean;
};

export type TaskFieldVisibility = {
  priorityBadge: boolean;
  projectTag: boolean;
  dueDate: boolean;
};

export type GoalFieldVisibility = {
  categoryTag: boolean;
  deadline: boolean;
  quickControls: boolean;
};

export type IdeaFieldVisibility = {
  categoryTag: boolean;
  statusBadge: boolean;
};

export type FieldVisibility = {
  projects: ProjectFieldVisibility;
  tasks: TaskFieldVisibility;
  goals: GoalFieldVisibility;
  ideas: IdeaFieldVisibility;
};

export type ThemePreference = "dark" | "light";

export type UserPreferencesRow = {
  id: string;
  user_id: string;
  field_visibility: unknown;
  service_types: unknown;
  onboarding_completed: boolean;
  project_tour_completed: boolean;
  personalisation_completed: boolean;
  display_name: string | null;
  theme_preference: string;
  feedback_welcome_shown: boolean;
  last_seen_changelog: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferences = {
  id: string;
  userId: string;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
  onboardingCompleted: boolean;
  projectTourCompleted: boolean;
  personalisationCompleted: boolean;
  displayName: string | null;
  themePreference: ThemePreference;
  feedbackWelcomeShown: boolean;
  lastSeenChangelog: string | null;
  createdAt: string;
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readBool(
  source: Record<string, unknown> | null,
  key: string,
  fallback: boolean
): boolean {
  if (!source) return fallback;
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
}

function mergeSection<T extends Record<string, boolean>>(
  stored: unknown,
  defaults: T
): T {
  const record = asRecord(stored);
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    result[key] = readBool(record, key as string, defaults[key]) as T[keyof T];
  }
  return result;
}

export function mergeFieldVisibility(stored: unknown): FieldVisibility {
  const root = asRecord(stored);
  return {
    projects: mergeSection(
      root?.projects,
      DEFAULT_FIELD_VISIBILITY.projects
    ),
    tasks: mergeSection(root?.tasks, DEFAULT_FIELD_VISIBILITY.tasks),
    goals: mergeSection(root?.goals, DEFAULT_FIELD_VISIBILITY.goals),
    ideas: mergeSection(root?.ideas, DEFAULT_FIELD_VISIBILITY.ideas),
  };
}

export function mergeServiceTypes(stored: unknown): string[] {
  if (!Array.isArray(stored)) {
    return [...DEFAULT_SERVICE_TYPES];
  }
  const types = stored
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return types.length > 0 ? types : [...DEFAULT_SERVICE_TYPES];
}

export function normalizeServiceTypes(types: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const type of types) {
    const trimmed = type.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === "light" ? "light" : "dark";
}

export function rowToUserPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    fieldVisibility: mergeFieldVisibility(row.field_visibility),
    serviceTypes: mergeServiceTypes(row.service_types),
    onboardingCompleted: row.onboarding_completed ?? false,
    projectTourCompleted: row.project_tour_completed ?? false,
    personalisationCompleted: row.personalisation_completed ?? false,
    displayName: row.display_name ?? null,
    themePreference: normalizeThemePreference(row.theme_preference),
    feedbackWelcomeShown: row.feedback_welcome_shown ?? false,
    lastSeenChangelog: row.last_seen_changelog ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
