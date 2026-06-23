import {
  categoriseEmail,
  findLeadMatch,
} from "@/lib/email/categoriser";
import { searchGmail } from "@/lib/email/gmail";
import { fetchOutlookUnreadInbox } from "@/lib/email/outlook";
import type { EmailThread } from "@/lib/email/types";
import {
  getValidGmailTokens,
  getValidOutlookTokens,
} from "@/lib/email/token-manager";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_UNREAD = 20;

async function buildThread(
  email: {
    id: string;
    provider: "gmail" | "outlook";
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
    customInboxId: null,
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

export async function fetchUnreadEmailsForPicks(
  userId: string
): Promise<EmailThread[]> {
  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("leads")
    .select("id, name, email")
    .eq("user_id", userId);

  const leadRows = leads ?? [];
  const knownLeadEmails = leadRows
    .map((lead) => lead.email)
    .filter((email): email is string => Boolean(email));

  const threads: EmailThread[] = [];

  const gmailAccounts = await getValidGmailTokens(userId);
  for (const account of gmailAccounts) {
    const result = await searchGmail(account.accessToken, "is:unread in:inbox");
    for (const email of result.emails) {
      if (email.isRead) continue;
      threads.push(
        await buildThread(
          email,
          {
            email: account.email,
            label: account.label,
            integrationId: account.integrationId,
          },
          leadRows,
          knownLeadEmails
        )
      );
    }
  }

  const outlookAccounts = await getValidOutlookTokens(userId);
  for (const account of outlookAccounts) {
    const result = await fetchOutlookUnreadInbox(account.accessToken);
    for (const email of result.emails) {
      if (email.isRead) continue;
      threads.push(
        await buildThread(
          email,
          {
            email: account.email,
            label: account.label,
            integrationId: account.integrationId,
          },
          leadRows,
          knownLeadEmails
        )
      );
    }
  }

  return threads
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_UNREAD);
}
