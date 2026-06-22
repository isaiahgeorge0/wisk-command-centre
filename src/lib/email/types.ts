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
};

export type InboxResult = {
  emails: EmailThread[];
  nextPageToken: string | null;
};

export type InboxPageTokens = {
  gmail: string | null;
  outlook: string | null;
};
