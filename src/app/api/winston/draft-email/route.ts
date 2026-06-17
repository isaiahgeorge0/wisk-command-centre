import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { logUsage } from "@/lib/ai/usage-logger";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import { getDefaultEmailSubject } from "@/lib/leads/email";
import type { Lead } from "@/lib/leads/types";
import { LEAD_STATUSES } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

const bodySchema = z.object({
  leadId: z.string().uuid(),
});

const SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. Draft a short, professional follow-up email for a business lead. Keep it concise (3-4 sentences max), warm but professional. Return only the email body text — no subject line, no greeting salutation, no sign-off. Just the body paragraphs.`;

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getScopedSupabase();

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("ai_access")
      .eq("user_id", userId)
      .maybeSingle();

    const canAccessWinston = await hasAIAccess(
      userId,
      createAdminClient(),
      prefs?.ai_access ?? false
    );

    if (!canAccessWinston) {
      return NextResponse.json(
        { error: "Winston access not enabled" },
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

    const { leadId } = parsed.data;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, status, service_interest, value, email")
      .eq("id", leadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (leadError) {
      console.error("draft-email lead fetch:", leadError);
      return NextResponse.json(
        { error: "Could not load lead" },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead has no email address" },
        { status: 400 }
      );
    }

    const { data: activities } = await supabase
      .from("lead_activities")
      .select("title, content, activity_type, created_at")
      .eq("lead_id", leadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const activitiesText =
      activities && activities.length > 0
        ? activities
            .map((activity) => {
              const detail = activity.content
                ? `: ${activity.content}`
                : "";
              return `- [${activity.activity_type}] ${activity.title}${detail}`;
            })
            .join("\n")
        : "No recent activities logged.";

    const stageLabel =
      LEAD_STATUS_LABELS[
        LEAD_STATUSES.includes(lead.status as (typeof LEAD_STATUSES)[number])
          ? (lead.status as (typeof LEAD_STATUSES)[number])
          : "new"
      ];

    const userPrompt = `Lead name: ${lead.name}
Stage: ${stageLabel} (${lead.status})
Service interest: ${lead.service_interest}
Value: ${lead.value ?? "Not set"}
Recent activities:
${activitiesText}

Draft a follow-up email body for this lead.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    Sentry.setUser({ id: userId });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("draft-email Claude API error:", err);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );

    if (!replyBlock?.text?.trim()) {
      throw new Error("No text content in Claude response");
    }

    const inputTokens = claudeData.usage?.input_tokens ?? 0;
    const outputTokens = claudeData.usage?.output_tokens ?? 0;

    await logUsage(userId, "chat", inputTokens, outputTokens);

    return NextResponse.json({
      subject: getDefaultEmailSubject(lead as Lead),
      body: replyBlock.text.trim(),
    });
  } catch (error) {
    console.error("draft-email error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
