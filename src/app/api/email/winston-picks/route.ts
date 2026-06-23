import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { fetchUnreadEmailsForPicks } from "@/lib/email/fetch-unread-for-picks";
import { generateEmailDraft } from "@/lib/email/generate-draft";
import { scoreEmailForPicks } from "@/lib/email/score-email-picks";
import type {
  EmailWindow,
  WinstonPick,
  WinstonPicksResult,
} from "@/lib/email/types";
import {
  getCurrentEmailWindow,
  getUkDateString,
} from "@/lib/email/uk-window";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CachedPicksRow = {
  window: EmailWindow;
  date: string;
  picks: WinstonPick[];
  generated_at: string;
};

function outsideWindowResponse() {
  return NextResponse.json({
    picks: [],
    window: null,
    outsideWindow: true,
  });
}

async function readCachedPicks(
  userId: string,
  date: string,
  window: EmailWindow
): Promise<CachedPicksRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("winston_email_picks")
    .select("window, date, picks, generated_at")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("window", window)
    .maybeSingle();

  if (error) {
    console.error("[winston-picks] cache read error:", error);
    return null;
  }

  if (!data) return null;

  return {
    window: data.window as EmailWindow,
    date: data.date as string,
    picks: data.picks as WinstonPick[],
    generated_at: data.generated_at as string,
  };
}

async function deleteCachedPicks(
  userId: string,
  date: string,
  window: EmailWindow
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("winston_email_picks")
    .delete()
    .eq("user_id", userId)
    .eq("date", date)
    .eq("window", window);

  if (error) {
    console.error("[winston-picks] cache delete error:", error);
  }
}

async function storePicks(
  userId: string,
  date: string,
  window: EmailWindow,
  picks: WinstonPick[]
): Promise<string> {
  const admin = createAdminClient();
  const generatedAt = new Date().toISOString();

  const { error } = await admin.from("winston_email_picks").upsert(
    {
      user_id: userId,
      window,
      date,
      picks,
      generated_at: generatedAt,
    },
    { onConflict: "user_id,date,window" }
  );

  if (error) {
    console.error("[winston-picks] cache write error:", error);
  }

  return generatedAt;
}

async function generatePicks(
  userId: string,
  supabase: Awaited<ReturnType<typeof getScopedSupabase>>["supabase"],
  window: EmailWindow,
  date: string
): Promise<WinstonPicksResult> {
  const emails = await fetchUnreadEmailsForPicks(userId);

  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("leads")
    .select("email")
    .eq("user_id", userId);

  const knownLeadEmails = new Set(
    (leads ?? [])
      .map((lead) => lead.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email))
  );

  const scored = emails
    .map((email) =>
      scoreEmailForPicks(
        email,
        knownLeadEmails.has(email.from.email.trim().toLowerCase())
      )
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const picks: WinstonPick[] = [];

  for (const { email, priorityReason } of scored) {
    const draft = await generateEmailDraft({
      userId,
      supabase,
      emailId: email.id,
      integrationId: email.integrationId,
      provider: email.provider,
      tone: "professional",
    });

    if (!draft) continue;

    picks.push({
      emailId: email.id,
      integrationId: email.integrationId,
      provider: email.provider,
      subject: email.subject,
      fromName: email.from.name,
      fromEmail: email.from.email,
      accountLabel: email.accountLabel,
      priorityReason,
      draft,
    });
  }

  const generatedAt = await storePicks(userId, date, window, picks);

  return {
    window,
    date,
    picks,
    generatedAt,
    isFromCache: false,
  };
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

  const window = getCurrentEmailWindow();
  if (!window) {
    return outsideWindowResponse();
  }

  const date = getUkDateString();
  const { searchParams } = new URL(request.url);
  const regenerate = searchParams.get("regenerate") === "true";

  if (regenerate) {
    await deleteCachedPicks(userId, date, window);
  } else {
    const cached = await readCachedPicks(userId, date, window);
    if (cached) {
      const result: WinstonPicksResult = {
        window: cached.window,
        date: cached.date,
        picks: cached.picks,
        generatedAt: cached.generated_at,
        isFromCache: true,
      };
      return NextResponse.json(result);
    }
  }

  try {
    const result = await generatePicks(userId, supabase, window, date);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[winston-picks] generation error:", error);
    return NextResponse.json({
      window,
      date,
      picks: [],
      generatedAt: new Date().toISOString(),
      isFromCache: false,
    });
  }
}
