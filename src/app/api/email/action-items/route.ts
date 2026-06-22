import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasPackageAccess } from "@/lib/billing/access";
import type { EmailActionItem, EmailThread } from "@/lib/email/types";

export const runtime = "nodejs";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

const emailThreadSchema = z.object({
  id: z.string(),
  provider: z.enum(["gmail", "outlook"]),
  subject: z.string(),
  from: z.object({
    name: z.string(),
    email: z.string(),
  }),
  date: z.string(),
  preview: z.string(),
  isRead: z.boolean(),
  messageCount: z.number(),
  accountEmail: z.string(),
  accountLabel: z.string().nullable(),
  integrationId: z.string(),
  category: z.enum(["leads", "clients", "admin", "newsletters", "other"]),
  isFromKnownContact: z.boolean(),
  linkedLeadId: z.string().nullable(),
  linkedLeadName: z.string().nullable(),
});

const bodySchema = z.object({
  emails: z.array(emailThreadSchema).max(10),
});

const SYSTEM_PROMPT = `You are Winston, an AI business assistant. Analyse these email subjects and previews and identify any that require action from the user.

For each actionable email return:
- emailId: the email id
- action: short description of what needs doing (max 10 words)
- urgency: 'high' | 'medium' | 'low'
- suggestTask: boolean — whether this should become a WISK task

Return ONLY a JSON array. No explanation. No markdown.`;

function parseActionItems(raw: string): EmailActionItem[] {
  const trimmed = raw.trim();
  const jsonText = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) return [];

  const itemSchema = z.object({
    emailId: z.string(),
    action: z.string(),
    urgency: z.enum(["high", "medium", "low"]),
    suggestTask: z.boolean(),
  });

  const items: EmailActionItem[] = [];
  for (const entry of parsed) {
    const result = itemSchema.safeParse(entry);
    if (result.success) items.push(result.data);
  }

  return items;
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

  const emails = parsed.data.emails as EmailThread[];

  if (emails.length === 0) {
    return NextResponse.json({ actionItems: [] });
  }

  const userPrompt = emails
    .map(
      (email, index) =>
        `${index + 1}. id=${email.id}
Subject: ${email.subject}
From: ${email.from.name} <${email.from.email}>
Preview: ${email.preview}
Unread: ${email.isRead ? "no" : "yes"}`
    )
    .join("\n\n");

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
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("[email/action-items] Claude API error:", err);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );

    let actionItems: EmailActionItem[] = [];
    if (replyBlock?.text) {
      try {
        actionItems = parseActionItems(replyBlock.text);
      } catch (parseError) {
        console.error("[email/action-items] JSON parse failed:", parseError);
      }
    }

    await logUsage(
      userId,
      "chat",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    return NextResponse.json({ actionItems });
  } catch (error) {
    console.error("[email/action-items] error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not analyse emails",
      },
      { status: 500 }
    );
  }
}
