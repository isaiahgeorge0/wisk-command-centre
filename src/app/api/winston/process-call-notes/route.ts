import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { logUsage } from "@/lib/ai/usage-logger";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import type { CallNotesResult } from "@/lib/leads/types";
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
  notes: z
    .string()
    .trim()
    .min(20, "Notes must be at least 20 characters")
    .max(10000, "Notes must be 10,000 characters or fewer"),
});

const callNotesResultSchema = z.object({
  summary: z.string(),
  keyDetails: z.array(z.string()),
  objections: z.array(z.string()),
  nextSteps: z.array(z.string()),
  suggestedStage: z.enum(LEAD_STATUSES).nullable(),
  suggestedValue: z.number().nullable(),
  followUpDate: z.string().nullable(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  taskSuggestions: z.array(z.string()).max(3),
});

const SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. You are analysing call notes or a transcript from a business call with a lead. Extract structured information and provide actionable insights. Always respond with valid JSON only — no markdown, no preamble.`;

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseCallNotesJson(raw: string): CallNotesResult {
  const cleaned = stripMarkdownFences(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Winston returned an invalid JSON response. Please try again.");
  }

  const validated = callNotesResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Winston returned an unexpected response format. Please try again.");
  }

  return validated.data;
}

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

    const { leadId, notes } = parsed.data;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, status, service_interest, value, notes")
      .eq("id", leadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (leadError) {
      console.error("process-call-notes lead fetch:", leadError);
      return NextResponse.json(
        { error: "Could not load lead" },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const stageLabel =
      LEAD_STATUS_LABELS[
        LEAD_STATUSES.includes(lead.status as (typeof LEAD_STATUSES)[number])
          ? (lead.status as (typeof LEAD_STATUSES)[number])
          : "new"
      ];

    const userPrompt = `Lead name: ${lead.name}
Current stage: ${stageLabel} (${lead.status})
Service interest: ${lead.service_interest}
Current value: ${lead.value ?? "Not set"}

Call notes/transcript:
${notes}

Extract and return this JSON structure:
{
  "summary": "string (2-3 sentence overview of the call)",
  "keyDetails": ["budget, timeline, requirements mentioned"],
  "objections": ["concerns or hesitations raised"],
  "nextSteps": ["specific actions agreed or needed"],
  "suggestedStage": "new | contacted | qualified | proposal_sent | won | lost | null",
  "suggestedValue": "number | null",
  "followUpDate": "ISO date string | null",
  "sentiment": "positive | neutral | negative",
  "taskSuggestions": ["specific tasks to create from this call, max 3"]
}`;

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
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("process-call-notes Claude API error:", err);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );

    if (!replyBlock?.text) {
      throw new Error("No text content in Claude response");
    }

    const result = parseCallNotesJson(replyBlock.text);
    const inputTokens = claudeData.usage?.input_tokens ?? 0;
    const outputTokens = claudeData.usage?.output_tokens ?? 0;

    await logUsage(userId, "chat", inputTokens, outputTokens);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("process-call-notes error:", error);
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
