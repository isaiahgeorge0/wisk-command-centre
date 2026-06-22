import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import {
  fetchGmailInbox,
  searchGmail,
} from "@/lib/email/gmail";
import {
  fetchOutlookInbox,
  searchOutlook,
} from "@/lib/email/outlook";
import {
  getValidGmailTokens,
  getValidOutlookTokens,
} from "@/lib/email/token-manager";
import type { EmailThread, InboxPageTokens } from "@/lib/email/types";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, s-maxage=300",
};

type ProviderFilter = "gmail" | "outlook" | "all";

function parseProvider(value: string | null): ProviderFilter {
  if (value === "gmail" || value === "outlook") return value;
  return "all";
}

export async function GET(request: Request) {
  let supabase;
  let userId: string;

  try {
    ({ supabase, userId } = await getScopedSupabase());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const hasAiPro = await hasPackageAccess(userId, "ai_pro", supabase);

  if (!hasAiPro) {
    return NextResponse.json(
      { error: "AI Pro subscription required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const provider = parseProvider(searchParams.get("provider"));
  const search = searchParams.get("search")?.trim() ?? "";
  const pageToken = searchParams.get("pageToken");
  const gmailPageToken = searchParams.get("gmailPageToken") ?? pageToken;
  const outlookPageToken = searchParams.get("outlookPageToken") ?? pageToken;

  const nextPageTokens: InboxPageTokens = {
    gmail: null,
    outlook: null,
  };

  const threads: EmailThread[] = [];

  const includeGmail = provider === "all" || provider === "gmail";
  const includeOutlook = provider === "all" || provider === "outlook";

  if (includeGmail) {
    const accounts = await getValidGmailTokens(userId);

    for (const account of accounts) {
      const result = search
        ? await searchGmail(account.accessToken, search)
        : await fetchGmailInbox(account.accessToken, gmailPageToken ?? undefined);

      if (!nextPageTokens.gmail && result.nextPageToken) {
        nextPageTokens.gmail = result.nextPageToken;
      }

      for (const email of result.emails) {
        threads.push({
          ...email,
          accountEmail: account.email,
          accountLabel: account.label,
          integrationId: account.integrationId,
        });
      }
    }
  }

  if (includeOutlook) {
    const accounts = await getValidOutlookTokens(userId);

    for (const account of accounts) {
      const result = search
        ? await searchOutlook(account.accessToken, search)
        : await fetchOutlookInbox(account.accessToken, outlookPageToken ?? undefined);

      if (!nextPageTokens.outlook && result.nextPageToken) {
        nextPageTokens.outlook = result.nextPageToken;
      }

      for (const email of result.emails) {
        threads.push({
          ...email,
          accountEmail: account.email,
          accountLabel: account.label,
          integrationId: account.integrationId,
        });
      }
    }
  }

  const emails = threads.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json(
    {
      emails,
      nextPageToken: nextPageTokens,
    },
    { headers: CACHE_HEADERS }
  );
}
