import type { Email, EmailThreadBase, InboxResult } from "@/lib/email/types";
import { stripHtml, toPreview } from "@/lib/email/utils";

type OutlookAddress = {
  emailAddress?: { name?: string; address?: string };
};

type OutlookMessage = {
  id: string;
  conversationId?: string;
  subject?: string;
  from?: OutlookAddress;
  toRecipients?: OutlookAddress[];
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  isRead?: boolean;
  flag?: { flagStatus?: string };
};

type OutlookListResponse = {
  value?: OutlookMessage[];
  "@odata.nextLink"?: string;
};

function mapOutlookAddress(
  address?: OutlookAddress
): { name: string; email: string } {
  const email = address?.emailAddress?.address?.trim() ?? "";
  const name = address?.emailAddress?.name?.trim() ?? "";

  return {
    name: name || email.split("@")[0] || "Unknown",
    email: email || "unknown@unknown",
  };
}

function mapOutlookMessage(message: OutlookMessage): Email {
  const bodyContent = message.body?.content ?? "";
  const body =
    message.body?.contentType === "html"
      ? stripHtml(bodyContent)
      : bodyContent.trim();

  return {
    id: message.id,
    provider: "outlook",
    threadId: message.conversationId ?? message.id,
    subject: message.subject?.trim() || "(No subject)",
    from: mapOutlookAddress(message.from),
    to: (message.toRecipients ?? []).map(mapOutlookAddress),
    date: message.receivedDateTime ?? new Date().toISOString(),
    preview: toPreview(message.bodyPreview ?? body),
    body,
    isRead: message.isRead ?? true,
    isStarred: message.flag?.flagStatus === "flagged",
    labels: [],
  };
}

function mapOutlookThread(message: OutlookMessage): EmailThreadBase {
  return {
    id: message.id,
    provider: "outlook",
    subject: message.subject?.trim() || "(No subject)",
    from: mapOutlookAddress(message.from),
    date: message.receivedDateTime ?? new Date().toISOString(),
    preview: toPreview(message.bodyPreview ?? ""),
    isRead: message.isRead ?? true,
    messageCount: 1,
  };
}

function extractOutlookSkipToken(nextLink?: string): string | null {
  if (!nextLink) return null;

  try {
    const url = new URL(nextLink);
    return url.searchParams.get("$skiptoken");
  } catch {
    return null;
  }
}

async function fetchOutlookMessages(
  accessToken: string,
  url: string
): Promise<InboxResult> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="text"',
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("fetchOutlookMessages failed:", response.status);
    return { emails: [], nextPageToken: null };
  }

  const data = (await response.json()) as OutlookListResponse;

  return {
    emails: (data.value ?? []).map(mapOutlookThread),
    nextPageToken: extractOutlookSkipToken(data["@odata.nextLink"]),
  };
}

export async function fetchOutlookInbox(
  accessToken: string,
  skipToken?: string
): Promise<InboxResult> {
  const params = new URLSearchParams({
    $top: "50",
    $orderby: "receivedDateTime desc",
    $select:
      "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,flag,conversationId",
  });

  if (skipToken) {
    params.set("$skiptoken", skipToken);
  }

  return fetchOutlookMessages(
    accessToken,
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params.toString()}`
  );
}

export async function fetchOutlookUnreadInbox(
  accessToken: string,
  skipToken?: string
): Promise<InboxResult> {
  const params = new URLSearchParams({
    $top: "50",
    $orderby: "receivedDateTime desc",
    $filter: "isRead eq false",
    $select:
      "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,flag,conversationId",
  });

  if (skipToken) {
    params.set("$skiptoken", skipToken);
  }

  return fetchOutlookMessages(
    accessToken,
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params.toString()}`
  );
}

export async function searchOutlook(
  accessToken: string,
  query: string
): Promise<InboxResult> {
  const params = new URLSearchParams({
    $search: `"${query.replace(/"/g, '\\"')}"`,
    $top: "50",
    $select:
      "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,conversationId",
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ConsistencyLevel: "eventual",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("searchOutlook failed:", response.status);
    return { emails: [], nextPageToken: null };
  }

  const data = (await response.json()) as OutlookListResponse;

  return {
    emails: (data.value ?? []).map(mapOutlookThread),
    nextPageToken: extractOutlookSkipToken(data["@odata.nextLink"]),
  };
}

export async function fetchOutlookMessage(
  accessToken: string,
  messageId: string
): Promise<Email | null> {
  const params = new URLSearchParams({
    $select:
      "id,subject,from,toRecipients,receivedDateTime,body,isRead,flag,conversationId",
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error(`fetchOutlookMessage ${messageId} failed:`, response.status);
    return null;
  }

  const message = (await response.json()) as OutlookMessage;
  return mapOutlookMessage(message);
}
