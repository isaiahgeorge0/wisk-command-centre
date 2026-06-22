export type { EmailCategory } from "@/lib/email/categoriser";
import type { EmailCategory } from "@/lib/email/categoriser";

export type EmailProvider = "gmail" | "outlook";

export type Email = {
  id: string;
  provider: EmailProvider;
  threadId: string;
  subject: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  date: string;
  preview: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
};

export type EmailThread = {
  id: string;
  provider: EmailProvider;
  subject: string;
  from: { name: string; email: string };
  date: string;
  preview: string;
  isRead: boolean;
  messageCount: number;
  accountEmail: string;
  accountLabel: string | null;
  integrationId: string;
  category: EmailCategory;
  isFromKnownContact: boolean;
  linkedLeadId: string | null;
  linkedLeadName: string | null;
};

export type EmailThreadBase = Omit<
  EmailThread,
  | "accountEmail"
  | "accountLabel"
  | "integrationId"
  | "category"
  | "isFromKnownContact"
  | "linkedLeadId"
  | "linkedLeadName"
>;

export type InboxResult = {
  emails: EmailThreadBase[];
  nextPageToken: string | null;
};

export type InboxPageTokens = {
  gmail: string | null;
  outlook: string | null;
};

export type ValidEmailToken = {
  integrationId: string;
  email: string;
  label: string | null;
  accessToken: string;
};

export type DraftTone = "professional" | "friendly" | "casual";

export type WinstonDraft = {
  subject: string;
  body: string;
  tone: DraftTone;
  provider: EmailProvider;
  accountEmail: string;
};

export type EmailActionItem = {
  emailId: string;
  action: string;
  urgency: "high" | "medium" | "low";
  suggestTask: boolean;
};
