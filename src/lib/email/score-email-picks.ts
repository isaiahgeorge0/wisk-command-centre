import type { EmailThread } from "@/lib/email/types";

export const MIN_PICK_SCORE_THRESHOLD = 2;

const URGENT_SUBJECT_INDICATORS = [
  "urgent",
  "important",
  "asap",
  "deadline",
  "invoice",
  "proposal",
  "contract",
  "payment",
];

const EMAIL_EXCLUSION_CONTAINS = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "do_not_reply",
];

const EMAIL_EXCLUSION_PREFIXES = ["mailer-", "bounce-", "auto-"];

const EMAIL_EXCLUSION_DOMAIN_CONTAINS = [
  "@notifications.",
  "@updates.",
  "@news.",
  "@newsletter.",
  "@marketing.",
  "@promo.",
  "@automated.",
];

const NAME_EXCLUSION_CONTAINS = [
  "automated",
  "system",
  "notification",
  "newsletter",
  "mailer",
];

function isUnreadOlderThanHours(dateIso: string, hours: number): boolean {
  const ageMs = Date.now() - new Date(dateIso).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

function subjectIndicatesUrgency(subject: string): boolean {
  const lower = subject.toLowerCase();
  return URGENT_SUBJECT_INDICATORS.some((indicator) => lower.includes(indicator));
}

export function isExcludedFromPicks(email: EmailThread): boolean {
  if (email.category === "newsletters") {
    return true;
  }

  const fromEmail = email.from.email.toLowerCase();
  const fromName = email.from.name.toLowerCase();

  if (EMAIL_EXCLUSION_CONTAINS.some((pattern) => fromEmail.includes(pattern))) {
    return true;
  }

  if (EMAIL_EXCLUSION_PREFIXES.some((prefix) => fromEmail.startsWith(prefix))) {
    return true;
  }

  if (
    EMAIL_EXCLUSION_DOMAIN_CONTAINS.some((pattern) => fromEmail.includes(pattern))
  ) {
    return true;
  }

  if (NAME_EXCLUSION_CONTAINS.some((pattern) => fromName.includes(pattern))) {
    return true;
  }

  return false;
}

export type ScoredEmail = {
  email: EmailThread;
  score: number;
  priorityReason: string;
};

export function scoreEmailForPicks(
  email: EmailThread,
  isKnownLead: boolean
): ScoredEmail {
  let score = 0;
  const reasons: { points: number; label: string }[] = [];

  if (isKnownLead || email.linkedLeadId) {
    score += 3;
    reasons.push({ points: 3, label: "Lead in your pipeline" });
  }

  if (subjectIndicatesUrgency(email.subject)) {
    score += 2;
    reasons.push({ points: 2, label: "Subject needs attention" });
  }

  if (!email.isRead && isUnreadOlderThanHours(email.date, 4)) {
    score += 2;
    reasons.push({ points: 2, label: "Unread for more than 4 hours" });
  }

  if (/^re:\s/i.test(email.subject.trim())) {
    score += 1;
    reasons.push({ points: 1, label: "Direct reply thread" });
  }

  const priorityReason =
    reasons
      .filter((reason) => reason.points > 0)
      .sort((a, b) => b.points - a.points)[0]?.label ?? "High priority email";

  return { email, score, priorityReason };
}
