import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { logUsage } from "@/lib/ai/usage-logger";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasAIAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createProposalTempId,
  type WinstonProposal,
  type WinstonProposalEntityType,
  type WinstonProposalItem,
} from "@/lib/winston/proposal";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

const paramsSchema = z.object({
  conversationId: z.string().uuid(),
});

const bodySchema = z.object({
  surface: z.enum(["calendar", "content"]),
});

const calendarItemSchema = z.object({
  tempId: z.string().min(1).optional(),
  entityType: z.enum(["calendar_event", "idea"]),
  fields: z.record(z.string(), z.unknown()),
  reasoning: z.string().trim().min(1),
  selected: z.boolean().optional(),
});

const contentItemSchema = z.object({
  tempId: z.string().min(1).optional(),
  entityType: z.literal("content_post"),
  fields: z.record(z.string(), z.unknown()),
  reasoning: z.string().trim().min(1),
  selected: z.boolean().optional(),
});

const modelResponseSchema = z.object({
  summary: z.string().trim().min(1).optional(),
  foundActionableItems: z.boolean(),
  noActionableReason: z.string().trim().optional(),
  items: z.array(z.unknown()).max(20).optional(),
});

const CALENDAR_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant.
Turn a calendar brainstorm conversation into a structured proposal.

Return ONLY valid JSON:
{
  "summary": "optional short sentence",
  "foundActionableItems": true|false,
  "noActionableReason": "required when foundActionableItems is false",
  "items": [
    {
      "tempId": "tmp-any-string",
      "entityType": "calendar_event" | "idea",
      "fields": { ... },
      "reasoning": "specific signal from the conversation",
      "selected": true
    }
  ]
}

Rules:
- If the conversation does not yet describe something schedulable, set foundActionableItems=false and explain what is still missing. Do not invent filler items.
- If a confident date (YYYY-MM-DD) was established, emit a calendar_event with fields.title, fields.date, fields.event_type ("lifestyle" or "other"). Optional: end_date, notes.
- If no confident date was established, emit an idea with fields.title, fields.status "awaiting-date", fields.category "Calendar". Reasoning MUST explicitly say a date was not determined, citing the conversation.
- Never invent a date. Never emit both a calendar_event and an idea for the same thing unless they are genuinely separate items.
- Every item needs specific reasoning. JSON only.`;

const CONTENT_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant.
Turn a content brainstorm conversation into a structured proposal.

Return ONLY valid JSON:
{
  "summary": "optional short sentence",
  "foundActionableItems": true|false,
  "noActionableReason": "required when foundActionableItems is false",
  "items": [
    {
      "tempId": "tmp-any-string",
      "entityType": "content_post",
      "fields": { ... },
      "reasoning": "specific signal from the conversation",
      "selected": true
    }
  ]
}

Rules:
- If the conversation does not yet describe a content post, set foundActionableItems=false and explain what is still missing. Do not invent filler items.
- Always emit content_post items (never ideas). Required: fields.title, fields.platforms (array of platform names), fields.content_type, fields.status.
- If a date was established, set fields.scheduled_date (YYYY-MM-DD) and status "planned" or "scheduled". If no date, omit scheduled_date (or empty string) and set status "idea". Reasoning must say so.
- Never invent a date. Every item needs specific reasoning. JSON only.`;

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeItems(
  rawItems: Array<{
    tempId?: string;
    entityType: WinstonProposalEntityType;
    fields: Record<string, unknown>;
    reasoning: string;
    selected?: boolean;
  }>
): WinstonProposalItem[] {
  return rawItems.map((item) => ({
    tempId: item.tempId?.trim() || createProposalTempId(),
    entityType: item.entityType,
    fields: { ...item.fields },
    reasoning: item.reasoning.trim(),
    selected: item.selected ?? true,
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "Invalid conversation id" },
        { status: 400 }
      );
    }
    const conversationId = parsedParams.data.conversationId;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { surface } = parsedBody.data;

    const supabase = await createClient();
    const { user } = await getAuthContext();
    const userId = user.id;

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

    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const { data: history, error: historyError } = await supabase
      .from("ai_conversation_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    if (historyError) {
      console.error("schedule transcript fetch:", historyError);
      return NextResponse.json(
        { error: "Could not load conversation" },
        { status: 500 }
      );
    }

    const transcript = (history ?? [])
      .map((row) => `${row.role === "user" ? "User" : "Winston"}: ${row.content}`)
      .join("\n\n");

    if (!transcript.trim()) {
      return NextResponse.json({
        found: false,
        message: "Chat a bit more first — there isn’t enough to schedule yet.",
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    Sentry.setUser({ id: userId });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: cachedSystemPrompt(
          surface === "calendar" ? CALENDAR_SYSTEM_PROMPT : CONTENT_SYSTEM_PROMPT
        ),
        messages: [
          {
            role: "user",
            content: `Conversation transcript:\n${transcript}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("schedule Claude API error:", err);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeData = (await response.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (block): block is AnthropicTextBlock => block.type === "text"
    );
    if (!replyBlock?.text?.trim()) {
      throw new Error("No text content in Claude response");
    }

    const parsed = modelResponseSchema.safeParse(
      JSON.parse(cleanJson(replyBlock.text))
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Winston returned an invalid proposal format" },
        { status: 502 }
      );
    }

    await logUsage(
      userId,
      "chat",
      claudeData.usage?.input_tokens ?? 0,
      claudeData.usage?.output_tokens ?? 0
    );

    if (!parsed.data.foundActionableItems || !(parsed.data.items?.length ?? 0)) {
      return NextResponse.json({
        found: false,
        message:
          parsed.data.noActionableReason?.trim() ||
          "Not enough detail yet — keep chatting.",
      });
    }

    const itemSchema =
      surface === "calendar" ? calendarItemSchema : contentItemSchema;
    const items: WinstonProposalItem[] = [];
    for (const raw of parsed.data.items ?? []) {
      const parsedItem = itemSchema.safeParse(raw);
      if (!parsedItem.success) continue;
      items.push(
        ...normalizeItems([
          parsedItem.data as {
            tempId?: string;
            entityType: WinstonProposalEntityType;
            fields: Record<string, unknown>;
            reasoning: string;
            selected?: boolean;
          },
        ])
      );
    }

    if (items.length === 0) {
      return NextResponse.json({
        found: false,
        message:
          parsed.data.noActionableReason?.trim() ||
          "Not enough detail yet — keep chatting.",
      });
    }

    const proposal: WinstonProposal = {
      proposalId: createProposalTempId(),
      sourceType: "conversation",
      sourceId: conversationId,
      items,
    };

    return NextResponse.json({
      found: true,
      message: parsed.data.summary?.trim() || null,
      proposal,
    });
  } catch (error) {
    console.error("schedule-from-chat error:", error);
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
