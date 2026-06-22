import type { EmailProvider, EmailThread } from "@/lib/email/types";
import {
  fetchGmailInbox,
} from "@/lib/email/gmail";
import {
  fetchOutlookInbox,
} from "@/lib/email/outlook";
import {
  categoriseEmail,
  findLeadMatch,
} from "@/lib/email/categoriser";
import {
  getValidGmailTokens,
  getValidOutlookTokens,
} from "@/lib/email/token-manager";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_KEY = "email_suggestions";

const NEWSLETTER_INDICATORS = [
  "unsubscribe",
  "newsletter",
  "noreply",
  "no-reply",
  "marketing",
  "digest",
];

const IMPORTANCE_SUBJECT_INDICATORS = [
  "urgent",
  "important",
  "asap",
  "deadline",
  "invoice",
  "proposal",
  "contract",
  "payment",
];

export type ImportantEmailSuggestion = {
  emailId: string;
  integrationId: string;
  provider: EmailProvider;
  subject: string;
  fromName: string;
  fromEmail: string;
  accountLabel: string | null;
  reason: string;
  linkedLeadId: string | null;
  linkedLeadName: string | null;
};

type EmailSuggestionsCache = {
  data: ImportantEmailSuggestion[];
  generated_at: string;
};

function isAutomatedOrNewsletter(email: {
  subject: string;
  from: { name: string; email: string };
  category?: string;
}): boolean {
  if (email.category === "newsletters") return true;

  const haystack = `${email.subject} ${email.from.name} ${email.from.email}`.toLowerCase();
  return NEWSLETTER_INDICATORS.some((indicator) => haystack.includes(indicator));
}

function subjectIndicatesImportance(subject: string): boolean {
  const lower = subject.toLowerCase();
  return IMPORTANCE_SUBJECT_INDICATORS.some((indicator) =>
    lower.includes(indicator)
  );
}

function isUnreadOlderThanHours(dateIso: string, hours: number): boolean {
  const ageMs = Date.now() - new Date(dateIso).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

async function readCache(
  userId: string
): Promise<EmailSuggestionsCache | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_context_cache")
    .select("context")
    .eq("user_id", userId)
    .maybeSingle();

  const context = data?.context as Record<string, unknown> | null;
  const cache = context?.[CACHE_KEY] as EmailSuggestionsCache | undefined;
  return cache ?? null;
}

async function writeCache(
  userId: string,
  suggestions: ImportantEmailSuggestion[]
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_context_cache")
    .select("context, generated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const existingContext =
    data?.context && typeof data.context === "object" && !Array.isArray(data.context)
      ? (data.context as Record<string, unknown>)
      : {};

  await admin.from("ai_context_cache").upsert({
    user_id: userId,
    context: {
      ...existingContext,
      [CACHE_KEY]: {
        data: suggestions,
        generated_at: new Date().toISOString(),
      },
    },
    generated_at: (data?.generated_at as string) ?? new Date().toISOString(),
  });
}

async function buildThread(
  email: {
    id: string;
    provider: EmailProvider;
    subject: string;
    from: { name: string; email: string };
    date: string;
    preview: string;
    isRead: boolean;
    messageCount: number;
  },
  account: { email: string; label: string | null; integrationId: string },
  leads: Array<{ id: string; name: string; email: string | null }>,
  knownLeadEmails: string[]
): Promise<EmailThread> {
  const base: EmailThread = {
    ...email,
    accountEmail: account.email,
    accountLabel: account.label,
    integrationId: account.integrationId,
    category: "other",
    isFromKnownContact: false,
    linkedLeadId: null,
    linkedLeadName: null,
  };

  base.category = categoriseEmail(base, knownLeadEmails, []);
  const leadMatch = findLeadMatch(base, leads);
  base.isFromKnownContact = Boolean(leadMatch);
  base.linkedLeadId = leadMatch?.id ?? null;
  base.linkedLeadName = leadMatch?.name ?? null;

  return base;
}

async function fetchRecentEmails(
  userId: string,
  leads: Array<{ id: string; name: string; email: string | null }>,
  knownLeadEmails: string[]
): Promise<EmailThread[]> {
  const threads: EmailThread[] = [];

  const gmailAccounts = await getValidGmailTokens(userId);
  for (const account of gmailAccounts) {
    const result = await fetchGmailInbox(account.accessToken);
    for (const email of result.emails) {
      threads.push(
        await buildThread(
          email,
          {
            email: account.email,
            label: account.label,
            integrationId: account.integrationId,
          },
          leads,
          knownLeadEmails
        )
      );
    }
  }

  const outlookAccounts = await getValidOutlookTokens(userId);
  for (const account of outlookAccounts) {
    const result = await fetchOutlookInbox(account.accessToken);
    for (const email of result.emails) {
      threads.push(
        await buildThread(
          email,
          {
            email: account.email,
            label: account.label,
            integrationId: account.integrationId,
          },
          leads,
          knownLeadEmails
        )
      );
    }
  }

  return threads
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
}

function buildReason(email: EmailThread): string | null {
  if (email.linkedLeadId) {
    return "Email from a lead in your pipeline";
  }

  if (!email.isRead && isUnreadOlderThanHours(email.date, 2)) {
    return "Unread for more than 2 hours";
  }

  if (subjectIndicatesImportance(email.subject)) {
    return "Subject suggests this needs attention";
  }

  if (email.isFromKnownContact && /^re:\s/i.test(email.subject.trim())) {
    return "Reply thread from a known contact";
  }

  return null;
}

export async function getImportantEmailSuggestions(
  userId: string
): Promise<ImportantEmailSuggestion[]> {
  const cached = await readCache(userId);
  if (
    cached &&
    Date.now() - new Date(cached.generated_at).getTime() < CACHE_TTL_MS
  ) {
    return cached.data;
  }

  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("leads")
    .select("id, name, email")
    .eq("user_id", userId);

  const leadRows = leads ?? [];
  const knownLeadEmails = leadRows
    .map((lead) => lead.email)
    .filter((email): email is string => Boolean(email));

  const emails = await fetchRecentEmails(userId, leadRows, knownLeadEmails);

  const suggestions: ImportantEmailSuggestion[] = [];

  for (const email of emails) {
    if (isAutomatedOrNewsletter(email)) continue;

    const reason = buildReason(email);
    if (!reason) continue;

    suggestions.push({
      emailId: email.id,
      integrationId: email.integrationId,
      provider: email.provider,
      subject: email.subject,
      fromName: email.from.name,
      fromEmail: email.from.email,
      accountLabel: email.accountLabel,
      reason,
      linkedLeadId: email.linkedLeadId,
      linkedLeadName: email.linkedLeadName,
    });

    if (suggestions.length >= 3) break;
  }

  await writeCache(userId, suggestions);
  return suggestions;
}
