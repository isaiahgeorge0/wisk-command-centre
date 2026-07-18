import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logUsage } from "@/lib/ai/usage-logger";
import type { UsageFeature } from "@/lib/ai/usage-logger";
import { buildReplySubject } from "@/lib/email/compose-urls";
import { fetchGmailMessage } from "@/lib/email/gmail";
import { fetchOutlookMessage } from "@/lib/email/outlook";
import { getValidEmailTokenForIntegration } from "@/lib/email/token-manager";
import type { DraftTone, EmailProvider, WinstonDraft } from "@/lib/email/types";
import { LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import { LEAD_STATUSES } from "@/lib/leads/types";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

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

Begin your response with a personalised greeting using the sender's first name.
Extract the first name from the sender's display name or email address.
Examples: 'Hi Sarah,' or 'Hello James,' or 'Good morning David,'
Match the greeting formality to the tone:
- Professional: 'Dear [Name],' or 'Hello [Name],'
- Friendly: 'Hi [Name],'
- Casual: 'Hey [Name],' or just 'Hi [Name],'

Only draft a response if the email genuinely warrants one:
- It contains a direct question or request
- It is from a known client, lead, or business contact
- It requires a decision or action from the recipient

If the email is a newsletter, notification, automated message, or does not require a personal response, say so briefly and do not draft a reply.

When you do draft, be concise — most business emails need 3-5 sentences, not paragraphs. Do not over-explain.

If you determine this email does not need a reply, respond with exactly: NO_REPLY_NEEDED: [brief reason]

Otherwise, return ONLY the email body — include the greeting and message content, but no subject line or sign-off/signature.`;
}

export type GenerateEmailDraftInput = {
  userId: string;
  supabase: SupabaseClient;
  emailId: string;
  integrationId: string;
  provider: EmailProvider;
  tone: DraftTone;
  usageFeature?: Extract<UsageFeature, "email_draft" | "email_picks_draft">;
};

export async function generateEmailDraft(
  input: GenerateEmailDraftInput
): Promise<WinstonDraft | null> {
  const { userId, supabase, emailId, integrationId, provider, tone, usageFeature } =
    input;

  const accessToken = await getValidEmailTokenForIntegration(
    userId,
    integrationId
  );
  if (!accessToken) {
    return null;
  }

  const email =
    provider === "gmail"
      ? await fetchGmailMessage(accessToken, emailId)
      : await fetchOutlookMessage(accessToken, emailId);

  if (!email) {
    return null;
  }

  const [{ data: prefs }, { data: integration }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_integrations")
      .select("label, email_address, signature, signature_plain")
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
    return null;
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
      console.error("[generateEmailDraft] Claude API error:", err);
      return null;
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );

    if (!replyBlock?.text?.trim()) {
      return null;
    }

    await logUsage(
      userId,
      usageFeature ?? "email_draft",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    return {
      subject: buildReplySubject(email.subject),
      body: replyBlock.text.trim(),
      tone,
      provider,
      accountEmail:
        integration?.email_address ?? email.to[0]?.email ?? email.from.email,
      signature: integration?.signature ?? null,
      signaturePlain: integration?.signature_plain ?? null,
    };
  } catch (error) {
    console.error("[generateEmailDraft] error:", error);
    Sentry.captureException(error);
    return null;
  }
}
