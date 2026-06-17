const RESERVED_WORDS = [
  "admin", "wisk", "winston", "support", "help", "api", "www", "mail",
  "email", "hello", "team", "official", "wiskapp", "isaiahgeorgecreative",
  "igc", "moderator", "mod", "staff", "system", "null", "undefined", "root",
  "superuser", "billing", "pricing", "upgrade", "account", "settings",
  "dashboard", "overview",
];

const PROFANITY_LIST = [
  "fuck", "shit", "cunt", "cock", "dick", "pussy", "bitch", "ass", "asshole",
  "bastard", "piss", "twat", "wank", "whore", "slut", "nigger", "nigga",
  "faggot", "fag", "retard", "crap", "damn", "prick", "spastic",
];

export function validateUsername(
  username: string
): { valid: boolean; error?: string } {
  const lower = username.toLowerCase().trim();

  if (lower.length < 3)
    return { valid: false, error: "Username must be at least 3 characters" };
  if (lower.length > 20)
    return { valid: false, error: "Username must be 20 characters or less" };
  if (
    lower.length > 1 &&
    !/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(lower)
  )
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores, and hyphens, and must start and end with a letter or number",
    };
  if (/[_-]{2,}/.test(lower))
    return {
      valid: false,
      error: "Username cannot contain consecutive special characters",
    };
  if (RESERVED_WORDS.includes(lower))
    return { valid: false, error: "This username is reserved" };
  if (PROFANITY_LIST.some((word) => lower.includes(word)))
    return { valid: false, error: "This username is not allowed" };

  return { valid: true };
}

export function formatUsername(username: string): string {
  return username.toLowerCase().trim();
}

export function displayUsername(username: string): string {
  return `@${username}`;
}
