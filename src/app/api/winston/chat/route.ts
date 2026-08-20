import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { getCachedContext } from "@/lib/ai/context-cache";
import { formatBusinessContext } from "@/lib/ai/format-user-context";
import {
  ANTHROPIC_STREAM_TIMEOUT_MS,
  ANTHROPIC_TIMEOUT_MS,
  WINSTON_FREE_CHAT_MODEL,
  WINSTON_FREE_DAILY_MESSAGE_CAP,
  WINSTON_MONTHLY_TOKEN_LIMIT,
  WINSTON_PAID_CHAT_MODEL,
  WINSTON_SHORT_TERM_LIMIT,
  WINSTON_SHORT_TERM_WINDOW_MS,
  WINSTON_USER_INITIATED_FEATURES,
} from "@/lib/ai/constants";
import { countChatExchangesOnLocalDay } from "@/lib/ai/free-chat-cap";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasAIAccess, hasPackageAccess, hasResearchAccess } from "@/lib/billing/access";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { extractPlainTextFromNoteContent } from "@/lib/notes/utils";
import { formatResearchDocumentContext } from "@/lib/research/document-analysis";
import { answerOpenResearchQuestion } from "@/lib/research/open-chat";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BRAINSTORM_SURFACE_SCOPE,
  getScopeKeyTitle,
  isWinstonScopeKey,
  parseResearchDocumentScope,
} from "@/lib/winston/scope";
import { systemPromptForScope } from "@/lib/winston/context-resolver";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

type StoredMessage = { role: "user" | "assistant"; content: string };

type StreamEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | {
      type: "done";
      conversationId: string;
      usedTokens: number;
    }
  | { type: "title"; generatedTitle: string }
  | {
      type: "error";
      error: string;
      limitType?: "monthly" | "short_term" | "daily";
    };

// ─── Validation ───────────────────────────────────────────────────────────────

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  conversationId: z.string().uuid().optional(),
  noteId: z.string().uuid().optional(),
  surface: z.enum(["calendar", "content"]).optional(),
  scopeKey: z.string().trim().min(1).max(80).optional(),
});

const NOTE_CONTENT_MAX_CHARS = 8_000;

function formatNoteContext(title: string, plainText: string): string {
  const clipped =
    plainText.length > NOTE_CONTENT_MAX_CHARS
      ? `${plainText.slice(0, NOTE_CONTENT_MAX_CHARS)}…`
      : plainText;
  return `Note title: ${title || "Untitled"}
Note content:
${clipped.trim() || "(empty note)"}`;
}

const RESEARCH_DOCUMENT_SYSTEM_PROMPT = `You are Winston answering follow-up questions about one uploaded Research document.
Ground every answer only in the document text provided. Do not use outside knowledge or invent facts.
Number guardrail: any figure you restate must appear character-for-character in the document. Never infer, round, or recalculate numbers.
Be concise and plain. If the document does not contain the answer, say so clearly.`;

