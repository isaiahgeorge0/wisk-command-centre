"use client";

import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatMessageTimestamp } from "@/lib/properties/format";
import type { TenantMessage } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type MessageThreadProps = {
  messages: TenantMessage[];
  currentSenderId: string;
  onSend: (message: string) => Promise<void>;
  header?: React.ReactNode;
  className?: string;
};

export function MessageThread({
  messages,
  currentSenderId,
  onSend,
  header,
  className,
}: MessageThreadProps) {
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      await onSend(text);
      setDraft("");
      textareaRef.current?.focus();
    });
  }, [draft, isPending, onSend]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {header ? (
        <div className="shrink-0 border-b border-border/60 px-4 py-3">
          {header}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.map((message) => {
            const isOwn = message.sender_id === currentSenderId;
            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col",
                  isOwn ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isOwn
                      ? "bg-amber-500 text-white"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.message}
                </div>
                <span className="mt-1 px-1 text-xs text-muted-foreground">
                  {formatMessageTimestamp(message.created_at)}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card/80 p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            rows={2}
            disabled={isPending}
            className="min-h-11 resize-none"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={isPending || !draft.trim()}
            className="min-h-11 shrink-0 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
