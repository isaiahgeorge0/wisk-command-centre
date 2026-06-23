import type { EmailThread } from "@/lib/email/types";

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

const AUTOMATED_SENDER_PATTERNS = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "notifications",
  "mailer-daemon",
  "automated",
];

function isUnreadOlderThanHours(dateIso: string, hours: number): boolean {
  const ageMs = Date.now() - new Date(dateIso).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

function subjectIndicatesUrgency(subject: string): boolean {
  const lower = subject.toLowerCase();
  return URGENT_SUBJECT_INDICATORS.some((indicator) => lower.includes(indicator));
}

function isAutomatedSender(email: EmailThread): boolean {
  const haystack = `${email.from.name} ${email.from.email}`.toLowerCase();
  return AUTOMATED_SENDER_PATTERNS.some((pattern) => haystack.includes(pattern));
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

  if (isAutomatedSender(email)) {
    score -= 2;
  }

  if (email.category === "newsletters") {
    score -= 3;
  }

  const priorityReason =
    reasons
      .filter((reason) => reason.points > 0)
      .sort((a, b) => b.points - a.points)[0]?.label ?? "High priority email";

  return { email, score, priorityReason };
}
