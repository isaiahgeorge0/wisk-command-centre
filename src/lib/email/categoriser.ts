import type { EmailThread } from "@/lib/email/types";

export type EmailCategory =
  | "leads"
  | "clients"
  | "admin"
  | "newsletters"
  | "other";

type CategorisableEmail = Pick<EmailThread, "from" | "subject">;
type MatchableEmail = Pick<EmailThread, "from">;

const NEWSLETTER_INDICATORS = [
  "unsubscribe",
  "newsletter",
  "noreply",
  "no-reply",
  "marketing",
  "digest",
];

const ADMIN_INDICATORS = [
  "invoice",
  "receipt",
  "payment",
  "subscription",
  "renewal",
  "account",
  "billing",
  "security",
  "verify",
];

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function containsIndicator(text: string, indicators: string[]): boolean {
  const lower = text.toLowerCase();
  return indicators.some((indicator) => lower.includes(indicator));
}

export function categoriseEmail(
  email: CategorisableEmail,
  knownLeadEmails: string[],
  knownClientEmails: string[]
): EmailCategory {
  const fromEmail = normaliseEmail(email.from.email);
  const leadSet = new Set(knownLeadEmails.map(normaliseEmail));
  const clientSet = new Set(knownClientEmails.map(normaliseEmail));

  if (leadSet.has(fromEmail)) return "leads";
  if (clientSet.has(fromEmail)) return "clients";

  const subject = email.subject ?? "";
  const fromText = `${email.from.name} ${email.from.email}`;

  if (containsIndicator(subject, NEWSLETTER_INDICATORS)) return "newsletters";
  if (containsIndicator(fromText, NEWSLETTER_INDICATORS)) return "newsletters";

  if (containsIndicator(subject, ADMIN_INDICATORS)) return "admin";

  return "other";
}

export function findLeadMatch(
  email: MatchableEmail,
  leads: Array<{ id: string; name: string; email: string | null }>
): { id: string; name: string } | null {
  const fromEmail = normaliseEmail(email.from.email);
  const match = leads.find(
    (lead) => lead.email && normaliseEmail(lead.email) === fromEmail
  );
  return match ? { id: match.id, name: match.name } : null;
}
