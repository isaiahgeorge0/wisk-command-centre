/** Stable key for a set of inbox threads (order-independent). */
export function fingerprintActionItemEmails(
  emails: Array<{ id: string; provider: string }>
): string {
  return emails
    .map((email) => `${email.provider}:${email.id}`)
    .sort()
    .join("|");
}
