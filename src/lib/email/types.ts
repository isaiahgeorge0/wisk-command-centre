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
};

export type EmailThreadBase = Omit<
  EmailThread,
  "accountEmail" | "accountLabel" | "integrationId"
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
