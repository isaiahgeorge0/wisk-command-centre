/**
 * Winston conversation scopes (ai_conversations.scope_key).
 *
 * Page-level: one durable thread per section (`notes`, `calendar`, …).
 * Record-level going forward: composite keys (`lead:<uuid>`). Notes still use
 * `note_id` (predates this pattern) — do not add more per-type columns.
 * Global sidebar: `global`, isolated from unscoped Winston Chat threads.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const WINSTON_PAGE_SCOPE_KEYS = [
  "global",
  "notes",
  "leads",
  "properties",
  "projects",
  "tasks",
  "goals",
  "ideas",
  "calendar",
  "content-calendar",
  "research",
] as const;

export type WinstonPageScopeKey = (typeof WINSTON_PAGE_SCOPE_KEYS)[number];

export const WINSTON_RECORD_SCOPE_ENTITIES = [
  "lead",
  "project",
  "task",
  "goal",
  "idea",
  "property",
] as const;

export type WinstonRecordScopeEntity =
  (typeof WINSTON_RECORD_SCOPE_ENTITIES)[number];

export type WinstonPageSection = Exclude<WinstonPageScopeKey, "global">;

/** Maps brainstorm UI surface → durable scope_key. */
export const BRAINSTORM_SURFACE_SCOPE: Record<
  "calendar" | "content",
  WinstonPageScopeKey
> = {
  calendar: "calendar",
  content: "content-calendar",
};

export const SCOPE_KEY_TITLES: Record<WinstonPageScopeKey, string> = {
  global: "Winston",
  notes: "Notes brainstorm",
  leads: "Leads brainstorm",
  properties: "Properties brainstorm",
  projects: "Projects brainstorm",
  tasks: "Tasks brainstorm",
  goals: "Goals brainstorm",
  ideas: "Ideas brainstorm",
  calendar: "Calendar brainstorm",
  "content-calendar": "Content brainstorm",
  research: "Research chat",
};

const RECORD_ENTITY_TITLES: Record<WinstonRecordScopeEntity, string> = {
  lead: "Lead",
  project: "Project",
  task: "Task",
  goal: "Goal",
  idea: "Idea",
  property: "Property",
};

export function isWinstonPageScopeKey(
  value: string
): value is WinstonPageScopeKey {
  return (WINSTON_PAGE_SCOPE_KEYS as readonly string[]).includes(value);
}

export function parseWinstonRecordScope(
  value: string
): { entity: WinstonRecordScopeEntity; recordId: string } | null {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  const entity = value.slice(0, colon);
  const recordId = value.slice(colon + 1);
  if (
    !(WINSTON_RECORD_SCOPE_ENTITIES as readonly string[]).includes(entity) ||
    !UUID_RE.test(recordId)
  ) {
    return null;
  }
  return { entity: entity as WinstonRecordScopeEntity, recordId };
}

export function recordScopeKey(
  entity: WinstonRecordScopeEntity,
  recordId: string
): string {
  return `${entity}:${recordId}`;
}

export function isWinstonScopeKey(value: string): boolean {
  return isWinstonPageScopeKey(value) || parseWinstonRecordScope(value) !== null;
}

export function getScopeKeyTitle(scopeKey: string): string {
  if (isWinstonPageScopeKey(scopeKey)) return SCOPE_KEY_TITLES[scopeKey];
  const parsed = parseWinstonRecordScope(scopeKey);
  if (parsed) return `${RECORD_ENTITY_TITLES[parsed.entity]} brainstorm`;
  return "Winston";
}

/** @deprecated Use WinstonPageScopeKey — kept so existing imports type-check during rollout. */
export type WinstonScopeKey = WinstonPageScopeKey;
