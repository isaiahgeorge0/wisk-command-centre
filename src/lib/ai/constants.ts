/** Token-based monthly budget (input + output combined). */
export const WINSTON_MONTHLY_TOKEN_LIMIT = 100_000;

/** Short-term spam guard — max messages per window, not token-based. */
export const WINSTON_SHORT_TERM_LIMIT = 10; // per 5 minutes
export const WINSTON_SHORT_TERM_WINDOW_MS = 5 * 60 * 1000;
