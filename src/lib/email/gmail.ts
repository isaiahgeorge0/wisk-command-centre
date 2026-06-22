import type { Email, EmailThreadBase, InboxResult } from "@/lib/email/types";
import {
  decodeBase64Url,
  parseMailbox,
  parseMailboxList,
  stripHtml,
  toPreview,
} from "@/lib/email/utils";

type GmailListResponse = {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
};

type GmailHeader = { name: string; value: string };

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
};

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return (
    headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function extractBodyFromPart(part: GmailMessagePart): string {
  if (part.parts?.length) {
    const plain = part.parts
      .map(extractBodyFromPart)
      .find((value) => value.length > 0);
    if (plain) return plain;
  }

  if (!part.body?.data) return "";

  const decoded = decodeBase64Url(part.body.data);
  if (part.mimeType === "text/html") {
    return stripHtml(decoded);
  }

  return decoded;
}

function extractGmailBody(message: GmailMessageResponse): string {
  const payload = message.payload;
  if (!payload) return "";

  if (payload.parts?.length) {
    const plainPart = findPartByMime(payload.parts, "text/plain");
    if (plainPart) return extractBodyFromPart(plainPart);

    const htmlPart = findPartByMime(payload.parts, "text/html");
    if (htmlPart) return extractBodyFromPart(htmlPart);

    return payload.parts.map(extractBodyFromPart).join("\n").trim();
  }

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(decoded) : decoded;
  }

  return "";
}

function findPartByMime(
  parts: GmailMessagePart[],
  mimeType: string
): GmailMessagePart | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts?.length) {
      const nested = findPartByMime(part.parts, mimeType);
      if (nested) return nested;
    }
  }
  return null;
}

function mapGmailMessage(message: GmailMessageResponse): Email {
  const headers = message.payload?.headers;
  const body = extractGmailBody(message);
  const from = parseMailbox(getHeader(headers, "From"));
  const to = parseMailboxList(getHeader(headers, "To"));
  const dateHeader = getHeader(headers, "Date");
  const parsedDate = dateHeader ? new Date(dateHeader) : new Date();
  const date = Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString()
    : parsedDate.toISOString();

  return {
    id: message.id,
    provider: "gmail",
    threadId: message.threadId,
    subject: getHeader(headers, "Subject") || "(No subject)",
    from,
    to,
    date,
    preview: toPreview(body),
    body,
    isRead: !message.labelIds?.includes("UNREAD"),
    isStarred: message.labelIds?.includes("STARRED") ?? false,
    labels: message.labelIds ?? [],
  };
}

function groupGmailThreads(emails: Email[]): EmailThreadBase[] {
  const threads = new Map<string, Email[]>();

  for (const email of emails) {
    const existing = threads.get(email.threadId) ?? [];
    existing.push(email);
    threads.set(email.threadId, existing);
  }

  return Array.from(threads.values())
    .map((messages) => {
      const sorted = messages.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latest = sorted[0];

      return {
        id: latest.id,
        provider: "gmail" as const,
        subject: latest.subject,
        from: latest.from,
        date: latest.date,
        preview: latest.preview,
        isRead: sorted.every((message) => message.isRead),
        messageCount: sorted.length,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function listGmailMessageIds(
  accessToken: string,
  queryString: string
): Promise<GmailListResponse> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryString}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("listGmailMessageIds failed:", response.status);
    return {};
  }

  return (await response.json()) as GmailListResponse;
}

async function fetchGmailMessages(
  accessToken: string,
  ids: { id: string }[]
): Promise<Email[]> {
  const emails = await Promise.all(
    ids.map(async ({ id }) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        console.error(`fetchGmailMessage ${id} failed:`, response.status);
        return null;
      }

      const message = (await response.json()) as GmailMessageResponse;
      return mapGmailMessage(message);
    })
  );

  return emails.filter((email): email is Email => email !== null);
}

async function fetchGmailMessagesResult(
  accessToken: string,
  params: URLSearchParams
): Promise<InboxResult> {
  const list = await listGmailMessageIds(accessToken, params.toString());
  const ids = list.messages ?? [];

  if (ids.length === 0) {
    return { emails: [], nextPageToken: list.nextPageToken ?? null };
  }

  const messages = await fetchGmailMessages(accessToken, ids);

  return {
    emails: groupGmailThreads(messages),
    nextPageToken: list.nextPageToken ?? null,
  };
}

export async function fetchGmailInbox(
  accessToken: string,
  pageToken?: string
): Promise<InboxResult> {
  const params = new URLSearchParams({
    maxResults: "50",
    labelIds: "INBOX",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return fetchGmailMessagesResult(accessToken, params);
}

export async function searchGmail(
  accessToken: string,
  query: string
): Promise<InboxResult> {
  const params = new URLSearchParams({
    maxResults: "50",
    q: query,
  });

  return fetchGmailMessagesResult(accessToken, params);
}

export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<Email | null> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error(`fetchGmailMessage ${messageId} failed:`, response.status);
    return null;
  }

  const message = (await response.json()) as GmailMessageResponse;
  return mapGmailMessage(message);
}
