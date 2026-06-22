import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasPackageAccess } from "@/lib/billing/access";
import { buildReplySubject } from "@/lib/email/compose-urls";
import { fetchGmailMessage } from "@/lib/email/gmail";
import { fetchOutlookMessage } from "@/lib/email/outlook";
import { getValidEmailTokenForIntegration } from "@/lib/email/token-manager";
import type { DraftTone, WinstonDraft } from "@/lib/email/types";
import { LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import { LEAD_STATUSES } from "@/lib/leads/types";

export const runtime = "nodejs";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

const bodySchema = z.object({
  emailId: z.string().min(1),
  integrationId: z.string().uuid(),
  provider: z.enum(["gmail", "outlook"]),
  tone: z.enum(["professional", "friendly", "casual"]),
});

const TONE_GUIDANCE: Record<DraftTone, string> = {
  professional:
    "Professional: formal, concise, clear. No contractions. Business-appropriate.",
  friendly:
    "Friendly: warm but professional. Conversational. Light contractions ok.",
  casual:
    "Casual: relaxed, personal, natural. Write like a human not a business.",
};

function buildSystemPrompt(options: {
  displayName: string;
  tone: DraftTone;
  accountLabel: string | null;
  leadContext: string | null;
}): string {
  const accountLabel = options.accountLabel?.trim() || "business";

  return `You are Winston, an AI business assistant for WISK. You are drafting an email response on behalf of ${options.displayName}.

Tone: ${TONE_GUIDANCE[options.tone]}

Account context: This is their ${accountLabel} email account.
${options.leadContext ? `\n${options.leadContext}` : ""}

Draft a response to the email below. Return ONLY the email body — no subject line, no greeting label, just the body text ready to send. Keep it concise and appropriate to the tone.`;
}

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { emailId, integrationId, provider, tone } = parsed.data;

  const accessToken = await getValidEmailTokenForIntegration(userId, integrationId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Email account not connected" },
      { status: 404 }
    );
  }

  const email =
    provider === "gmail"
      ? await fetchGmailMessage(accessToken, emailId)
      : await fetchOutlookMessage(accessToken, emailId);

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const [{ data: prefs }, { data: integration }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_integrations")
      .select("label, email_address")
      .eq("id", integrationId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const displayName = prefs?.display_name?.trim() || "the user";

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, status, notes")
    .eq("user_id", userId)
    .ilike("email", email.from.email)
    .maybeSingle();

  let leadContext: string | null = null;

  if (lead) {
    const stageLabel =
      LEAD_STATUS_LABELS[
        LEAD_STATUSES.includes(lead.status as (typeof LEAD_STATUSES)[number])
          ? (lead.status as (typeof LEAD_STATUSES)[number])
          : "new"
      ];

    const { data: activities } = await supabase
      .from("lead_activities")
      .select("title, content, created_at")
      .eq("lead_id", lead.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastActivity = activities?.[0];
    const lastNote =
      lead.notes?.trim() ||
      lastActivity?.content?.trim() ||
      lastActivity?.title?.trim() ||
      "No recent notes";

    leadContext = `This sender is a lead in their pipeline — status: ${stageLabel}, last note: ${lastNote}.`;
  }

  const systemPrompt = buildSystemPrompt({
    displayName,
    tone,
    accountLabel: integration?.label ?? null,
    leadContext,
  });

  const userPrompt = `Subject: ${email.subject}
From: ${email.from.name} <${email.from.email}>
Date: ${email.date}

${email.body}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service is not configured" },
      { status: 500 }
    );
  }

  try {
    Sentry.setUser({ id: userId });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("[email/draft] Claude API error:", err);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );

    if (!replyBlock?.text?.trim()) {
      throw new Error("No text content in Claude response");
    }

    await logUsage(
      userId,
      "email_draft",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    const draft: WinstonDraft = {
      subject: buildReplySubject(email.subject),
      body: replyBlock.text.trim(),
      tone,
      provider,
      accountEmail:
        integration?.email_address ?? email.to[0]?.email ?? email.from.email,
    };

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[email/draft] error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate draft",
      },
      { status: 500 }
    );
  }
}
