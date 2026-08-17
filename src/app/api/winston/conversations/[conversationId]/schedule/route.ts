import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { logUsage } from "@/lib/ai/usage-logger";
import { getAuthContext } from "@/lib/auth/get-auth-context";
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
  surface: z.enum(["calendar", "content"]).optional(),
});

const mixedItemSchema = z.object({
  tempId: z.string().min(1).optional(),
  entityType: z.enum([
    "project",
    "task",
    "calendar_event",
    "content_post",
    "idea",
  ]),
  fields: z.record(z.string(), z.unknown()),
  reasoning: z.string().trim().min(1),
  selected: z.boolean().optional(),
});

const MIXED_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant.
Turn a conversation into a structured creation proposal.

Return ONLY valid JSON:
{
  "summary": "optional short sentence",
  "foundActionableItems": true|false,
  "noActionableReason": "required when foundActionableItems is false",
  "items": [
    {
      "tempId": "tmp-any-string",
      "entityType": "project" | "task" | "calendar_event" | "content_post" | "idea",
      "fields": { ... },
      "reasoning": "specific signal from the conversation",
      "selected": true
    }
  ]
}

Rules:
- If the conversation does not yet describe something worth creating, set foundActionableItems=false and explain what is still missing. Do not invent filler items.
- Choose entityType from what was actually discussed. A mix is allowed (e.g. a project plus a task plus a calendar event).
- Never invent a date. If a date is needed and wasn't established, prefer an idea (status awaiting-date) or a content_post with status "idea" and no scheduled_date.
- project fields: project_name, service_type, status ("active"), optional deadline (YYYY-MM-DD), client_name, notes.
- task fields: title, priority ("low"|"medium"|"high"), optional due_date, optional projectId, raw_content.
- calendar_event fields: title, date (YYYY-MM-DD), event_type ("lifestyle"|"other"), optional end_date, notes.
- content_post fields: title, platforms (array), content_type, status ("idea"|"planned"|"scheduled"), optional scheduled_date, description.
- idea fields: title, optional description, category, status ("awaiting-date" when no date).
- Every item needs specific reasoning. JSON only.`;

const modelResponseSchema = z.object({
  summary: z.string().trim().min(1).optional(),
  foundActionableItems: z.boolean(),
  noActionableReason: z.string().trim().optional(),
  items: z.array(z.unknown()).max(20).optional(),
});

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
        system: cachedSystemPrompt(MIXED_SYSTEM_PROMPT),
        messages: [
          {
            role: "user",
            content: `${
              surface === "calendar"
                ? "The user was on Calendar — prefer calendar_event or idea if that fits, but do not refuse other types.\n\n"
                : surface === "content"
                  ? "The user was on Content — prefer content_post if that fits, but do not refuse other types.\n\n"
                  : ""
            }Conversation transcript:\n${transcript}`,
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

    const items: WinstonProposalItem[] = [];
    for (const raw of parsed.data.items ?? []) {
      const parsedItem = mixedItemSchema.safeParse(raw);
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
