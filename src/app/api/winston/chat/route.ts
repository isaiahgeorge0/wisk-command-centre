import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { getCachedContext } from "@/lib/ai/context-cache";
import {
  WINSTON_MONTHLY_TOKEN_LIMIT,
  WINSTON_SHORT_TERM_LIMIT,
  WINSTON_SHORT_TERM_WINDOW_MS,
} from "@/lib/ai/constants";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasAIAccess } from "@/lib/billing/access";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

type StoredMessage = { role: "user" | "assistant"; content: string };

// ─── Validation ───────────────────────────────────────────────────────────────

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
});

// ─── System prompt ────────────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. The user is asking you questions directly about their business. Use the context provided to give specific, helpful answers. Be conversational but concise — this is a chat, not a report. If you don't have enough information to answer something, say so honestly rather than guessing. You are on the user's side — constructive, direct, warm. Never lecture or over-explain.`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    let userId: string;

    try {
      const { user } = await getAuthContext();
      userId = user.id;
    } catch {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ── Access check ─────────────────────────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────────────────────────
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

    const { message } = parsed.data;

    Sentry.setUser({ id: userId });

    // ── Rate limiting (admin client for cross-instance reliability) ───────────
    const admin = createAdminClient();

    // Monthly token budget
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: usageRows } = await admin
      .from("ai_usage_log")
      .select("input_tokens, output_tokens")
      .eq("user_id", userId)
      .eq("feature", "chat")
      .gte("created_at", monthStart.toISOString());

    const totalTokens = (usageRows ?? []).reduce(
      (sum, row) => sum + (row.input_tokens ?? 0) + (row.output_tokens ?? 0),
      0
    );

    if (totalTokens >= WINSTON_MONTHLY_TOKEN_LIMIT) {
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const resetDate = nextMonth.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      });
      return NextResponse.json(
        {
          error: `You've reached your monthly Winston usage limit. Your allowance resets on ${resetDate}.`,
          limitType: "monthly",
        },
        { status: 429 }
      );
    }

    // Short-term limit (10 per 5 minutes)
    const fiveMinAgo = new Date(
      Date.now() - WINSTON_SHORT_TERM_WINDOW_MS
    ).toISOString();

    const { count: recentCount } = await admin
      .from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", "chat")
      .gte("created_at", fiveMinAgo);

    if ((recentCount ?? 0) >= WINSTON_SHORT_TERM_LIMIT) {
      return NextResponse.json(
        {
          error: "You're sending messages too quickly. Please wait a moment.",
          limitType: "short_term",
        },
        { status: 429 }
      );
    }

    // ── Fetch context (cached) ────────────────────────────────────────────────
    const context = await getCachedContext(userId, supabase);

    // ── Fetch last 20 messages within the past 12 hours ──────────────────────
    const twelveHoursAgo = new Date(
      Date.now() - 12 * 60 * 60 * 1000
    ).toISOString();

    const { data: history } = await supabase
      .from("ai_conversation_messages")
      .select("role, content")
      .eq("user_id", userId)
      .gte("created_at", twelveHoursAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    const historyMessages: StoredMessage[] = (
      (history ?? []) as StoredMessage[]
    ).reverse();

    // ── Store user message ────────────────────────────────────────────────────
    await supabase.from("ai_conversation_messages").insert({
      user_id: userId,
      role: "user",
      content: message,
    });

    // ── Call Claude ───────────────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const systemWithContext = `${CHAT_SYSTEM_PROMPT}\n\nHere is the user's current business context:\n${JSON.stringify(context, null, 2)}`;

    const claudeMessages = [
      ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemWithContext,
          messages: claudeMessages,
        }),
      }
    );

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("winston/chat: Claude API error:", err);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = (await claudeResponse.json()) as AnthropicResponse;
    const replyBlock = claudeData.content.find(
      (b): b is AnthropicTextBlock => b.type === "text"
    );

    if (!replyBlock) throw new Error("No text content in Claude response");

    const reply = replyBlock.text;
    const inputTokens = claudeData.usage?.input_tokens ?? 0;
    const outputTokens = claudeData.usage?.output_tokens ?? 0;

    // ── Store Winston's reply ─────────────────────────────────────────────────
    await supabase.from("ai_conversation_messages").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    // ── Log usage ─────────────────────────────────────────────────────────────
    await logUsage(userId, "chat", inputTokens, outputTokens);

    return NextResponse.json({ reply, usedTokens: inputTokens + outputTokens });
  } catch (error) {
    console.error("winston/chat error:", error);
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
