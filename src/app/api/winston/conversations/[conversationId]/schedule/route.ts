import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { ANTHROPIC_STREAM_TIMEOUT_MS } from "@/lib/ai/constants";
import { logUsage } from "@/lib/ai/usage-logger";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasPackageAccess } from "@/lib/billing/access";
import { extractSourcesFromDisplayMessage } from "@/lib/research/citations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateKey, formatLocalDate } from "@/lib/morning/timezone";
import {
  createProposalTempId,
  normalizeGeneratedProposalItems,
  type WinstonProposal,
} from "@/lib/winston/proposal";
import {
  MIXED_PROPOSAL_SYSTEM_PROMPT,
  mixedProposalScopeBias,
} from "@/lib/winston/proposal-prompt";
import { BRAINSTORM_SURFACE_SCOPE } from "@/lib/winston/scope";

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
  /** When set, bias proposal generation toward this assistant message. */
  messageId: z.string().uuid().optional(),
  /** Client-held content for optimistic messages that may not be persisted yet. */
  focusMessageContent: z.string().trim().min(1).max(20000).optional(),
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

const modelResponseSchema = z.object({
  summary: z.string().trim().min(1).optional(),
  foundActionableItems: z.boolean(),
  noActionableReason: z.string().trim().optional(),
  items: z.array(z.unknown()).max(40).optional(),
});

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
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
    const { surface, messageId, focusMessageContent } = parsedBody.data;

    const supabase = await createClient();
    const { user } = await getAuthContext();
    const userId = user.id;

    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id, scope_key")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const scopeKey =
      (typeof conversation.scope_key === "string" && conversation.scope_key) ||
      (surface ? BRAINSTORM_SURFACE_SCOPE[surface] : null);

    if (scopeKey === "research") {
      const admin = createAdminClient();
      const canAccessResearchPro = await hasPackageAccess(
        userId,
        "research_pro",
        admin
      );
      if (!canAccessResearchPro) {
        return NextResponse.json(
          {
            error:
              "Proposing from research findings needs WISK Research Pro.",
          },
          { status: 403 }
        );
      }
    }

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    const timezone = prefs?.timezone ?? "Europe/London";
    const todayISO = getLocalDateKey(timezone);
    const todayLabel = formatLocalDate(timezone);

    const { data: history, error: historyError } = await supabase
      .from("ai_conversation_messages")
      .select("id, role, content")
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

    const historyRows = history ?? [];
    const focusedRow = messageId
      ? historyRows.find((row) => row.id === messageId)
      : null;
    const focusedContent =
      (typeof focusedRow?.content === "string" && focusedRow.content.trim()) ||
      focusMessageContent?.trim() ||
      null;

    const citations =
      scopeKey === "research" && focusedContent
        ? extractSourcesFromDisplayMessage(focusedContent)
        : null;

    const transcript = historyRows
      .map((row) => `${row.role === "user" ? "User" : "Winston"}: ${row.content}`)
      .join("\n\n");

    if (!transcript.trim() && !focusedContent) {
      return NextResponse.json({
        found: false,
        message: "Chat a bit more first — there isn’t enough to schedule yet.",
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    Sentry.setUser({ id: userId });

    const scopeBias = mixedProposalScopeBias(scopeKey);
    const focusBlock = focusedContent
      ? `\n\nFocus on this Winston reply the user tapped Create this on:\n${focusedContent}`
      : "";
    const citationsBlock = citations
      ? `\n\nSources from that reply (must remain visible in item reasoning when used):\n${citations}`
      : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: cachedSystemPrompt(MIXED_PROPOSAL_SYSTEM_PROMPT),
        messages: [
          {
            role: "user",
            content: `${scopeBias ? `${scopeBias}\n\n` : ""}Today is ${todayLabel} (${todayISO}). Resolve relative weekdays against this date.\n\nConversation transcript:\n${transcript || "(empty)"}${focusBlock}${citationsBlock}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(ANTHROPIC_STREAM_TIMEOUT_MS),
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

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanJson(replyBlock.text));
    } catch {
      return NextResponse.json(
        { error: "Winston returned an invalid proposal format" },
        { status: 502 }
      );
    }

    const parsed = modelResponseSchema.safeParse(parsedJson);
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

    const accepted = [];
    for (const raw of parsed.data.items ?? []) {
      const parsedItem = mixedItemSchema.safeParse(raw);
      if (!parsedItem.success) continue;
      accepted.push(parsedItem.data);
    }

    const items = normalizeGeneratedProposalItems(accepted);

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
      citations,
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
