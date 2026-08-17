/**
 * Maps raw DB/PostgREST failures to a user-facing ActionResult error.
 * Zod validation messages are already human-readable — do not pass those here.
 */

const UNIQUE_VIOLATION = "23505";

function postgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === "string" && /^\d{5}$/.test(code) ? code : null;
}

export function toSafeActionError(error: unknown, fallback: string): string {
  console.error(fallback, error);

  if (postgresErrorCode(error) === UNIQUE_VIOLATION) {
    return "That's already in use.";
  }

  return fallback;
}
