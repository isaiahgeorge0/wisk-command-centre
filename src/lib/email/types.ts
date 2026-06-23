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

export type CustomInbox = {
  id: string;
  user_id: string;
  name: string;
  colour: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type EmailRule = {
  id: string;
  user_id: string;
  rule_type: "sender" | "domain";
  value: string;
  target_type: "custom_inbox" | "default_category";
  target_id: string;
  apply_type: "always" | "once";
  created_at: string;
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
  customInboxId: string | null;
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
  | "customInboxId"
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
  signature: string | null;
  signaturePlain: string | null;
};

export type EmailActionItem = {
  emailId: string;
  action: string;
  urgency: "high" | "medium" | "low";
  suggestTask: boolean;
};

export type EmailWindow = "morning" | "afternoon";

export type WinstonPick = {
  emailId: string;
  integrationId: string;
  provider: EmailProvider;
  subject: string;
  fromName: string;
  fromEmail: string;
  accountLabel: string | null;
  priorityReason: string;
  draft: WinstonDraft;
};

export type WinstonPicksResult = {
  window: EmailWindow;
  date: string;
  picks: WinstonPick[];
  generatedAt: string;
  isFromCache: boolean;
};
