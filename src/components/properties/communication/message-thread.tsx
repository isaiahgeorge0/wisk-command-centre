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
  typingUserName?: string;
  onTypingChange?: (isTyping: boolean) => void;
  isOtherPartyTyping?: boolean;
};

export function MessageThread({
  messages,
  currentSenderId,
  onSend,
  header,
  className,
  typingUserName,
  onTypingChange,
  isOtherPartyTyping = false,
}: MessageThreadProps) {
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevLengthRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const behavior =
      prevLengthRef.current === 0 ? ("instant" as ScrollBehavior) : "smooth";
    prevLengthRef.current = messages.length;
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const scheduleTypingStop = () => {
    clearTypingTimeout();
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange?.(false);
    }, 4000);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (value.trim()) {
      onTypingChange?.(true);
      scheduleTypingStop();
    } else {
      clearTypingTimeout();
      onTypingChange?.(false);
    }
  };

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      await onSend(text);
      setDraft("");
      clearTypingTimeout();
      onTypingChange?.(false);
      textareaRef.current?.focus();
    });
  }, [draft, isPending, onSend, onTypingChange]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {header ? (
        <div className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-sm">
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
          {isOtherPartyTyping ? (
            <div className="flex items-start">
              <div
                className="rounded-2xl bg-muted px-4 py-2.5"
                aria-label={
                  typingUserName ? `${typingUserName} is typing` : "Typing"
                }
              >
                <div className="flex h-4 items-center gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card/80 p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
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
