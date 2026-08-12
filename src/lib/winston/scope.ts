/**
 * Page-level Winston brainstorm scopes (ai_conversations.scope_key).
 * Record-level scopes stay on note_id / project_id — never mix threads across keys.
 */

export const WINSTON_SCOPE_KEYS = ["calendar", "content-calendar"] as const;

export type WinstonScopeKey = (typeof WINSTON_SCOPE_KEYS)[number];

export function isWinstonScopeKey(value: string): value is WinstonScopeKey {
  return (WINSTON_SCOPE_KEYS as readonly string[]).includes(value);
}

/** Maps brainstorm UI surface → durable scope_key. */
export const BRAINSTORM_SURFACE_SCOPE: Record<
  "calendar" | "content",
  WinstonScopeKey
> = {
  calendar: "calendar",
  content: "content-calendar",
};

export const SCOPE_KEY_TITLES: Record<WinstonScopeKey, string> = {
  calendar: "Calendar brainstorm",
  "content-calendar": "Content brainstorm",
};