function encodeSse(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

async function generateConversationTitle(
  apiKey: string,
  message: string
): Promise<string | undefined> {
  const titleResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Generate a 3-5 word title for a conversation that starts with this message: "${message.slice(0, 200)}". Return only the title, no punctuation.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });

  if (!titleResponse.ok) return undefined;

  const titleData = (await titleResponse.json()) as AnthropicResponse;
  const titleBlock = titleData.content.find(
    (b): b is AnthropicTextBlock => b.type === "text"
  );
  if (!titleBlock?.text) return undefined;
  return titleBlock.text.trim().replace(/^["']|["']$/g, "");
}

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
      .select("ai_access, timezone")
      .eq("user_id", userId)
      .maybeSingle();

    const canAccessWinston = await hasAIAccess(
      userId,
      createAdminClient(),
      prefs?.ai_access ?? false
    );

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

    const {
      message,
      conversationId: incomingConversationId,
      noteId: incomingNoteId,
      surface,
      scopeKey: incomingScopeKey,
    } = parsed.data;

    Sentry.setUser({ id: userId });

    // Resolve page-level scope (Calendar / Content). Never invent from surface alone
    // when a conversationId is already known — verify instead.
    let scopeKey: string | null = null;
    if (incomingScopeKey) {
      if (!isWinstonScopeKey(incomingScopeKey)) {
        return NextResponse.json(
          { error: "Invalid conversation scope" },
          { status: 400 }
        );
      }
      scopeKey = incomingScopeKey;
    } else if (surface) {
      scopeKey = BRAINSTORM_SURFACE_SCOPE[surface];
    }

    if (scopeKey && incomingNoteId) {
      return NextResponse.json(
        { error: "Cannot combine note and page scopes" },
        { status: 400 }
      );
    }

    // ── Rate limiting (admin client for cross-instance reliability) ───────────
    const admin = createAdminClient();
    const canAccessResearchPro = await hasPackageAccess(
      userId,
      "research_pro",
      admin
    );
    const canAccessResearch = await hasResearchAccess(userId, admin);
    let researchDocumentScope = scopeKey
      ? parseResearchDocumentScope(scopeKey)
      : null;

    if (!canAccessWinston) {
      const usedToday = await countChatExchangesOnLocalDay(
        userId,
        prefs?.timezone as string | null
      );
      if (usedToday >= WINSTON_FREE_DAILY_MESSAGE_CAP) {
        // Research surfaces have their own gates below; don't apply free chat cap.
        if (scopeKey !== "research" && !researchDocumentScope) {
          return NextResponse.json(
            {
              error:
                "That’s today’s free Winston messages. Upgrade to WISK AI for full conversations.",
              limitType: "daily",
            },
            { status: 429 }
          );
        }
      }
    } else {

    // Monthly token budget
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: usageRows } = await admin
      .from("ai_usage_log")
      .select("input_tokens, output_tokens")
      .eq("user_id", userId)
      .in("feature", [...WINSTON_USER_INITIATED_FEATURES])
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
    }

    // ── Resolve note / research-document scope (optional) ─────────────────────
    let noteId = incomingNoteId ?? null;
    let noteTitle = "";
    let notePlainText = "";
    let researchDocumentName = "";
    let researchDocumentText = "";

    if (incomingConversationId && !noteId && !scopeKey) {
      const { data: existingConv } = await supabase
        .from("ai_conversations")
        .select("id, note_id, scope_key")
        .eq("id", incomingConversationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingConv) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      noteId = existingConv.note_id ?? null;
      if (existingConv.scope_key && isWinstonScopeKey(existingConv.scope_key)) {
        scopeKey = existingConv.scope_key;
      }
    }

    researchDocumentScope = scopeKey
      ? parseResearchDocumentScope(scopeKey)
      : null;

    if (noteId) {
      const { data: note, error: noteError } = await supabase
        .from("notes")
        .select("id, title, content")
        .eq("id", noteId)
        .eq("user_id", userId)
        .maybeSingle();

      if (noteError || !note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      noteTitle = note.title ?? "";
      notePlainText = extractPlainTextFromNoteContent(note.content);
    }

    if (researchDocumentScope) {
      if (!canAccessResearch) {
        return NextResponse.json(
          { error: "Research access is required for document questions." },
          { status: 403 }
        );
      }

      const { data: researchDoc, error: researchDocError } = await supabase
        .from("research_documents")
        .select("id, name, extracted_text, status")
        .eq("id", researchDocumentScope.documentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (researchDocError || !researchDoc) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      if (
        researchDoc.status !== "ready" ||
        !String(researchDoc.extracted_text ?? "").trim()
      ) {
        return NextResponse.json(
          { error: "This document is not ready for questions yet." },
          { status: 400 }
        );
      }

      researchDocumentName = String(researchDoc.name ?? "Document");
      researchDocumentText = String(researchDoc.extracted_text ?? "");
    }

    if (
      !canAccessWinston &&
      (noteId ||
        (scopeKey !== "global" &&
          scopeKey !== "research" &&
          !researchDocumentScope))
    ) {
      return NextResponse.json(
        { error: "Winston access not enabled" },
        { status: 403 }
      );
    }

    if (scopeKey === "research" && !canAccessResearchPro) {
      return NextResponse.json(
        {
          error:
            "Open research chat needs WISK Research Pro. Upgrade to unlock cited research answers.",
        },
        { status: 403 }
      );
    }

    // ── Resolve or create conversation ────────────────────────────────────────
    let resolvedConversationId = incomingConversationId;

    if (resolvedConversationId) {
      const { data: owned } = await supabase
        .from("ai_conversations")
        .select("id, note_id, scope_key")
        .eq("id", resolvedConversationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!owned) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      if (noteId && owned.note_id && owned.note_id !== noteId) {
        return NextResponse.json(
          { error: "Conversation does not match this note" },
          { status: 400 }
        );
      }

      if (scopeKey) {
        if (owned.scope_key !== scopeKey) {
          return NextResponse.json(
            { error: "Conversation does not match this page scope" },
            { status: 400 }
          );
        }
      } else if (owned.scope_key) {
        // General Winston Chat must not resume a page-scoped brainstorm thread.
        return NextResponse.json(
          { error: "Conversation is scoped to another surface" },
          { status: 400 }
        );
      }
    } else if (noteId) {
      const { data: existingNoteConv } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("note_id", noteId)
        .maybeSingle();

      if (existingNoteConv?.id) {
        resolvedConversationId = existingNoteConv.id;
      } else {
        const title = noteTitle.trim()
          ? `${noteTitle.trim().slice(0, 60)} brainstorm`
          : "Note brainstorm";

        const { data: newConv, error: convError } = await supabase
          .from("ai_conversations")
          .insert({
            user_id: userId,
            title,
            note_id: noteId,
          })
          .select("id")
          .single();

        if (convError || !newConv?.id) {
          if (convError?.code === "23505") {
            const { data: raced } = await supabase
              .from("ai_conversations")
              .select("id")
              .eq("user_id", userId)
              .eq("note_id", noteId)
              .maybeSingle();
            if (raced?.id) {
              resolvedConversationId = raced.id;
            }
          }
          if (!resolvedConversationId) {
            console.error(
              "winston/chat: failed to create note conversation:",
              convError
            );
            return NextResponse.json(
              { error: "Failed to create conversation" },
              { status: 500 }
            );
          }
        } else {
          resolvedConversationId = newConv.id;
        }
      }
    } else if (scopeKey) {
      const { data: existingScoped } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("scope_key", scopeKey)
        .maybeSingle();

      if (existingScoped?.id) {
        resolvedConversationId = existingScoped.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("ai_conversations")
          .insert({
            user_id: userId,
            title: getScopeKeyTitle(scopeKey),
            scope_key: scopeKey,
          })
          .select("id")
          .single();

        if (convError || !newConv?.id) {
          if (convError?.code === "23505") {
            const { data: raced } = await supabase
              .from("ai_conversations")
              .select("id")
              .eq("user_id", userId)
              .eq("scope_key", scopeKey)
              .maybeSingle();
            if (raced?.id) {
              resolvedConversationId = raced.id;
            }
          }
          if (!resolvedConversationId) {
            console.error(
              "winston/chat: failed to create scoped conversation:",
              convError
            );
            return NextResponse.json(
              { error: "Failed to create conversation" },
              { status: 500 }
            );
          }
        } else {
          resolvedConversationId = newConv.id;
        }
      }
    } else {
      const { data: newConv, error: convError } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title: "New conversation" })
        .select("id")
        .single();

      if (convError || !newConv?.id) {
        console.error("winston/chat: failed to create conversation:", convError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }
      resolvedConversationId = newConv.id;
    }

    if (!resolvedConversationId) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    const activeConversationId = resolvedConversationId;

    // ── Count existing messages (to detect first message) ────────────────────
    const { count: existingCount } = await supabase
      .from("ai_conversation_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", activeConversationId);

    const isFirstMessage = (existingCount ?? 0) === 0;

    // ── Fetch last 20 messages for this conversation ──────────────────────────
    const { data: history } = await supabase
      .from("ai_conversation_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    const historyMessages: StoredMessage[] = (
      (history ?? []) as StoredMessage[]
    ).reverse();

    // ── Store user message (before Anthropic — survives client disconnect) ────
    const { error: userPersistError } = await supabase
      .from("ai_conversation_messages")
      .insert({
        user_id: userId,
        role: "user",
        content: message,
        conversation_id: activeConversationId,
      });

    if (userPersistError) {
      console.error("winston/chat: failed to persist user message:", userPersistError);
      return NextResponse.json(
        { error: "Could not save your message. Please try again." },
        { status: 500 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    // Research Pro open chat: tool-routed Tavily/Exa answer with citation drop discipline.
    if (scopeKey === "research") {
      const conversationContext = historyMessages
        .slice(-6)
        .map((entry) => `${entry.role}: ${entry.content}`)
        .join("\n");

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: StreamEvent) => {
            try {
              controller.enqueue(encodeSse(event));
            } catch {
              // Client gone — keep persisting.
            }
          };

          try {
            send({ type: "meta", conversationId: activeConversationId });

            const researchAnswer = await answerOpenResearchQuestion({
              userId,
              question: message,
              conversationContext,
            });

            send({ type: "delta", text: researchAnswer.displayMessage });

            const { error: assistantPersistError } = await supabase
              .from("ai_conversation_messages")
              .insert({
                user_id: userId,
                role: "assistant",
                content: researchAnswer.displayMessage,
                conversation_id: activeConversationId,
              });

            if (assistantPersistError) {
              console.error(
                "winston/chat: failed to persist research reply:",
                assistantPersistError
              );
              send({
                type: "error",
                error: "Could not save Winston's reply. Please try again.",
              });
              controller.close();
              return;
            }

            if (isFirstMessage) {
              const generatedTitle = await generateConversationTitle(
                apiKey,
                message
              );
              if (generatedTitle) {
                await supabase
                  .from("ai_conversations")
                  .update({ title: generatedTitle })
                  .eq("id", activeConversationId)
                  .eq("user_id", userId);
                send({ type: "title", generatedTitle });
              }
            }

            send({
              type: "done",
              conversationId: activeConversationId,
              usedTokens: 0,
            });
            controller.close();
          } catch (error) {
            console.error("winston/chat research:", error);
            send({
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Could not complete this research answer.",
            });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const chatSystemPrompt = researchDocumentScope
      ? RESEARCH_DOCUMENT_SYSTEM_PROMPT
      : systemPromptForScope(scopeKey, Boolean(noteId));

    // Note / research-document chats stay grounded in that source only — no business digest.
    const system = noteId
      ? cachedSystemParts([
          { text: chatSystemPrompt },
          {
            text: formatNoteContext(noteTitle, notePlainText),
            cache: true,
            ttl: "5m",
          },
        ])
      : researchDocumentScope
        ? cachedSystemParts([
            { text: chatSystemPrompt },
            {
              text: formatResearchDocumentContext(
                researchDocumentName,
                researchDocumentText
              ),
              cache: true,
              ttl: "5m",
            },
          ])
        : cachedSystemParts([
            { text: chatSystemPrompt },
            {
              text: `Here is the user's current business context:\n${formatBusinessContext(
                await getCachedContext(userId, supabase)
              )}`,
              cache: true,
              ttl: "1h",
            },
          ]);

    const claudeMessages = [
      ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Client disconnect must not block DB persistence of the completed reply.
        const send = (event: StreamEvent) => {
          try {
            controller.enqueue(encodeSse(event));
          } catch {
            // Client gone — keep reading Anthropic and writing to the DB.
          }
        };

        try {
          send({ type: "meta", conversationId: activeConversationId });

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
                model: canAccessWinston
                  ? WINSTON_PAID_CHAT_MODEL
                  : WINSTON_FREE_CHAT_MODEL,
                max_tokens: 1024,
                stream: true,
                system,
                messages: claudeMessages,
              }),
              signal: AbortSignal.timeout(ANTHROPIC_STREAM_TIMEOUT_MS),
            }
          );

          if (!claudeResponse.ok || !claudeResponse.body) {
            const err = await claudeResponse.text().catch(() => "");
            console.error("winston/chat: Claude API error:", err);
            send({
              type: "error",
              error: `Claude API error: ${claudeResponse.status}`,
            });
            controller.close();
            return;
          }

          const reader = claudeResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let reply = "";
          let inputTokens = 0;
          let outputTokens = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;

              let event: {
                type?: string;
                delta?: { type?: string; text?: string };
                message?: {
                  usage?: {
                    input_tokens?: number;
                    cache_read_input_tokens?: number;
                    cache_creation_input_tokens?: number;
                  };
                };
                usage?: { output_tokens?: number };
              };

              try {
                event = JSON.parse(payload) as typeof event;
              } catch {
                continue;
              }

              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                event.delta.text
              ) {
                reply += event.delta.text;
                send({ type: "delta", text: event.delta.text });
              }

              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens ?? 0;
              }

              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens ?? outputTokens;
              }
            }
          }

          if (!reply.trim()) {
            send({ type: "error", error: "No text content in Claude response" });
            controller.close();
            return;
          }

          // Persist assistant reply on the server before (and regardless of) client delivery.
          const { error: assistantPersistError } = await supabase
            .from("ai_conversation_messages")
            .insert({
              user_id: userId,
              role: "assistant",
              content: reply,
              conversation_id: activeConversationId,
            });

          if (assistantPersistError) {
            console.error(
              "winston/chat: failed to persist assistant message:",
              assistantPersistError
            );
            send({
              type: "error",
              error: "Could not save Winston's reply. Please try again.",
            });
            controller.close();
            return;
          }

          await logUsage(
            userId,
            researchDocumentScope
              ? "research_document_analysis"
              : "chat",
            inputTokens,
            outputTokens
          );

          send({
            type: "done",
            conversationId: activeConversationId,
            usedTokens: inputTokens + outputTokens,
          });

          if (isFirstMessage && !scopeKey && !noteId) {
            try {
              const generatedTitle = await generateConversationTitle(
                apiKey,
                message
              );
              if (generatedTitle) {
                await supabase
                  .from("ai_conversations")
                  .update({ title: generatedTitle })
                  .eq("id", activeConversationId)
                  .eq("user_id", userId);
                send({ type: "title", generatedTitle });
              }
            } catch (titleErr) {
              console.warn(
                "winston/chat: title generation failed (non-fatal):",
                titleErr
              );
            }
          }
        } catch (error) {
          console.error("winston/chat stream error:", error);
          Sentry.captureException(error);
          send({
            type: "error",
            error:
              error instanceof Error
                ? error.name === "TimeoutError" || error.name === "AbortError"
                  ? "Winston took too long to respond. Please try again."
                  : error.message
                : "An unexpected error occurred",
          });
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
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
