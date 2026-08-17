/**
 * Shared SSE consumer for POST /api/winston/chat.
 * Used by the full chat page and note-scoped brainstorm panel.
 */

export type WinstonChatLimitType = "monthly" | "short_term" | "daily";

export type WinstonChatStreamHandlers = {
  onMeta?: (conversationId: string) => void;
  onDelta?: (text: string) => void;
  onDone?: (payload: {
    conversationId: string;
    usedTokens: number;
  }) => void;
  onTitle?: (generatedTitle: string) => void;
  onError?: (error: string, limitType?: WinstonChatLimitType) => void;
};

type StreamEvent = {
  type?: string;
  conversationId?: string;
  text?: string;
  usedTokens?: number;
  generatedTitle?: string;
  error?: string;
  limitType?: WinstonChatLimitType;
};

export async function consumeWinstonChatSse(
  body: ReadableStream<Uint8Array>,
  handlers: WinstonChatStreamHandlers
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;

      let event: StreamEvent;
      const payload = line.slice(5).trim();
      try {
        event = JSON.parse(payload) as StreamEvent;
      } catch (error) {
        console.error("consumeWinstonChatSse: malformed SSE chunk", {
          preview: payload.slice(0, 200),
          error,
        });
        continue;
      }

      if (event.type === "meta" && event.conversationId) {
        handlers.onMeta?.(event.conversationId);
        continue;
      }

      if (event.type === "delta" && event.text) {
        handlers.onDelta?.(event.text);
        continue;
      }

      if (event.type === "done" && event.conversationId) {
        handlers.onDone?.({
          conversationId: event.conversationId,
          usedTokens: event.usedTokens ?? 0,
        });
        continue;
      }

      if (event.type === "title" && event.generatedTitle) {
        handlers.onTitle?.(event.generatedTitle);
        continue;
      }

      if (event.type === "error") {
        handlers.onError?.(
          event.error ?? "Something went wrong. Please try again.",
          event.limitType
        );
      }
    }
  }
}
