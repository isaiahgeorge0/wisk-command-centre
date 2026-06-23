/** Token-based monthly budget (input + output combined). */
export const WINSTON_MONTHLY_TOKEN_LIMIT = 100_000;

/** Features that count toward the monthly user-initiated limit. */
export const WINSTON_USER_INITIATED_FEATURES = ["chat", "email_draft"] as const;

/** Auto-generated features — tracked for visibility, never rate-limited. */
export const WINSTON_AUTO_GENERATED_FEATURES = [
  "digest",
  "property_insights",
  "email_picks_draft",
] as const;

/** Short-term spam guard — max messages per window, not token-based. */
export const WINSTON_SHORT_TERM_LIMIT = 10; // per 5 minutes
export const WINSTON_SHORT_TERM_WINDOW_MS = 5 * 60 * 1000;
