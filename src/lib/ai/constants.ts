/** Default deadline for Anthropic Messages API calls (one-shot cards, digests). */
export const ANTHROPIC_TIMEOUT_MS = 30_000;

/** Streaming chat — wall clock for the full token stream, not just TTFB. */
export const ANTHROPIC_STREAM_TIMEOUT_MS = 60_000;

/** Longer deadline for valuation — uses web_search tool rounds. */
export const ANTHROPIC_VALUATION_TIMEOUT_MS = 90_000;

/** Paid Winston Chat / sidebar — full capability. */
export const WINSTON_PAID_CHAT_MODEL = "claude-sonnet-4-6";

/** Free-tier global sidebar — real conversation, cost-capped. */
export const WINSTON_FREE_CHAT_MODEL = "claude-haiku-4-5-20251001";

/** Free users: max chat exchanges per local day (ai_usage_log feature=chat). */
export const WINSTON_FREE_DAILY_MESSAGE_CAP = 3;

/** Token-based monthly budget (input + output combined). */
export const WINSTON_MONTHLY_TOKEN_LIMIT = 100_000;

/** Features that count toward the monthly user-initiated limit. */
export const WINSTON_USER_INITIATED_FEATURES = ["chat", "email_draft"] as const;

/** Auto-generated features — tracked for visibility, never rate-limited. */
export const WINSTON_AUTO_GENERATED_FEATURES = [
  "digest",
  "property_insights",
  "email_picks_draft",
  "portal_triage",
] as const;

/** Short-term spam guard — max messages per window, not token-based. */
export const WINSTON_SHORT_TERM_LIMIT = 10; // per 5 minutes
export const WINSTON_SHORT_TERM_WINDOW_MS = 5 * 60 * 1000;
